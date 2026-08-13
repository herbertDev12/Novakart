namespace NovaKart.Application.Dtos.Carts;

public record CartDto(
    Guid Id,
    Guid UserId,
    DateTime UpdatedAt,
    IReadOnlyList<CartItemDto> Items,
    decimal Total);
