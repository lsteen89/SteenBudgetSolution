import { EmailSubmissionDto } from '../../types/User/Email/emailForm';

export const validateContactForm = (formData: Partial<EmailSubmissionDto>): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!formData.FirstName?.trim()) {
    errors.FirstName = 'Förnamn är obligatoriskt';
  }

  if (!formData.LastName?.trim()) {
    errors.LastName = 'Efternamn är obligatoriskt';
  }

  if (
    !formData.SenderEmail?.trim() ||
    !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.SenderEmail)
  ) {
    errors.SenderEmail = 'Ogiltig epost';
  }

  if (!formData.Subject?.trim()) {
    errors.Subject = 'Ämne är obligatoriskt';
  }

  if (!formData.Body?.trim() || formData.Body.length < 10) {
    errors.Body = 'Meddelande måste vara minst 10 tecken långt';
  }

  // Skip Captcha validation for the email "l@l.se"
  if (formData.SenderEmail !== 'l@l.se' && !formData.CaptchaToken?.trim()) {
    errors.CaptchaToken = 'Felaktig reCaptcha';
  }

  return errors;
};
