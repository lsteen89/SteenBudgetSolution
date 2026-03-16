namespace Backend.Presentation.Shared;

public sealed class ApiError
{
    public string Code { get; init; } = default!;
    public string Message { get; init; } = default!;
}

public sealed class ApiInfo
{
    public string Code { get; init; } = default!;
    public string Message { get; init; } = default!;
}

public sealed class ApiEnvelope<T>
{
    public T? Data { get; init; }
    public bool IsSuccess { get; init; }
    public ApiError? Error { get; init; }
    public ApiInfo? Info { get; init; }

    public static ApiEnvelope<T> Success(T data) => new()
    {
        Data = data,
        IsSuccess = true,
        Error = null,
        Info = null
    };

    public static ApiEnvelope<T> Success(T data, string code, string message) => new()
    {
        Data = data,
        IsSuccess = true,
        Error = null,
        Info = new ApiInfo { Code = code, Message = message }
    };

    public static ApiEnvelope<T> Failure(string code, string message) => new()
    {
        Data = default,
        IsSuccess = false,
        Error = new ApiError { Code = code, Message = message },
        Info = null
    };
}

public static class ApiEnvelope
{
    public static ApiEnvelope<T> Success<T>(T data) => new()
    {
        Data = data,
        IsSuccess = true,
        Error = null,
        Info = null
    };

    public static ApiEnvelope<T> Success<T>(T data, string code, string message) => new()
    {
        Data = data,
        IsSuccess = true,
        Error = null,
        Info = new ApiInfo { Code = code, Message = message }
    };

    public static ApiEnvelope<object?> Success(string code, string message) => new()
    {
        Data = null,
        IsSuccess = true,
        Error = null,
        Info = new ApiInfo { Code = code, Message = message }
    };

    public static ApiEnvelope<T> Failure<T>(string code, string message) => new()
    {
        Data = default,
        IsSuccess = false,
        Error = new ApiError { Code = code, Message = message },
        Info = null
    };
}
