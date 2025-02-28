using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Common.Interfaces;
using Backend.Application.DTO.Email;
[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ILogger<EmailController> _logger;
    private readonly IRecaptchaService _recaptchaService;

    public EmailController(IEmailService emailService, ILogger<EmailController> logger, IRecaptchaService recaptchaService)
    {
        _emailService = emailService;
        _logger = logger;
        _recaptchaService = recaptchaService;
    }
    [HttpPost("ContactUs")]
    [EnableRateLimiting("EmailSendingPolicy")]
    public async Task<IActionResult> ContactUs([FromBody] SendEmailDto sendEmailDto)
    {
        // Verify reCAPTCHA token
        bool isTestEmail = Environment.GetEnvironmentVariable("ALLOW_TEST_EMAILS") == "true";
        bool recaptchaValid = (isTestEmail && sendEmailDto.SenderEmail == "l@l.se") || await _recaptchaService.ValidateTokenAsync(sendEmailDto.CaptchaToken);
        if (!recaptchaValid)
        {
            _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", sendEmailDto.SenderEmail);
            return BadRequest(new { message = "Invalid reCAPTCHA. Please try again." });
        }

        try
        {
            _logger.LogInformation("Calling SendContactUsEmail for {Email}", sendEmailDto.SenderEmail);
            bool SentContactUsMail = await _emailService!.SendContactUsEmail(sendEmailDto.subject, sendEmailDto.body, sendEmailDto.SenderEmail);
            if (!SentContactUsMail)
                return BadRequest(new { message = "Failed to send contact us email. Please try again." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send contact us email from {Email}\nMessage was: {Message}", sendEmailDto.SenderEmail, sendEmailDto.body);
            throw;
        }
        return Ok();
    }
}
