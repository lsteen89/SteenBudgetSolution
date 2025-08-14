using MimeKit;

namespace Backend.Application.Abstractions.Infrastructure.Email;
public interface IEmailComposer
{
    MimeMessage Compose();
}