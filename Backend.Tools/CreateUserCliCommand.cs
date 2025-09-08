using System.CommandLine;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Backend.Application.Features.Commands.Auth.Register;
using Backend.Domain.Shared;
using System.CommandLine.Invocation;

public sealed class CreateUserCliCommand : Command
{
    private readonly IServiceProvider _sp;

    public CreateUserCliCommand(IServiceProvider sp)
        : base("create-user", "Creates a user for seeding/admin.")
    {
        _sp = sp;

        var email = new System.CommandLine.Option<string>("--email", "Email") { IsRequired = true };
        var password = new System.CommandLine.Option<string>("--password", "Password") { IsRequired = true };

        AddOption(email);
        AddOption(password);

        this.SetHandler(async (string email, string password) =>
                await Handle(email, password),
            email, password);
    }

    private async Task Handle(string email, string password)
    {
        Console.WriteLine($"--> Creating user: {email} ...");

        await using var scope = _sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var cmd = new RegisterUserCommand(
            FirstName: "Seeded",
            LastName: "User",
            Email: email,
            Password: password,
            CaptchaToken: "",
            Honeypot: null
        )
        { IsSeedingOperation = true };

        Result result = await mediator.Send(cmd);

        Console.WriteLine(result.IsSuccess
            ? "--> User created successfully."
            : $"--> Error: {result.Error}");
    }
}
