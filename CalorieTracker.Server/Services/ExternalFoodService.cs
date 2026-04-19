using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using CalorieTracker.Server.DTOs;

namespace CalorieTracker.Server.Services
{
    public class ExternalFoodService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ExternalFoodService> _logger;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private static readonly TimeSpan PerRequestTimeout = TimeSpan.FromSeconds(8);

        private static readonly HashSet<string> BlockedCountries = new()
        {
            "en:russia", "en:belarus"
        };

        public ExternalFoodService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            ILogger<ExternalFoodService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
        }

        public async Task<List<ExternalFoodDto>> SearchByNameAsync(string query, string source = "ukraine")
        {
            return await SearchOffAsync(query);
        }

        public async Task<ExternalFoodDto?> SearchByBarcodeAsync(string barcode)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFacts");
                var url = $"api/v2/product/{Uri.EscapeDataString(barcode)}.json" +
                          $"?lc=uk&fields=product_name,product_name_uk,product_name_en,brands,nutriments,code,lang";

                using var cts = new CancellationTokenSource(PerRequestTimeout);
                var response = await client.GetAsync(url, cts.Token);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync(cts.Token);
                var data = JsonSerializer.Deserialize<OffBarcodeResponse>(content, JsonOpts);

                if (data?.Status != 1 || data.Product?.Nutriments == null) return null;

                var p = data.Product;
                p.Code = barcode;
                return TryMapToDto(p, preferUkrainian: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OFF barcode lookup failed for {Barcode}", barcode);
                return null;
            }
        }

        private async Task<List<ExternalFoodDto>> SearchOffAsync(string query)
        {
            var trimmed = query.Trim();
            if (trimmed.Length == 0) return new List<ExternalFoodDto>();

            var isCyrillic = ContainsCyrillic(trimmed);
            var cacheKey = $"off:v3:{(isCyrillic ? "uk" : "en")}:{trimmed.ToLowerInvariant()}";

            if (_cache.TryGetValue(cacheKey, out List<ExternalFoodDto>? cached))
                return cached!;

            // Пробуємо обидва API паралельно — це дає кращу latency + надійність.
            // Якщо один API впаде/таймаутне, результати з іншого все одно прийдуть.
            var legacyTask = TrySearchLegacyAsync(trimmed, isCyrillic);
            var newTask = TrySearchNewAsync(trimmed, isCyrillic);

            await Task.WhenAll(legacyTask, newTask);

            var legacy = legacyTask.Result;
            var modern = newTask.Result;

            // Обидва null = обидва API впали з помилкою (не "порожньо", а саме помилка).
            if (legacy == null && modern == null)
            {
                _logger.LogError("Both OFF APIs failed for query '{Query}'", trimmed);
                throw new HttpRequestException("Open Food Facts наразі недоступний. Спробуйте через кілька секунд.");
            }

            // Зливаємо результати, дедуплікуючи за barcode
            var merged = new List<OffProduct>();
            var seenCodes = new HashSet<string>();
            foreach (var p in (legacy ?? new List<OffProduct>()).Concat(modern ?? new List<OffProduct>()))
            {
                var key = !string.IsNullOrWhiteSpace(p.Code) ? p.Code! : Guid.NewGuid().ToString();
                if (seenCodes.Add(key)) merged.Add(p);
            }

            var mapped = RankAndMap(merged, trimmed, isCyrillic);

            if (mapped.Count > 0)
                _cache.Set(cacheKey, mapped, TimeSpan.FromMinutes(10));

            return mapped;
        }

        /// <summary>
        /// Legacy API: world.openfoodfacts.org/cgi/search.pl
        /// Повертає null — API впав з помилкою. Повертає [] — запитів немає.
        /// </summary>
        private async Task<List<OffProduct>?> TrySearchLegacyAsync(string query, bool isCyrillic)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFacts");
                var lc = isCyrillic ? "uk" : "en";
                var cc = isCyrillic ? "ua" : "world";

                var url = $"cgi/search.pl?action=process" +
                          $"&search_terms={Uri.EscapeDataString(query)}" +
                          $"&search_simple=1&json=1&page_size=30" +
                          $"&lc={lc}&cc={cc}" +
                          $"&fields=product_name,product_name_uk,product_name_en,product_name_ru," +
                          $"brands,nutriments,code,countries_tags,lang";

                using var cts = new CancellationTokenSource(PerRequestTimeout);
                var response = await client.GetAsync(url, cts.Token);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("OFF legacy returned {Status} for '{Query}'", response.StatusCode, query);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cts.Token);
                var data = JsonSerializer.Deserialize<OffSearchResponse>(content, JsonOpts);
                return data?.Products ?? new List<OffProduct>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OFF legacy search failed for '{Query}'", query);
                return null;
            }
        }

        /// <summary>
        /// Modern Search-a-licious API: search.openfoodfacts.org
        /// </summary>
        private async Task<List<OffProduct>?> TrySearchNewAsync(string query, bool isCyrillic)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFactsSearch");
                var langs = isCyrillic ? "uk,en" : "en";

                var url = $"search?q={Uri.EscapeDataString(query)}" +
                          $"&page_size=30&langs={langs}" +
                          $"&fields=product_name,product_name_uk,product_name_en,brands,nutriments,code,countries_tags,lang";

                using var cts = new CancellationTokenSource(PerRequestTimeout);
                var response = await client.GetAsync(url, cts.Token);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("OFF modern returned {Status} for '{Query}'", response.StatusCode, query);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cts.Token);
                var data = JsonSerializer.Deserialize<OffNewSearchResponse>(content, JsonOpts);
                return data?.Hits ?? new List<OffProduct>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OFF modern search failed for '{Query}'", query);
                return null;
            }
        }

        /// <summary>
        /// Фільтрує продукти за релевантністю та сортує найрелевантніші першими.
        /// Це найважливіше виправлення — раніше OFF повертав продукти, де запит
        /// матчився в ingredients/categories, а назва була зовсім іншою.
        /// </summary>
        private static List<ExternalFoodDto> RankAndMap(List<OffProduct> products, string query, bool preferUkrainian)
        {
            var queryTokens = Tokenize(query);
            var scored = new List<(ExternalFoodDto dto, int score)>();

            foreach (var p in products)
            {
                if (p.Nutriments == null) continue;
                if (IsBlockedByCountry(p)) continue;

                var displayName = GetBestName(p, preferUkrainian);
                if (string.IsNullOrWhiteSpace(displayName)) continue;

                // Перевірка релевантності: токени запиту мають зустрічатись
                // хоча б в одному з мовних полів назви або в бренді.
                // Інакше OFF повертає продукти, що матчились за інгредієнтами —
                // а користувач шукав конкретну страву.
                var relevance = ComputeRelevance(p, displayName, queryTokens);
                if (relevance == 0) continue;

                var dto = TryMapToDto(p, preferUkrainian);
                if (dto == null) continue;

                // Бонус: якщо запит укр. і у продукта є укр. назва — піднімаємо в ранзі
                var score = relevance * 10;
                if (preferUkrainian && !string.IsNullOrWhiteSpace(p.ProductNameUk))
                    score += 5;

                scored.Add((dto, score));
            }

            return scored
                .OrderByDescending(x => x.score)
                .Select(x => x.dto)
                .Take(20)
                .ToList();
        }

        private static HashSet<string> Tokenize(string query)
        {
            return query.ToLowerInvariant()
                .Split(new[] { ' ', '\t', ',', '.', '-', '_', '/', '\\', '(', ')' },
                       StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length >= 2)
                .ToHashSet();
        }

        private static int ComputeRelevance(OffProduct p, string chosenName, HashSet<string> queryTokens)
        {
            if (queryTokens.Count == 0) return 1;

            // Перевіряємо запит проти ВСІХ мовних варіантів назви + бренду.
            // Тоді українські токени знайдуться в product_name_uk, англійські — в product_name_en,
            // а на дисплей ми все одно покажемо назву, що відповідає мові користувача.
            var haystack = string.Join(" ", new[]
            {
                chosenName,
                p.ProductName,
                p.ProductNameUk,
                p.ProductNameEn,
                p.ProductNameRu,
                p.Brands
            }.Where(s => !string.IsNullOrWhiteSpace(s))).ToLowerInvariant();

            int score = 0;
            foreach (var token in queryTokens)
            {
                if (haystack.Contains(token)) score++;
            }
            return score;
        }

        private static bool IsBlockedByCountry(OffProduct p)
        {
            if (p.CountriesTags == null) return false;
            return p.CountriesTags.Any(t => BlockedCountries.Contains(t.ToLowerInvariant()));
        }

        /// <summary>
        /// Обирає найкращу назву для відображення користувачу.
        /// UA-користувач: uk → en (без кирилиці) → default (якщо не рос.)
        /// EN-користувач: en (без кирилиці) → default (без кирилиці)
        /// </summary>
        private static string? GetBestName(OffProduct p, bool preferUkrainian)
        {
            if (preferUkrainian)
            {
                if (IsReadableUkrainian(p.ProductNameUk)) return p.ProductNameUk;
                if (IsReadableLatin(p.ProductNameEn)) return p.ProductNameEn;
                if (IsReadableUkrainian(p.ProductName)) return p.ProductName;
                if (IsReadableLatin(p.ProductName)) return p.ProductName;
                return null;
            }
            else
            {
                if (IsReadableLatin(p.ProductNameEn)) return p.ProductNameEn;
                if (IsReadableLatin(p.ProductName)) return p.ProductName;
                return null;
            }
        }

        /// <summary>Латинський текст без кирилиці (англ., франц., нім. тощо).</summary>
        private static bool IsReadableLatin(string? text) =>
            !string.IsNullOrWhiteSpace(text) && !ContainsCyrillic(text);

        /// <summary>Український текст (відкидає суто російський).</summary>
        private static bool IsReadableUkrainian(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            if (!ContainsCyrillic(text)) return false;

            var hasRussianOnlyChars = text.Any(c => c is 'ы' or 'Ы' or 'э' or 'Э' or 'ъ' or 'Ъ' or 'ё' or 'Ё');
            var hasUkrainianMarkers = text.Any(c => c is 'і' or 'І' or 'ї' or 'Ї' or 'є' or 'Є' or 'ґ' or 'Ґ');

            // Якщо є рос. букви, але немає укр. маркерів — це російська.
            if (hasRussianOnlyChars && !hasUkrainianMarkers) return false;
            return true;
        }

        private static ExternalFoodDto? TryMapToDto(OffProduct p, bool preferUkrainian)
        {
            try
            {
                var name = GetBestName(p, preferUkrainian);
                if (string.IsNullOrWhiteSpace(name)) return null;

                static decimal Safe(double? v) =>
                    (v == null || double.IsNaN(v.Value) || double.IsInfinity(v.Value))
                        ? 0m
                        : Math.Round((decimal)v.Value, 2);

                return new ExternalFoodDto
                {
                    ExternalId = p.Code ?? Guid.NewGuid().ToString(),
                    Source = "OpenFoodFacts",
                    Name = name,
                    Brand = p.Brands,
                    Barcode = p.Code,
                    CaloriesPer100g = Safe(p.Nutriments!.GetKcal()),
                    ProteinPer100g = Safe(p.Nutriments.Proteins100g),
                    FatsPer100g = Safe(p.Nutriments.Fat100g),
                    CarbsPer100g = Safe(p.Nutriments.Carbohydrates100g),
                    FiberPer100g = Safe(p.Nutriments.Fiber100g),
                    SugarPer100g = Safe(p.Nutriments.Sugars100g),
                    SodiumPer100g = Safe((p.Nutriments.Sodium100g ?? 0) * 1000),
                };
            }
            catch
            {
                return null;
            }
        }

        private static bool ContainsCyrillic(string? text) =>
            text != null && text.Any(c => c >= '\u0400' && c <= '\u04FF');

        // ── Response models ──────────────────────────────────────────────

        private class OffNewSearchResponse
        {
            public List<OffProduct> Hits { get; set; } = new();
        }

        private class OffSearchResponse
        {
            public List<OffProduct> Products { get; set; } = new();
        }

        private class OffBarcodeResponse
        {
            public int Status { get; set; }
            public OffProduct? Product { get; set; }
        }

        private class OffProduct
        {
            [JsonPropertyName("product_name")]
            public string? ProductName { get; set; }

            [JsonPropertyName("product_name_uk")]
            public string? ProductNameUk { get; set; }

            [JsonPropertyName("product_name_en")]
            public string? ProductNameEn { get; set; }

            [JsonPropertyName("product_name_ru")]
            public string? ProductNameRu { get; set; }

            public string? Brands { get; set; }
            public string? Code { get; set; }
            public OffNutriments? Nutriments { get; set; }

            [JsonPropertyName("countries_tags")]
            public List<string>? CountriesTags { get; set; }

            public string? Lang { get; set; }
        }

        private class OffNutriments
        {
            [JsonPropertyName("energy-kcal_100g")]
            public double? EnergyKcal100g { get; set; }

            [JsonPropertyName("energy_100g")]
            public double? EnergyKj100g { get; set; }

            public double? GetKcal() =>
                EnergyKcal100g ?? (EnergyKj100g.HasValue ? EnergyKj100g.Value / 4.184 : null);

            [JsonPropertyName("proteins_100g")]
            public double? Proteins100g { get; set; }

            [JsonPropertyName("fat_100g")]
            public double? Fat100g { get; set; }

            [JsonPropertyName("carbohydrates_100g")]
            public double? Carbohydrates100g { get; set; }

            [JsonPropertyName("fiber_100g")]
            public double? Fiber100g { get; set; }

            [JsonPropertyName("sugars_100g")]
            public double? Sugars100g { get; set; }

            [JsonPropertyName("sodium_100g")]
            public double? Sodium100g { get; set; }
        }
    }
}
