using Backend.Application.Validators;
using Xunit;
using Backend.Application.DTO;

namespace Backend.Tests.UnitTests.Email
{
    public class ResetPasswordRequestValidatorTests : UnitTestBase
    {
        private readonly ResetPasswordRequestValidator _validator;

        public ResetPasswordRequestValidatorTests()
        {
            _validator = new ResetPasswordRequestValidator();
        }

        [Fact]
        public void Should_Have_Error_When_Email_Is_Empty()
        {
            var result = _validator.Validate(new ResetPasswordRequest { Email = "" });
            Assert.Contains(result.Errors, e => e.PropertyName == "Email" && e.ErrorMessage == "Email is required.");
        }

        [Fact]
        public void Should_Have_Error_When_Email_Is_Invalid()
        {
            var result = _validator.Validate(new ResetPasswordRequest { Email = "invalid-email" });
            Assert.Contains(result.Errors, e => e.PropertyName == "Email" && e.ErrorMessage == "Invalid email format.");
        }

        [Fact]
        public void Should_Pass_When_Email_Is_Valid()
        {
            var result = _validator.Validate(new ResetPasswordRequest { Email = "test@example.com" });
            Assert.True(result.IsValid);
        }
    }

}
