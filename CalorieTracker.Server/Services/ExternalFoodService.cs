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
        /// Пошук за назвою. source: "off" | "ukraine"
        /// </summary>
        public async Task<List<ExternalFoodDto>> SearchByNameAsync(string query, string source = "ukraine")
        {
            return await SearchOffAsync(query);
        }

        /// <summary>
        /// Пошук за штрих-кодом через Open Food Facts
        /// </summary>
        public async Task<ExternalFoodDto?> SearchByBarcodeAsync(string barcode)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFacts");
                var url = $"api/v2/product/{Uri.EscapeDataString(barcode)}.json?fields=product_name,product_name_uk,brands,nutriments,code";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<OffBarcodeResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (data?.Status != 1 || data.Product == null) return null;

                var p = data.Product;
                if (string.IsNullOrWhiteSpace(p.ProductName) || p.Nutriments == null) return null;

                p.Code = barcode;
                return TryMapToDto(p);
            }
            catch
            {
                return null;
            }
        }

        // ── Open Food Facts ──────────────────────────────────────────────

        private async Task<List<ExternalFoodDto>> SearchOffAsync(string query)
        {
            var cacheKey = $"off:{query.ToLowerInvariant().Trim()}";
            if (_cache.TryGetValue(cacheKey, out List<ExternalFoodDto>? cached))
                return cached!;

            // Пробуємо новий пошуковий API (search.openfoodfacts.org) — стабільніший
            var results = await TrySearchNewApiAsync(query)
                       ?? await TrySearchLegacyApiAsync(query);

            if (results == null)
                throw new HttpRequestException("Open Food Facts недоступний. Спробуйте через кілька секунд.");

            _cache.Set(cacheKey, results, TimeSpan.FromMinutes(10));
            return results;
        }

        private async Task<List<ExternalFoodDto>?> TrySearchNewApiAsync(string query)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFactsSearch");
                var url = $"search?q={Uri.EscapeDataString(query)}&page_size=20&fields=product_name,product_name_uk,brands,nutriments,code,countries_tags";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<OffNewSearchResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (data?.Hits == null) return null;

                var blockedCountries = new HashSet<string> { "en:russia", "en:belarus" };

                return data.Hits
                    .Where(p => (!string.IsNullOrWhiteSpace(p.ProductName) || !string.IsNullOrWhiteSpace(p.ProductNameUk))
                             && p.Nutriments != null
                             && (p.CountriesTags == null || !p.CountriesTags.Any(t => blockedCountries.Contains(t.ToLower())))
                             && (!string.IsNullOrWhiteSpace(p.ProductNameUk) || !HasRussianChars(p.ProductName)))
                    .Select(p => TryMapToDto(p))
                    .OfType<ExternalFoodDto>()
                    .ToList();
            }
            catch
            {
                return null;
            }
        }

        private async Task<List<ExternalFoodDto>?> TrySearchLegacyApiAsync(string query)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("OpenFoodFacts");
                var url = $"cgi/search.pl?action=process&search_terms={Uri.EscapeDataString(query)}&json=1&page_size=20&fields=product_name,product_name_uk,brands,nutriments,code,countries_tags";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<OffSearchResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (data?.Products == null) return null;

                var blockedCountries = new HashSet<string> { "en:russia", "en:belarus" };

                return data.Products
                    .Where(p => (!string.IsNullOrWhiteSpace(p.ProductName) || !string.IsNullOrWhiteSpace(p.ProductNameUk))
                             && p.Nutriments != null
                             && (p.CountriesTags == null || !p.CountriesTags.Any(t => blockedCountries.Contains(t.ToLower())))
                             && (!string.IsNullOrWhiteSpace(p.ProductNameUk) || !HasRussianChars(p.ProductName)))
                    .Select(p => TryMapToDto(p))
                    .OfType<ExternalFoodDto>()
                    .ToList();
            }
            catch
            {
                return null;
            }
        }

        // Повертає null якщо продукт містить некоректні дані (NaN, Infinity тощо)
        private static ExternalFoodDto? TryMapToDto(OffProduct p)
        {
            try
            {
                var name = !string.IsNullOrWhiteSpace(p.ProductNameUk)
                    ? p.ProductNameUk!
                    : p.ProductName!;

                static decimal Safe(double? v) =>
                    (v == null || double.IsNaN(v.Value) || double.IsInfinity(v.Value))
                        ? 0m
                        : Math.Round((decimal)v.Value, 2);

                return new ExternalFoodDto
                {
                    ExternalId      = p.Code ?? Guid.NewGuid().ToString(),
                    Source          = "OpenFoodFacts",
                    Name            = name,
                    Brand           = p.Brands,
                    Barcode         = p.Code,
                    CaloriesPer100g = Safe(p.Nutriments!.GetKcal()),
                    ProteinPer100g  = Safe(p.Nutriments.Proteins100g),
                    FatsPer100g     = Safe(p.Nutriments.Fat100g),
                    CarbsPer100g    = Safe(p.Nutriments.Carbohydrates100g),
                    FiberPer100g    = Safe(p.Nutriments.Fiber100g),
                    SugarPer100g    = Safe(p.Nutriments.Sugars100g),
                    SodiumPer100g   = Safe((p.Nutriments.Sodium100g ?? 0) * 1000),
                };
            }
            catch
            {
                return null; // пропускаємо продукт з пошкодженими даними
            }
        }

        // Символи ы э ъ ё яких немає в українській абетці — ознака російського тексту
        private static bool HasRussianChars(string? text) =>
            text != null && text.Any(c => c is 'ы' or 'Ы' or 'э' or 'Э' or 'ъ' or 'Ъ' or 'ё' or 'Ё');

        // ── Response models ──────────────────────────────────────────────

        // Новий API: search.openfoodfacts.org
        private class OffNewSearchResponse
        {
            public List<OffProduct> Hits { get; set; } = [];
        }

        // Старий API: world.openfoodfacts.org/cgi/search.pl
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

            public string? Brands { get; set; }
            public string? Code { get; set; }
            public OffNutriments? Nutriments { get; set; }

            [JsonPropertyName("countries_tags")]
            public List<string>? CountriesTags { get; set; }
        }

        private class OffNutriments
        {
            [JsonPropertyName("energy-kcal_100g")]
            public double? EnergyKcal100g { get; set; }

            [JsonPropertyName("energy_100g")]
            public double? EnergyKj100g { get; set; }

            // Returns kcal: prefers direct kcal field, falls back to kJ / 4.184
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
