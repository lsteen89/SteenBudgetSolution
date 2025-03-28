using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries
{
    public interface IWizardSqlExecutor
    {
        Task<Guid> CreateWizardAsync(string email, DbConnection? conn = null, DbTransaction? tx = null);
        Task<Guid?> GetWizardSessionIdAsync(string email, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> UpsertStepDataAsync(string wizardSessionId, int stepNumber, string jsonData, DbConnection? conn = null, DbTransaction? tx = null);
        Task<Dictionary<int, object>?> GetWizardStepDataAsync(string wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null);
    }
}
