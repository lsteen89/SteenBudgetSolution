using Backend.Application.DTO.Wizard;
using Backend.Infrastructure.Entities.Wizard;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries
{
    public interface IWizardSqlExecutor
    {
        Task<Guid> CreateWizardAsync(Guid? persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task<Guid?> GetWizardSessionIdAsync(Guid? persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> UpsertStepDataAsync(string wizardSessionId, int stepNumber, int substepNumber, string jsonData, DbConnection? conn = null, DbTransaction? tx = null);
        Task<IEnumerable<WizardStepRowEntity>?> GetRawWizardStepDataAsync(string wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null); 
        Task<int> GetWizardSubStepAsync(string wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null);
        Task<WizardSessionDto> GetWizardSessionAsync(string wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null);
    }
}
