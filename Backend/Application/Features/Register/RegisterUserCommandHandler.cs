using MediatR;
using Backend.Domain.Entities.User;
using Backend.Application.Features.Events.Register;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Domain.Shared;
using Backend.Domain.Users;

namespace Backend.Application.Features.Commands.Auth.Register;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Result>
{
    private readonly IUserRepository _userRepository;
    private readonly IMediator _mediator;
    private readonly IRecaptchaService _recaptchaService;

    public RegisterUserCommandHandler(IUserRepository userRepository, IMediator mediator, IRecaptchaService recaptchaService)
    {
        _userRepository = userRepository;
        _mediator = mediator;
        _recaptchaService = recaptchaService;
    }
    public async Task<Result> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var allowSeedByEnv = Environment.GetEnvironmentVariable("ALLOW_SEEDING") == "true";
        var isTrustedSeed = request.IsSeedingOperation && allowSeedByEnv;

        if (!isTrustedSeed)
        {
            // Step 0: Precheck
            // Validate reCAPTCHA
            bool isTestEmail = Environment.GetEnvironmentVariable("ALLOW_TEST_EMAILS") == "true";
            bool recaptchaValid = (isTestEmail && request.Email == "l@l.se") || await _recaptchaService.ValidateTokenAsync(request.CaptchaToken);
            if (!recaptchaValid)
                return Result.Failure(UserErrors.InvalidCaptcha);

            // Honeypot check
            if (!string.IsNullOrWhiteSpace(request.Honeypot))
                return Result.Success(); // Pretend success to avoid spam bots
        }
        // 1. Use the repository to check if the user exists
        if (await _userRepository.UserExistsAsync(request.Email, cancellationToken))
            return Result.Failure(UserErrors.EmailAlreadyExists);

        // 2. Create the user entity
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Password = hashedPassword,
            Roles = "1", // Default role
            EmailConfirmed = isTrustedSeed ? true : false
        };

        // 3. Use the repository to save the new user
        var success = await _userRepository.CreateUserAsync(user, cancellationToken);

        if (!success)
            return Result.Failure(UserErrors.RegistrationFailed);

        // 4. Publish the UserRegisteredEvent
        if (!isTrustedSeed)
            await _mediator.Publish(new UserRegisteredEvent(user.PersoId, user.Email), cancellationToken);

        return Result.Success();
    }
}