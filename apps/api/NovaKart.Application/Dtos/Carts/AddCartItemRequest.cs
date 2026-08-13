namespace NovaKart.Application.Dtos.Carts;

public record AddCartItemRequest(Guid ProductId, int Quantity);
