namespace NovaKart.Application.Dtos.Products;

public record ProductSummaryDto(
    Guid Id,
    string Name,
    decimal Price,
    bool IsActive,
    Guid CategoryId);
