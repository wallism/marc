using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Shop.Dispatch.Legacy
{
    public class RouteSelector
    {
        private readonly Dictionary<string, string> _depotByPostArea;

        public RouteSelector(Dictionary<string, string> depotByPostArea)
        {
            if (depotByPostArea == null)
            {
                throw new ArgumentNullException(nameof(depotByPostArea));
            }

            _depotByPostArea = depotByPostArea;
        }

        public Task<string> SelectDepotAsync(string postCode, string fallbackDepot)
        {
            if (string.IsNullOrWhiteSpace(postCode))
            {
                throw new ArgumentException("postCode is required.", nameof(postCode));
            }

            string area = postCode.Split(' ')[0].ToUpperInvariant();
            string depot;
            if (_depotByPostArea.TryGetValue(area, out depot))
            {
                return Task.FromResult(depot);
            }

            return Task.FromResult(fallbackDepot);
        }
    }
}
