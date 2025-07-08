using Backend.Application.DTO.Wizard;
using Backend.Infrastructure.Entities.Wizard;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries
{
    public interface IWizardSqlExecutor
    {
        Task<Guid> CreateWizardAsync(Guid? persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task<Guid?> GetWizardSessionIdAsync(Guid? persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> UpsertStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, string jsonData, int dataVersion, DbConnection? conn = null, DbTransaction? tx = null);
        Task<IEnumerable<WizardStepRowEntity>?> GetRawWizardStepDataAsync(Guid wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null); 
        Task<int> GetWizardSubStepAsync(Guid wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null);
        Task<WizardSessionDto> GetWizardSessionAsync(Guid wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null);
    }
}
