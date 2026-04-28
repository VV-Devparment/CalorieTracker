using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using CalorieTracker.Server.DTOs;

namespace CalorieTracker.Server.Services
{
    /// <summary>
    /// Інтеграція з FatSecret Platform API (REST OAuth 2.0) — Premier scope.
    ///
    /// Auth: client_credentials → Bearer token (TTL 24 год, кешуємо у пам'яті).
    /// Scope: "premier barcode" — premier розблоковує foods.search.v3 (region/language)
    ///   та структуровані servings; barcode — окремий scope для food.find_id_for_barcode.
    ///
    /// Search: foods.search.v3 з region=UA, language=uk → українські локальні бренди
    ///   (Молокія, Чумак, Рошен тощо), яких немає у глобальному foods.search.
    ///   Якщо UA нічого не дає — фолбек на International (region не передаємо).
    ///   Відповідь має структурований servings[] масив, тому регекс-парсер
    ///   `food_description` більше не потрібен.
    ///
    /// Barcode: food.find_id_for_barcode (потребує GTIN-13, паддимо нулями зліва) →
    ///   food.get.v4 для повних даних.
    ///
    /// Усі помилки тут лише логуються. Викликач (контролер) очікує безпечні відповіді
    /// (порожній список / null), щоб одна провалена відповідь FatSecret не валила весь UX.
    /// </summary>
    public class ExternalFoodService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ExternalFoodService> _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;

        private const string AuthClientName = "FatSecretAuth";
        private const string ApiClientName = "FatSecretApi";
        private const string TokenCacheKey = "fatsecret:token";
        private const string SearchCachePrefix = "fatsecret:search:";
        private const string BarcodeCachePrefix = "fatsecret:barcode:";
        private const string OAuthScope = "premier barcode";

        private static readonly TimeSpan SearchCacheTtl = TimeSpan.FromMinutes(10);
        private static readonly TimeSpan BarcodeCacheTtl = TimeSpan.FromHours(1);
        private static readonly TimeSpan TokenSafetyMargin = TimeSpan.FromMinutes(5);

        public ExternalFoodService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            IConfiguration configuration,
            ILogger<ExternalFoodService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;

            _clientId = (configuration["FatSecret:ClientId"] ?? "").Trim();
            _clientSecret = (configuration["FatSecret:ClientSecret"] ?? "").Trim();

            if (string.IsNullOrWhiteSpace(_clientId) || string.IsNullOrWhiteSpace(_clientSecret))
            {
                _logger.LogWarning(
                    "FatSecret credentials are not configured. " +
                    "Set FatSecret:ClientId and FatSecret:ClientSecret in appsettings or env vars.");
            }
        }

        // ───── Public API ─────────────────────────────────────────────────────

        /// <summary>
        /// Пошук за назвою через foods.search.v3.
        ///
        /// Тариф: Premier Free → US data set. Параметр region=UA не дає результатів
        /// (UA-маркет потребує платної Premier-підписки), тому ми його не передаємо.
        /// Лишаємо тільки language=uk — це додає українські підписи для тих
        /// generic-продуктів, де FatSecret має переклади (наприклад «Milk» → «Молоко»).
        ///
        /// TODO: коли акаунт буде апгрейднуто до paid Premier з UA-доступом,
        /// додати другий виклик з region="UA" перед цим (UA → fallback на International).
        /// </summary>
        public async Task<List<ExternalFoodDto>> SearchByNameAsync(string query, string source = "ukraine")
        {
            var trimmed = query?.Trim() ?? "";
            if (trimmed.Length == 0) return new List<ExternalFoodDto>();
            if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
                return new List<ExternalFoodDto>();

            var cacheKey = SearchCachePrefix + trimmed.ToLowerInvariant();
            if (_cache.TryGetValue(cacheKey, out List<ExternalFoodDto>? cached) && cached != null)
                return cached;

            try
            {
                var results = await SearchV3Async(trimmed, region: null, language: "uk");
                if (results.Count > 0)
                    _cache.Set(cacheKey, results, SearchCacheTtl);
                return results;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    "FatSecret search failed for '{Query}': {Type} {Message}",
                    trimmed, ex.GetType().Name, ex.Message);
                return new List<ExternalFoodDto>();
            }
        }

        public async Task<ExternalFoodDto?> SearchByBarcodeAsync(string barcode)
        {
            var sanitized = SanitizeBarcode(barcode);
            if (sanitized == null) return null;
            if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret)) return null;

            var cacheKey = BarcodeCachePrefix + sanitized;
            if (_cache.TryGetValue(cacheKey, out ExternalFoodDto? cached) && cached != null)
                return cached;

            try
            {
                // GTIN-13 — паддимо нулями зліва (UPC-A 12 → 0XXXXXXXXXXXX).
                var gtin13 = sanitized.PadLeft(13, '0');

                var idJson = await CallApiAsync(new Dictionary<string, string>
                {
                    ["method"] = "food.find_id_for_barcode",
                    ["format"] = "json",
                    ["barcode"] = gtin13,
                });

                var foodId = ExtractBarcodeFoodId(idJson);
                if (foodId == null || foodId == "0") return null;

                var foodJson = await CallApiAsync(new Dictionary<string, string>
                {
                    ["method"] = "food.get.v4",
                    ["format"] = "json",
                    ["food_id"] = foodId,
                });

                var dto = ParseFoodGetV4(foodJson);
                if (dto != null)
                {
                    dto.Barcode = sanitized;
                    _cache.Set(cacheKey, dto, BarcodeCacheTtl);
                }
                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    "FatSecret barcode lookup failed for {Barcode}: {Type} {Message}",
                    sanitized, ex.GetType().Name, ex.Message);
                return null;
            }
        }

        // ───── Search v3 ──────────────────────────────────────────────────────

        private async Task<List<ExternalFoodDto>> SearchV3Async(string query, string? region, string? language)
        {
            var p = new Dictionary<string, string>
            {
                ["method"] = "foods.search.v3",
                ["format"] = "json",
                ["search_expression"] = query,
                ["max_results"] = "20",
                // include_sub_categories додає category info; include_food_images зайве для нашого UI
                ["include_sub_categories"] = "true",
            };
            if (!string.IsNullOrEmpty(region)) p["region"] = region!;
            if (!string.IsNullOrEmpty(language)) p["language"] = language!;

            var json = await CallApiAsync(p);
            return ParseFoodsSearchV3(json);
        }

        // ───── HTTP plumbing ──────────────────────────────────────────────────

        /// <summary>
        /// GET /rest/server.api з Bearer-токеном.
        /// На 401 один раз інвалідуємо токен у кеші й ретраїмо (типово для ротації).
        /// </summary>
        private async Task<string> CallApiAsync(Dictionary<string, string> queryParams)
        {
            const int maxAttempts = 2;

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var token = await GetAccessTokenAsync();
                var url = "rest/server.api?" + BuildQueryString(queryParams);

                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var client = _httpClientFactory.CreateClient(ApiClientName);
                using var response = await client.SendAsync(request);

                if (response.StatusCode == HttpStatusCode.Unauthorized && attempt < maxAttempts)
                {
                    _logger.LogInformation("FatSecret 401 — invalidating token cache and retrying");
                    _cache.Remove(TokenCacheKey);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var body = await SafeReadBodyAsync(response);
                    _logger.LogWarning(
                        "FatSecret API HTTP {Status} for method '{Method}': {Body}",
                        (int)response.StatusCode,
                        queryParams.GetValueOrDefault("method", "?"),
                        body);
                    response.EnsureSuccessStatusCode();
                }

                return await response.Content.ReadAsStringAsync();
            }

            throw new HttpRequestException("FatSecret API: retries exhausted");
        }

        private async Task<string> GetAccessTokenAsync()
        {
            if (_cache.TryGetValue(TokenCacheKey, out string? cached) && !string.IsNullOrEmpty(cached))
                return cached!;

            var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));

            using var request = new HttpRequestMessage(HttpMethod.Post, "connect/token")
            {
                Content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("grant_type", "client_credentials"),
                    new KeyValuePair<string, string>("scope", OAuthScope),
                })
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);

            var client = _httpClientFactory.CreateClient(AuthClientName);
            using var response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await SafeReadBodyAsync(response);
                _logger.LogError(
                    "FatSecret OAuth token request failed: HTTP {Status}. Scope='{Scope}'. Body: {Body}",
                    (int)response.StatusCode, OAuthScope, body);

                // 403 = майже завжди IP не у whitelist у FatSecret dashboard.
                // 400 invalid_scope = акаунт ще не Premier (scope недоступний).
                var hint = response.StatusCode == HttpStatusCode.Forbidden
                    ? " (HTTP 403 — імовірно, IP сервера не доданий у whitelist у FatSecret dashboard)"
                    : "";
                throw new HttpRequestException(
                    $"FatSecret OAuth token request failed: HTTP {(int)response.StatusCode}{hint}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var accessToken = root.GetProperty("access_token").GetString();
            if (string.IsNullOrWhiteSpace(accessToken))
                throw new InvalidOperationException("FatSecret returned empty access_token");

            var expiresIn = root.TryGetProperty("expires_in", out var expEl)
                ? expEl.GetInt32() : 86400;

            // Кеш зберігаємо з запасом, щоб не використати майже-протермінований токен.
            var ttl = TimeSpan.FromSeconds(expiresIn) - TokenSafetyMargin;
            if (ttl < TimeSpan.FromMinutes(1)) ttl = TimeSpan.FromMinutes(1);
            _cache.Set(TokenCacheKey, accessToken, ttl);

            return accessToken!;
        }

        private static string BuildQueryString(Dictionary<string, string> kv) =>
            string.Join("&", kv.Select(p =>
                $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));

        private static async Task<string> SafeReadBodyAsync(HttpResponseMessage response)
        {
            try { return await response.Content.ReadAsStringAsync(); }
            catch { return ""; }
        }

        // ───── Response parsing ───────────────────────────────────────────────

        /// <summary>
        /// Парсить foods.search.v3 → { foods_search: { results: { food: [...] } } }.
        /// Кожен food має servings.serving[] зі структурованими полями замість опису-рядка.
        /// </summary>
        private List<ExternalFoodDto> ParseFoodsSearchV3(string json)
        {
            var result = new List<ExternalFoodDto>();
            JsonDocument doc;
            try { doc = JsonDocument.Parse(json); }
            catch (JsonException ex)
            {
                _logger.LogWarning("FatSecret returned non-JSON body: {Message}", ex.Message);
                return result;
            }

            using (doc)
            {
                var root = doc.RootElement;
                if (TryReadError(root, out var errCode, out var errMsg))
                {
                    _logger.LogWarning("FatSecret foods.search.v3 error code={Code}: {Message}", errCode, errMsg);
                    return result;
                }

                // v3 wrap: foods_search.results.food
                if (!root.TryGetProperty("foods_search", out var fs)) return result;
                if (!fs.TryGetProperty("results", out var results)) return result;
                if (!results.TryGetProperty("food", out var foodEl)) return result;

                EnumerateFoodArray(foodEl, f =>
                {
                    var dto = ParseFoodWithServings(f);
                    if (dto != null) result.Add(dto);
                });
            }

            return result;
        }

        /// <summary>
        /// Парсить food.get.v4 → { food: { ..., servings: { serving: [...] } } }.
        /// </summary>
        private ExternalFoodDto? ParseFoodGetV4(string json)
        {
            JsonDocument doc;
            try { doc = JsonDocument.Parse(json); }
            catch (JsonException ex)
            {
                _logger.LogWarning("FatSecret returned non-JSON body: {Message}", ex.Message);
                return null;
            }

            using (doc)
            {
                var root = doc.RootElement;
                if (TryReadError(root, out var errCode, out var errMsg))
                {
                    _logger.LogWarning("FatSecret food.get.v4 error code={Code}: {Message}", errCode, errMsg);
                    return null;
                }

                if (!root.TryGetProperty("food", out var foodEl)) return null;
                return ParseFoodWithServings(foodEl);
            }
        }

        /// <summary>
        /// Спільний парсер для food-обʼєкта з v3/v4. Шукає 100g serving (або довільний грамовий
        /// і нормалізує до 100g). Якщо грамових немає — повертає null.
        /// </summary>
        private ExternalFoodDto? ParseFoodWithServings(JsonElement food)
        {
            try
            {
                var foodId = GetString(food, "food_id");
                var name = GetString(food, "food_name");
                if (string.IsNullOrWhiteSpace(foodId) || string.IsNullOrWhiteSpace(name))
                    return null;

                if (!food.TryGetProperty("servings", out var servingsEl)) return null;
                if (!servingsEl.TryGetProperty("serving", out var servingArr)) return null;

                JsonElement? best = PickBestGramServing(servingArr);
                if (best == null) return null;

                var s = best.Value;
                var grams = ParseDouble(GetString(s, "metric_serving_amount"));
                var unit = (GetString(s, "metric_serving_unit") ?? "").ToLowerInvariant();
                if (grams <= 0 || unit != "g") return null;

                var scale = 100.0 / grams;

                return new ExternalFoodDto
                {
                    ExternalId = foodId!,
                    Source = "FatSecret",
                    Name = name!,
                    Brand = GetString(food, "brand_name"),
                    Barcode = null,
                    CaloriesPer100g = SafeDecimal(ParseDouble(GetString(s, "calories")) * scale),
                    ProteinPer100g  = SafeDecimal(ParseDouble(GetString(s, "protein")) * scale),
                    FatsPer100g     = SafeDecimal(ParseDouble(GetString(s, "fat")) * scale),
                    CarbsPer100g    = SafeDecimal(ParseDouble(GetString(s, "carbohydrate")) * scale),
                    FiberPer100g    = SafeDecimal(ParseDouble(GetString(s, "fiber")) * scale),
                    SugarPer100g    = SafeDecimal(ParseDouble(GetString(s, "sugar")) * scale),
                    SodiumPer100g   = SafeDecimal(ParseDouble(GetString(s, "sodium")) * scale),
                    Category = GetString(food, "food_sub_categories") ?? GetString(food, "food_type"),
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Skipping FatSecret food entry: {Message}", ex.Message);
                return null;
            }
        }

        /// <summary>
        /// Пріоритет: точно 100g → інший grams (нормалізуємо). Інші unit
        /// (oz, cup, tbsp...) пропускаємо — без food.get не маємо грамового еквіваленту.
        /// </summary>
        private static JsonElement? PickBestGramServing(JsonElement servingArr)
        {
            JsonElement? hundred = null;
            JsonElement? anyGram = null;

            void Visit(JsonElement s)
            {
                var unit = (GetString(s, "metric_serving_unit") ?? "").ToLowerInvariant();
                if (unit != "g") return;

                var grams = ParseDouble(GetString(s, "metric_serving_amount"));
                if (grams <= 0) return;

                if (Math.Abs(grams - 100.0) < 0.01)
                {
                    hundred ??= s;
                }
                else
                {
                    anyGram ??= s;
                }
            }

            if (servingArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var s in servingArr.EnumerateArray())
                {
                    Visit(s);
                    if (hundred != null) break;
                }
            }
            else if (servingArr.ValueKind == JsonValueKind.Object)
            {
                Visit(servingArr);
            }

            return hundred ?? anyGram;
        }

        private static string? ExtractBarcodeFoodId(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (!root.TryGetProperty("food_id", out var idEl)) return null;

                // Може бути { "food_id": { "value": "12345" } } або { "food_id": "12345" }.
                if (idEl.ValueKind == JsonValueKind.Object && idEl.TryGetProperty("value", out var valEl))
                    return valEl.GetString();
                if (idEl.ValueKind == JsonValueKind.String)
                    return idEl.GetString();
                return null;
            }
            catch
            {
                return null;
            }
        }

        // FatSecret квірк: масив з 1 елементом може приходити як обʼєкт, а не масив.
        private static void EnumerateFoodArray(JsonElement foodEl, Action<JsonElement> visit)
        {
            if (foodEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var f in foodEl.EnumerateArray()) visit(f);
            }
            else if (foodEl.ValueKind == JsonValueKind.Object)
            {
                visit(foodEl);
            }
        }

        private static bool TryReadError(JsonElement root, out string code, out string? message)
        {
            code = "?";
            message = null;
            if (!root.TryGetProperty("error", out var err)) return false;
            if (err.TryGetProperty("code", out var c)) code = c.ToString();
            if (err.TryGetProperty("message", out var m)) message = m.GetString();
            return true;
        }

        // ───── Helpers ────────────────────────────────────────────────────────

        /// <summary>Лишаємо тільки цифри; повертаємо null, якщо лишилось менше 6 або більше 14 символів.</summary>
        private static string? SanitizeBarcode(string? barcode)
        {
            if (string.IsNullOrWhiteSpace(barcode)) return null;
            var digits = new string(barcode.Where(char.IsDigit).ToArray());
            if (digits.Length < 6 || digits.Length > 14) return null;
            return digits;
        }

        // FatSecret часом повертає числові поля як рядки, часом як числа — обробляємо обидва.
        private static string? GetString(JsonElement obj, string prop)
        {
            if (!obj.TryGetProperty(prop, out var el)) return null;
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Number => el.GetRawText(),
                _ => null,
            };
        }

        private static double ParseDouble(string? s) =>
            !string.IsNullOrWhiteSpace(s) &&
            double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : 0;

        private static decimal SafeDecimal(double v)
        {
            if (double.IsNaN(v) || double.IsInfinity(v) || v < 0) return 0m;
            return Math.Round((decimal)v, 2);
        }
    }
}
