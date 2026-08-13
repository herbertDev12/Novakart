using NovaKart.Domain.Enums;

namespace NovaKart.Application.Dtos.Orders;

public record OrderDto(
    Guid Id,
    Guid UserId,
    decimal TotalAmount,
    OrderStatus Status,
    DateTime CreatedAt,
    IReadOnlyList<OrderItemDto> Items);
