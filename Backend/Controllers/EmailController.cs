using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly IEmailService _emailService;

    public EmailController(IEmailService emailService)
    {
        _emailService = emailService;
    }
}

public class EmailRequest
{
    public string? Email { get; set; } // Nullable email
    public string? Token { get; set; } // Nullable token
}
