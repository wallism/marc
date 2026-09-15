using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Shop.Data;

namespace Shop.Reporting;

public sealed class OverdueInvoiceQuery
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public OverdueInvoiceQuery(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task<IReadOnlyList<OverdueRow>> RunAsync(DateOnly asOf)
    {
        var invoices = await _db.Invoices
            .Where(i => i.DueOn < asOf && i.SettledOn == null)
            .ToListAsync();

        var rows = new List<OverdueRow>();
        foreach (var invoice in invoices)
        {
            var customer = await _db.Customers.FirstAsync(c => c.Id == invoice.CustomerId);
            rows.Add(new OverdueRow(invoice.Reference, customer.Name, invoice.Amount));
        }

        return rows;
    }
}
