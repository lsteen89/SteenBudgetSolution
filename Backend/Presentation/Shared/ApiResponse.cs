namespace Backend.Presentation.Shared;

/// <summary>
/// A standardized API response wrapper for successful requests.
/// </summary>
/// <typeparam name="T">The type of the data being returned.</typeparam>
public class ApiResponse<T>
{
    public T? Data { get; set; }

    public ApiResponse(T? data)
    {
        Data = data;
    }
}

/// <summary>
/// A standardized API response for failed requests.
/// </summary>
public class ApiErrorResponse
{
    public string ErrorCode { get; set; }
    public string Message { get; set; }

    public ApiErrorResponse(string errorCode, string message)
    {
        ErrorCode = errorCode;
        Message = message;
    }
}
