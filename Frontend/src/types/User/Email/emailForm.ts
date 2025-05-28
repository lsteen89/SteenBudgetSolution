export interface EmailSubmissionDto {
  FirstName: string;
  LastName: string;
  Subject: string;
  Body: string;
  SenderEmail: string;
  CaptchaToken?: string | null;
}
