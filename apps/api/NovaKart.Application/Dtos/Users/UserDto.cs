using NovaKart.Domain.Enums;

namespace NovaKart.Application.Dtos.Users;

public record UserDto(
    Guid Id,
    string Username,
    string Email,
    UserRole Role,
    string? Phone,
    DateTime CreatedAt);
