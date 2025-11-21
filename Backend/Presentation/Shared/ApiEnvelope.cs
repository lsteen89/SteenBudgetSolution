namespace Backend.Presentation.Shared;

public sealed class ApiError
{
    public string Code { get; init; } = default!;
    public string Message { get; init; } = default!;
}

public sealed class ApiEnvelope<T>
{
    public T? Data { get; init; }
    public bool IsSuccess { get; init; }
    public ApiError? Error { get; init; }

    public static ApiEnvelope<T> Success(T data) => new()
    {
        Data = data,
        IsSuccess = true,
        Error = null
    };

    public static ApiEnvelope<T> Failure(string code, string message) => new()
    {
        Data = default,
        IsSuccess = false,
        Error = new ApiError { Code = code, Message = message }
    };
}
