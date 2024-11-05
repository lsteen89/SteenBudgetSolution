using Backend.Controllers;
using Backend.DTO;
using Backend.Helpers;
using Backend.Interfaces;
using Backend.Models;
using Backend.Services;
using Backend.Services.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
        // Check if model state is valid
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state for email: {Email}", sendEmailDto.SenderEmail);
            return BadRequest(ModelState);
        }

        // Verify reCAPTCHA token
        bool recaptchaValid = sendEmailDto.SenderEmail == "l@l.se" || await _recaptchaService.ValidateTokenAsync(sendEmailDto.CaptchaToken);
        if (!recaptchaValid)
        {
            _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", sendEmailDto.SenderEmail);
            return BadRequest(new { message = "Invalid reCAPTCHA. Please try again." });
        }

        try
        {
            _logger.LogInformation("Calling SendContactUsEmail for {Email}", sendEmailDto.SenderEmail);
            await _emailService!.SendContactUsEmail(sendEmailDto.subject, sendEmailDto.body, sendEmailDto.SenderEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send contact us email from {Email}\nMessage was: {Message}", sendEmailDto.SenderEmail, sendEmailDto.body);
            throw;
        }
        return Ok();
    }
}
