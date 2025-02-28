﻿using Backend.Application.Interfaces.EmailServices;
using Backend.Domain.Entities.Email;
using MimeKit;
using Org.BouncyCastle.Cms;
using System.Net.Mail;

namespace Backend.Infrastructure.Email
{
    public class EmailPreparationService : IEmailPreparationService
    {
        private readonly IConfiguration _configuration;

        public EmailPreparationService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<EmailMessageModel> PrepareVerificationEmailAsync(EmailMessageModel emailMessageModel)
        {
            // Generate the verification URL
            var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/email-confirmation?token={emailMessageModel.Token}";

            return new EmailMessageModel
            {
                Recipient = emailMessageModel.Recipient,
                Subject = "Email verifiering",
                Body = $"Vänligen tryck på länken för att verifiera din nya användare på eBudget!: <a href='{verificationUrl}'>Verifiera e-post</a>",
                Sender = _configuration["Smtp:UsernameNoReply"],    // no-reply@ebudget.se
                FromName = "eBudget No Reply",
                ToName = "",
                ReplyTo = ""
            };
        }
        public async Task<EmailMessageModel> PrepareContactUsEmailAsync(EmailMessageModel emailMessageModel)
        {
            return new EmailMessageModel
            {
                Recipient = _configuration["Smtp:UsernameInfoUser"],     // info@mail.ebudget.se
                Subject = emailMessageModel.Subject,
                Body = emailMessageModel.Subject,
                Sender = _configuration["Smtp:UsernameNoReply"],         // no-reply@ebudget.se
                FromName = emailMessageModel.FromName,
                ToName = "eBudget Support",
                ReplyTo = emailMessageModel.FromName
            };
        }
        public async Task<EmailMessageModel> PrepareResetPasswordMessage(EmailMessageModel emailMessageModel)
        {
            var resetLink = $"https://ebudget.se/reset-password?token={emailMessageModel.Token}";
            return new EmailMessageModel
            {
                Recipient = emailMessageModel.Recipient,
                Subject = "Lösenordsåterställning eBudget",
                Body = $"Klicka på länken för att återställa ditt lösenord!: {resetLink}",
                Sender = _configuration["Smtp:UsernameNoReply"],         // no-reply@ebudget.se
                FromName = emailMessageModel.FromName,
                ToName = "eBudget Support",
                ReplyTo = emailMessageModel.FromName
            };
        }
    }
}
