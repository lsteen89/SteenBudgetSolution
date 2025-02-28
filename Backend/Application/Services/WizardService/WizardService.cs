using Backend.Application.Interfaces.WizardService;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Domain.Entities.Wizard;

namespace Backend.Application.Services.WizardService
{
    public class WizardService : IWizardService
    {
        private readonly IWizardSqlProvider _wizardProvider;
        private readonly ILogger<WizardService> _logger;

        public WizardService(IWizardSqlProvider wizardProvider, ILogger<WizardService> logger)
        {
            _wizardProvider = wizardProvider;
            logger = _logger;
        }
        public async Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(string email)
        {
            Guid wizardSessionId = await _wizardProvider.WizardSqlExecutor.CreateWizardAsync(email);
            if (wizardSessionId == Guid.Empty)
            {
                return (false, wizardSessionId, "Failed to create wizard session.");
            }
            return (true, wizardSessionId, "Wizard session created successfully.");
        }

        public async Task<Guid> UserHasWizardSessionAsync(string email)
            => (await _wizardProvider.WizardSqlExecutor.GetWizardSessionIdAsync(email)) ?? Guid.Empty;
    }
}
