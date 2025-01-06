namespace Backend.Domain.Shared
{
    public class OperationResult
    {
        public bool Success { get; }
        public string Message { get; }
        public int? StatusCode { get; } 
        public object? Data { get; }    

        public OperationResult(bool success, string message, int? statusCode = null, object? data = null)
        {
            Success = success;
            Message = message;
            StatusCode = statusCode;
            Data = data;
        }

        public static OperationResult SuccessResult(string message, object? data = null)
        {
            return new OperationResult(true, message, null, data);
        }

        public static OperationResult FailureResult(string message, int? statusCode = null)
        {
            return new OperationResult(false, message, statusCode);
        }
    }

}
