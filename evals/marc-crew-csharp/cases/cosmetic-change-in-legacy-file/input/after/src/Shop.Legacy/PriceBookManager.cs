using System;
using System.Collections.Generic;

namespace Shop.Legacy
{
    // Pre-existing legacy module, unchanged except for FindEntry below.
    public class PriceBookManager
    {
        public static Dictionary<string, decimal> Cache = new Dictionary<string, decimal>();
        public static bool Loaded;

        public void LoadAll()
        {
            try
            {
                // ... 380 further lines of pre-existing loading logic ...
                Loaded = true;
            }
            catch (Exception)
            {
                // Pre-existing swallow. Not touched by this PR.
            }
        }

        public decimal FindEntry(string sku, decimal fallbackPrice)
        {
            if (Cache.TryGetValue(sku, out var cachedPrice))
            {
                return cachedPrice;
            }

            return fallbackPrice;
        }
    }
}
