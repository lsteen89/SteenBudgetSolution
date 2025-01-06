namespace Backend.Domain.Shared
{
    public static class Messages
    {
        public static class PasswordReset
        {
            public const string PasswordUpdated = "Password successfully updated.";
            public const string InvalidToken = "Invalid or expired token.";
            public const string SamePassword = "New password cannot be the same as the old password.";
            public const string UpdateFailed = "Failed to update password. Please try again.";
        }

        public static class EmailVerification
        {
            public const string VerificationSuccessful = "Email verification successful.";
            public const string AlreadyVerified = "Email is already verified.";
            public const string VerificationFailed = "Email verification failed. Please try again.";
        }

    }
}
