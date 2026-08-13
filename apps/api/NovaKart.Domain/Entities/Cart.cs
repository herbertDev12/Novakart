namespace NovaKart.Domain.Entities;

public class Cart
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}
