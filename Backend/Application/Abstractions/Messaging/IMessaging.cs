using Backend.Domain.Shared; // Assuming your Result and Error types are here
using MediatR;
namespace Backend.Application.Abstractions.Messaging;

//================================================================
// QUERIES
//================================================================

/// <summary>
/// Represents a query that returns a response of type TResponse.
/// Queries should not modify the state of the system.
/// </summary>
public interface IQuery<TResponse> : IRequest<TResponse> { }

/// <summary>
/// Represents the handler for a query of type TQuery.
/// </summary>
public interface IQueryHandler<TQuery, TResponse> : IRequestHandler<TQuery, TResponse>
    where TQuery : IQuery<TResponse>
{ }


//================================================================
// COMMANDS
//================================================================

/// <summary>
/// Represents a command that does not return a value.
/// Commands should modify the state of the system.
/// </summary>
public interface ICommand : IRequest { }

/// <summary>
/// Represents a command that returns a response of type TResponse.
/// </summary>
public interface ICommand<TResponse> : IRequest<TResponse> { }


/// <summary>
/// Represents the handler for a command of type TCommand that does not return a value.
/// </summary>
public interface ICommandHandler<TCommand> : IRequestHandler<TCommand>
    where TCommand : ICommand
{ }

/// <summary>
/// Represents the handler for a command of type TCommand that returns a response of type TResponse.
/// </summary>
public interface ICommandHandler<TCommand, TResponse> : IRequestHandler<TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{ }