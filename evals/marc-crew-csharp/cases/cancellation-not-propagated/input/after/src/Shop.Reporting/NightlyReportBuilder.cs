using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Shop.Reporting;

public sealed class NightlyReportBuilder
{
    private readonly IReportSource _source;

    public NightlyReportBuilder(IReportSource source)
    {
        _source = source;
    }

    public async Task<IReadOnlyList<ReportRow>> BuildAsync(CancellationToken cancellationToken)
    {
        var rows = new List<ReportRow>();
        var page = 0;

        while (true)
        {
            var batch = await _source.FetchPageAsync(page, pageSize: 500);
            if (batch.Count == 0)
            {
                break;
            }

            rows.AddRange(batch);
            page++;
            await Task.Delay(2000);
        }

        return rows;
    }
}
