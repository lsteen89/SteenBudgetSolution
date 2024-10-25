namespace Backend.Models
{
    public class UserVerificationTracking
    {
        public int Id { get; set; } // Primary key

        public Guid PersoId { get; set; } // Foreign key referencing Users.PersoId

        public DateTime? LastResendRequestTime { get; set; } // Timestamp of the last resend request

        public int DailyResendCount { get; set; } = 0; // Count of daily resend attempts

        public DateTime? LastResendRequestDate { get; set; } // Date of the last resend attempt to reset count daily

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Automatically set creation timestamp

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow; // Automatically set update timestamp
    }
}
