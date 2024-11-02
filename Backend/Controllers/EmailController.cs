using Backend.Controllers;
using Backend.DTO;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly ILogger<EmailController> _logger;
    private readonly UserServices _userServices;
    private readonly RecaptchaHelper _recaptchaHelper;

    public EmailController(IEmailService emailService, UserServices userServices, IConfiguration configuration, ILogger<EmailController> logger, RecaptchaHelper recaptchaHelper)
    {
        _userServices = userServices;
        _logger = logger;
        _recaptchaHelper = recaptchaHelper;
    }
    [HttpPost("ContactUs")]
    [EnableRateLimiting("EmailSendingPolicy")]
    public async Task<IActionResult> ContactUs([FromBody] SendEmailDto sendEmailDto)
    {
        return Ok();
    }
}
