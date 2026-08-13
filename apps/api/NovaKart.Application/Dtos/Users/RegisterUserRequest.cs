namespace NovaKart.Application.Dtos.Users;

public record RegisterUserRequest(
    string Username,
    string Email,
    string Password,
    string? Phone);
