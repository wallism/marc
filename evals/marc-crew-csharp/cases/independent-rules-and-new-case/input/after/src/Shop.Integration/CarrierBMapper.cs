namespace Shop.Integration;

public sealed class CarrierBMapper
{
    public CarrierBLabelRequest Map(Shipment shipment) => new()
    {
        consignee_name = shipment.Recipient.Name,
        consignee_street = shipment.Recipient.Line1,
        consignee_zip = shipment.Recipient.PostCode,
        parcel_size = ParcelSizeLabels.Label(shipment.Size),
        service_level = shipment.IsExpress ? "EXP" : "STD"
    };
}
