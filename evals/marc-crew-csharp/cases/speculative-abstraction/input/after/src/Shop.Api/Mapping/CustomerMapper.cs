using System.Linq;
using Shop.Api.Customers;

namespace Shop.Api.Mapping;

public sealed class CustomerMapper : IEntityMapper<Customer, CustomerDto>
{
    public CustomerDto Map(Customer source, MappingOptions options)
    {
        return new CustomerDto
        {
            Id = source.Id,
            Name = source.Name,
            Email = options.ForAdminApi ? source.Email : Mask(source.Email),
            Addresses = source.Addresses
                .Where(a => options.IncludeArchivedAddresses || !a.IsArchived)
                .Select(a => a.Line1)
                .ToArray()
        };
    }

    private static string Mask(string email) => email[..1] + "***";
}
