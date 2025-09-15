namespace Backend.Domain.Shared;

/// <summary>
/// Represents the result of an operation, either success or failure.
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    // Constructor is private to force creation through static factory methods.
    internal Result(bool isSuccess, Error error)
    {
        // Basic validation
        if (isSuccess && error != Error.None ||
            !isSuccess && error == Error.None)
        {
            throw new ArgumentException("Invalid error state.", nameof(error));
        }

        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
}


/// <summary>
/// Represents the result of an operation with a return value.
/// </summary>
public class Result<TValue> : Result
{
    private readonly TValue? _value;

    // The Value property is now explicitly nullable, matching the internal field.
    // This makes the class honest about what it holds. No '!' is needed.
    public TValue? Value => IsSuccess
        ? _value
        : throw new InvalidOperationException("The value of a failure result cannot be accessed.");

    // Constructor is private to enforce controlled creation.
    private Result(TValue? value, bool isSuccess, Error error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    public static Result<TValue> Success(TValue? value) => new(value, true, Error.None);

    // We can also create a new Failure factory on this class for consistency.
    public new static Result<TValue> Failure(Error error) => new(default, false, error);
}