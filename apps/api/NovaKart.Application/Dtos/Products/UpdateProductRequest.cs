namespace NovaKart.Application.Dtos.Products;

public record UpdateProductRequest(
    Guid CategoryId,
    string Name,
    string Description,
    decimal Price,
    int Stock,
    bool IsActive);
