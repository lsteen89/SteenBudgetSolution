﻿using Backend.Domain.Entities.Email;
using System.Threading.Tasks;

public interface IEmailService
{
    Task <bool> ProcessAndSendEmailAsync(EmailMessageModel emailMessage);
    Task<bool> SendContactUsEmail(string subject, string body, string SenderEmail);
}