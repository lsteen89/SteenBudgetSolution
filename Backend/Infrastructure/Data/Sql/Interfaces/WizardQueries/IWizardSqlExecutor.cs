namespace Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries
{
    public interface IWizardSqlExecutor
    {
        Task<Guid> CreateWizardAsync(string email);
        Task<Guid?> GetWizardSessionIdAsync(string email);
    }
}
