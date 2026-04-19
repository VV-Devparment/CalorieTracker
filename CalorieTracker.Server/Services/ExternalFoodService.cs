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

        public ExternalFoodService(IHttpClientFactory httpClientFactory, IMemoryCache cache)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
        }

        /// <summary>
        /// Пошук за назвою у Open Food Facts.
        /// Автоматично визначає мову запиту (укр/англ) і шукає у відповідних мовних полях.
        /// </summary>
        public async Task<List<ExternalFoodDto>> SearchByNameAsync(string query, string source = "ukraine")
        {
            // source залишений для сумісності з контролером, але зараз ігнорується
            // (можна буде додати інші джерела пізніше)
            return await SearchOffAsync(query);
        }

        /// <summary>
        /// Пошук за штрих-кодом через Open Food Facts.
        /// </summary>
        public async Task<ExternalFoodDto?> SearchByBarcodeAsync(string barcode)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFacts");
                // Додаємо lc=uk — тоді OFF поверне product_name українською, якщо вона є
                var url = $"api/v2/product/{Uri.EscapeDataString(barcode)}.json" +
                          $"?lc=uk&fields=product_name,product_name_uk,product_name_en,brands,nutriments,code,lang";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<OffBarcodeResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (data?.Status != 1 || data.Product == null) return null;

                var p = data.Product;
                if (p.Nutriments == null) return null;

                var bestName = GetBestName(p, preferUkrainian: true);
                if (string.IsNullOrWhiteSpace(bestName)) return null;

                p.Code = barcode;
                return TryMapToDto(p, preferUkrainian: true);
            }
            catch
            {
                return null;
            }
        }

        // ── Open Food Facts ──────────────────────────────────────────────

        private async Task<List<ExternalFoodDto>> SearchOffAsync(string query)
        {
            var trimmed = query.Trim();
            if (string.IsNullOrEmpty(trimmed))
                return new List<ExternalFoodDto>();

            var isCyrillic = ContainsCyrillic(trimmed);
            var cacheKey = $"off:{(isCyrillic ? "uk" : "en")}:{trimmed.ToLowerInvariant()}";

            if (_cache.TryGetValue(cacheKey, out List<ExternalFoodDto>? cached))
                return cached!;

            // Пробуємо спочатку legacy API (cgi/search.pl) — він стабільніший для full-text search
            // і єдиний, що точно підтримує search_terms з мовними параметрами.
            // Search-a-licious (новий API) поки в бета, використовуємо як fallback.
            var results = await TrySearchLegacyApiAsync(trimmed, isCyrillic)
                       ?? await TrySearchNewApiAsync(trimmed, isCyrillic);

            if (results == null)
                throw new HttpRequestException("Open Food Facts недоступний. Спробуйте через кілька секунд.");

            if (results.Count > 0)
                _cache.Set(cacheKey, results, TimeSpan.FromMinutes(10));

            return results;
        }

        /// <summary>
        /// Legacy search API: cgi/search.pl
        /// Підтримує lc= та cc= для локалізованого пошуку.
        /// </summary>
        private async Task<List<ExternalFoodDto>?> TrySearchLegacyApiAsync(string query, bool isCyrillic)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFacts");

                // lc — мова інтерфейсу (в якому мовному полі робити пошук та якою мовою повертати назви)
                // cc — країна (впливає на популярність результатів у цій країні)
                var lc = isCyrillic ? "uk" : "en";
                var cc = isCyrillic ? "ua" : "world";

                var url = $"cgi/search.pl?action=process" +
                          $"&search_terms={Uri.EscapeDataString(query)}" +
                          $"&search_simple=1" +
                          $"&json=1" +
                          $"&page_size=20" +
                          $"&lc={lc}" +
                          $"&cc={cc}" +
                          $"&fields=product_name,product_name_uk,product_name_en,product_name_ru," +
                          $"brands,nutriments,code,countries_tags,lang,languages_codes";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<OffSearchResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (data?.Products == null) return null;

                return FilterAndMap(data.Products, preferUkrainian: isCyrillic);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Новий API (Search-a-licious): search.openfoodfacts.org
        /// Використовується як fallback, бо API в бета-статусі.
        /// </summary>
        private async Task<List<ExternalFoodDto>?> TrySearchNewApiAsync(string query, bool isCyrillic)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFactsSearch");
                var langs = isCyrillic ? "uk,en" : "en";

                var url = $"search?q={Uri.EscapeDataString(query)}" +
                          $"&page_size=20" +
                          $"&langs={langs}" +
                          $"&fields=product_name,product_name_uk,product_name_en,brands,nutriments,code,countries_tags,lang";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<OffNewSearchResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (data?.Hits is not { Count: > 0 }) return null;

                return FilterAndMap(data.Hits, preferUkrainian: isCyrillic);
            }
            catch
            {
                return null;
            }
        }

        private static List<ExternalFoodDto> FilterAndMap(List<OffProduct> products, bool preferUkrainian)
        {
            var blockedCountries = new HashSet<string> { "en:russia", "en:belarus" };

            return products
                .Where(p => p.Nutriments != null)
                .Where(p => !string.IsNullOrWhiteSpace(GetBestName(p, preferUkrainian)))
                .Where(p => p.CountriesTags == null ||
                            !p.CountriesTags.Any(t => blockedCountries.Contains(t.ToLower())))
                // Якщо користувач шукає українською, але єдина назва продукта російською —
                // краще пропустити такий результат взагалі (показує шум).
                .Where(p => !preferUkrainian || !IsOnlyRussian(p))
                .Select(p => TryMapToDto(p, preferUkrainian))
                .OfType<ExternalFoodDto>()
                .ToList();
        }

        /// <summary>
        /// Обирає найкращу назву з наявних мовних варіантів.
        /// Якщо preferUkrainian=true: шукаємо uk → en → default.
        /// Інакше: en → default → uk.
        /// </summary>
        private static string? GetBestName(OffProduct p, bool preferUkrainian)
        {
            if (preferUkrainian)
            {
                if (!string.IsNullOrWhiteSpace(p.ProductNameUk)) return p.ProductNameUk;
                if (!string.IsNullOrWhiteSpace(p.ProductNameEn) && !HasCyrillic(p.ProductNameEn))
                    return p.ProductNameEn;
                if (!string.IsNullOrWhiteSpace(p.ProductName) && !IsRussianText(p.ProductName))
                    return p.ProductName;
                return null;
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(p.ProductNameEn) && !HasCyrillic(p.ProductNameEn))
                    return p.ProductNameEn;
                if (!string.IsNullOrWhiteSpace(p.ProductName) && !HasCyrillic(p.ProductName))
                    return p.ProductName;
                return null;
            }
        }

        private static bool IsOnlyRussian(OffProduct p)
        {
            var hasUk = !string.IsNullOrWhiteSpace(p.ProductNameUk);
            var hasEnClean = !string.IsNullOrWhiteSpace(p.ProductNameEn) && !HasCyrillic(p.ProductNameEn);
            if (hasUk || hasEnClean) return false;

            // Залишається тільки product_name — перевіряємо його.
            return !string.IsNullOrWhiteSpace(p.ProductName) && IsRussianText(p.ProductName);
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

        // ── Визначення мови ──────────────────────────────────────────────

        /// <summary>Перевіряє, чи є в рядку хоча б одна кирилична літера.</summary>
        private static bool ContainsCyrillic(string? text) =>
            text != null && text.Any(c => c >= '\u0400' && c <= '\u04FF');

        /// <summary>Те саме, що ContainsCyrillic — для читабельності.</summary>
        private static bool HasCyrillic(string? text) => ContainsCyrillic(text);

        /// <summary>
        /// Евристика для визначення саме російського тексту.
        /// Базуємось на літерах, яких немає в укр. абетці (ы, э, ъ, ё)
        /// АБО на характерних російських закінченнях/словах.
        /// </summary>
        private static bool IsRussianText(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            if (!ContainsCyrillic(text)) return false;

            // Літери, яких точно немає в українській
            if (text.Any(c => c is 'ы' or 'Ы' or 'э' or 'Э' or 'ъ' or 'Ъ' or 'ё' or 'Ё'))
                return true;

            // Літери, яких немає в російській (і, ї, є, ґ) — значить це точно укр.
            if (text.Any(c => c is 'і' or 'І' or 'ї' or 'Ї' or 'є' or 'Є' or 'ґ' or 'Ґ'))
                return false;

            // Залишилась неоднозначність (напр. "молоко" — однакове в обох мовах).
            // У такому випадку повертаємо false — не блокуємо.
            return false;
        }

        // ── Response models ──────────────────────────────────────────────

        private class OffNewSearchResponse
        {
            public List<OffProduct> Hits { get; set; } = [];
        }

        private class OffSearchResponse
        {
            public List<OffProduct> Products { get; set; } = [];
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