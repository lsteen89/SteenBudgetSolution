// This model is used in the AuthService.cs file. It is used to return the result of the login and refresh token methods.
// The model contains properties such as UserName, Success, Message.
// The properties are used to store the result of the login and refresh token methods and return them to the caller.
// The properties are set based on the result of the methods, such as whether the login was successful, the message to be displayed.
// The model is used to encapsulate the result of the methods and provide a structured way to return the result to the caller.

namespace Backend.Application.Models.Auth
{
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; }
        public Guid Persoid { get; set; }
        public string Email { get; set; }

    }
}
