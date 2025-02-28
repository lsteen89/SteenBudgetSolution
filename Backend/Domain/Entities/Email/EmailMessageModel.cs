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
        public string Recipient { get; set; }  // Recipient email
        public string Subject { get; set; }    // Email subject
        public string Body { get; set; }       // Email body
        public string Sender { get; set; }     // Sender email
        public string FromName { get; set; }   // Display name for sender
        public string ToName { get; set; }     // Display name for recipient
        public string ReplyTo { get; set; }    // Reply-to email address
        public EmailType EmailType { get; set; } // Type of email
        public Guid Token { get; set; }      // Token for email verification
        public string SmtpPassword { get; set; } // SMTP password
    }
}


