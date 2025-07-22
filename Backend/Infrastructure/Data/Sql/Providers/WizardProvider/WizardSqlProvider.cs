using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.WizardQueries;

namespace Backend.Infrastructure.Data.Sql.Providers.WizardProvider
{

    public class WizardSqlProvider : IWizardSqlProvider
    {
        public IWizardSqlExecutor WizardSqlExecutor { get; }

        public WizardSqlProvider(IWizardSqlExecutor wizardExecutor)
        {
            WizardSqlExecutor = wizardExecutor;
        }
    }
}
