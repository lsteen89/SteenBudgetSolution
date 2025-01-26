namespace Backend.Infrastructure.Interfaces
{
    public interface IMessageSender
    {
        Task SendMessageAsync(string userId, string message);
    }
}
