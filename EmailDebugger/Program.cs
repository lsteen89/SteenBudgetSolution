using MimeKit;
using MailKit.Net.Smtp;
using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Email Debugger started...");

        var emailMessage = new MimeMessage();
        emailMessage.From.Add(new MailboxAddress("No Reply", "no-reply@ebudget.se"));
        emailMessage.To.Add(new MailboxAddress("", "linus.j.steen@gmail.com"));
        emailMessage.Subject = "Test Secure Email with Postfix (TLS and Auth)";
        emailMessage.Body = new TextPart("html")
        {
            Text = "This is a test email sent using TLS and authentication via Postfix."
        };

        try
        {
            using (var client = new SmtpClient())
            {
                Console.WriteLine("Connecting to Postfix server via TLS...");

                // Use your Postfix server (TLS) and port 587 for STARTTLS
                client.Connect("mail.ebudget.se", 587, MailKit.Security.SecureSocketOptions.StartTls);

                // Authenticate using your Postfix/Dovecot credentials
                client.Authenticate("no-reply@ebudget.se", "REMOVED");

                Console.WriteLine("Sending email...");
                client.Send(emailMessage);

                client.Disconnect(true);
                Console.WriteLine("Email sent successfully.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending email: {ex.Message}");
        }
    }
}
