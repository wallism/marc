using System.Collections.Generic;

namespace Shop.Orders;

public sealed class Order
{
    private readonly List<OrderLine> _lines = new();

    public int Id { get; init; }

    public string Notes { get; set; } = string.Empty;

    public decimal Total { get; private set; }

    public List<OrderLine> Lines => _lines;

    public void AddLine(OrderLine line)
    {
        if (line.Quantity <= 0 || line.Quantity > line.AvailableStock)
        {
            throw new OrderValidationException("Quantity is not available.");
        }

        _lines.Add(line);
        Total += line.Quantity * line.UnitPrice;
    }
}
