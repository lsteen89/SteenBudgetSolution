using MimeKit;
using Org.BouncyCastle.Cms;
using System.Net.Mail;

namespace Backend.Domain.Entities.Email
{
    // Enum for email types, used to determine the type of email to send
    public enum EmailType
    {
        Verification,
        ContactUs,
        ResetPassword
    }
    public class EmailMessageModel
    {
        public required string Recipient { get; set; }  // Recipient email
        public required string Subject { get; set; }    // Email subject
        public required string Body { get; set; }       // Email body
        public required string Sender { get; set; }     // Sender email
        public required string FromName { get; set; }   // Display name for sender
        public required string ToName { get; set; }     // Display name for recipient
        public required string ReplyTo { get; set; }    // Reply-to email address
        public required EmailType EmailType { get; set; } // Type of email
        public required Guid Token { get; set; }      // Token for email verification
        public required string SmtpPassword { get; set; } // SMTP password
    }
}


