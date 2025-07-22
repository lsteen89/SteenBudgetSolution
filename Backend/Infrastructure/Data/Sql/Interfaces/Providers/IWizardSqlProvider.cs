using Backend.Infrastructure.Data.Sql.Interfaces.Queries.WizardQueries;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Providers
{
    public interface IWizardSqlProvider
    {
        IWizardSqlExecutor WizardSqlExecutor { get; }
    }
}
