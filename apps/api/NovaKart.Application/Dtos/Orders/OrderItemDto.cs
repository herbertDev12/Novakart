namespace NovaKart.Application.Dtos.Orders;

public record OrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal PriceAtPurchase);
