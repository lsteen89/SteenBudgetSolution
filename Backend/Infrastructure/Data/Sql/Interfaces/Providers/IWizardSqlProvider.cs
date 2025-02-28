using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Providers
{
    public interface IWizardSqlProvider
    {
        IWizardSqlExecutor WizardSqlExecutor { get; }
    }
}
