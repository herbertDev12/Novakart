using NovaKart.Domain.Enums;

namespace NovaKart.Application.Dtos.Orders;

public record OrderSummaryDto(
    Guid Id,
    decimal TotalAmount,
    OrderStatus Status,
    DateTime CreatedAt,
    int ItemCount);
