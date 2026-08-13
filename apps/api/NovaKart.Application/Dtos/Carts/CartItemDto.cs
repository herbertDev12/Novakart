namespace NovaKart.Application.Dtos.Carts;

public record CartItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);
