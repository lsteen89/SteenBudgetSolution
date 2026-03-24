using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

using Backend.Infrastructure.Repositories.User;

using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Application.Features.Wizard.Finalization;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using Backend.Application.Features.Wizard.Finalization.Targets;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Infrastructure.Data.Repositories;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Core;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Settings;
using Backend.Application.Features.Wizard.Finalization.Orchestration;
using Backend.Application.Features.Wizard.FinalizationPreview.Mapper;
using Backend.Application.Features.Wizard.FinalizationPreview;
using Backend.Domain.Abstractions;
using Backend.IntegrationTests.Shared.Wizard;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class WizardPreviewTest
{
    private readonly MariaDbFixture _db;
    public WizardPreviewTest(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs, DefaultCommandTimeoutSeconds = 30 });

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTimeOffset utcNow) => UtcNow = utcNow.UtcDateTime;
        public DateTime UtcNow { get; }
    }
    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid Persoid { get; init; }
        public string UserName { get; init; } = "";
    }

    [Fact]
    public async Task Preview_matches_live_dashboard_for_open_month_after_finalize()
    {
        await _db.ResetAsync();

        // Arrange: categories + user + wizard session/steps
        await DbSeeds.SeedDefaultExpenseCategoriesAsync(_db.ConnectionString);


        var persoid = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        // Replace old UserSeeds/WizardSeeds with your real current seed helpers.
        // If WizardSeeds still exists, keep it. Otherwise create a new WizardDsl for step rows.
        await UserTestSeeds.SeedUserAsync(_db.ConnectionString, persoid); // If this does not exist, use DbSeeds.InsertUserAsync variant you own.
        await WizardSeeds.SeedSessionAsync(_db.ConnectionString, sessionId, persoid);
        await WizardSeeds.SeedIncomeAndExpenditureAsync(_db.ConnectionString, sessionId);

        await WizardSeeds.SeedSavingsAsync(_db.ConnectionString, sessionId);
        await WizardSeeds.SeedDebtsAsync(_db.ConnectionString, sessionId);


        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var currentUser = new TestCurrentUserContext { Persoid = persoid };
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        // real repos
        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts, time);
        var incomeRepo = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser, dbOpts);
        var expRepo = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser, dbOpts);
        var budgetRepo = new BudgetRepository(uow, NullLogger<BudgetRepository>.Instance, currentUser, dbOpts);
        var debtRepo = new DebtsRepository(uow, NullLogger<DebtsRepository>.Instance, currentUser, dbOpts);
        var savingsRepo = new SavingsRepository(uow, NullLogger<SavingsRepository>.Instance, currentUser, dbOpts);

        // new processors: only logger, they apply to target
        var processors = new IWizardStepProcessor[]
        {
            new IncomeStepProcessor(NullLogger<IncomeStepProcessor>.Instance),
            new ExpenseStepProcessor(NullLogger<ExpenseStepProcessor>.Instance),
            new SavingsStepProcessor(NullLogger<SavingsStepProcessor>.Instance),
            new DebtStepProcessor(NullLogger<DebtStepProcessor>.Instance),
        };


        var wizardRepo = new WizardRepository(uow, NullLogger<WizardRepository>.Instance, dbOpts);
        IWizardStepOrchestrator orchestrator = new WizardStepOrchestrator(wizardRepo, processors);
        // preview pipeline
        var previewBuilder = new WizardPreviewReadModelBuilder(time);
        var debtCalc = new DebtPaymentCalculator();
        var projector = new BudgetDashboardProjector(debtCalc);
        var userRepo = new UserRepository(uow, NullLogger<UserRepository>.Instance, dbOpts);
        var previewHandler = new GetWizardFinalizationPreviewQueryHandler(orchestrator, previewBuilder, projector);

        // ACT 1: preview
        var previewRes = await previewHandler.Handle(new GetWizardFinalizationPreviewQuery(sessionId), CancellationToken.None);
        previewRes.IsSuccess.Should().BeTrue();
        previewRes.Value.Should().NotBeNull();
        var preview = previewRes.Value!;

        // ACT 2: finalize
        var userRepoMock = new Mock<IUserRepository>();
        userRepoMock.Setup(x => x.SetFirstTimeLoginAsync(persoid, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(true);

        var targetFactory = new FinalizeBudgetTargetFactory(
            incomeRepository: incomeRepo,
            expenditureRepository: expRepo,
            savingsRepository: savingsRepo,
            debtsRepository: debtRepo,
            budgetRepository: budgetRepo);

        var finalizeHandler = new FinalizeWizardCommandHandler(
            wizardRepository: wizardRepo,
            budgetRepository: budgetRepo,
            userRepository: userRepoMock.Object,
            orchestrator: orchestrator,
            targetFactory: targetFactory,
            logger: NullLogger<FinalizeWizardCommandHandler>.Instance);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var fin = await finalizeHandler.Handle(new FinalizeWizardCommand(sessionId, persoid), CancellationToken.None);
        fin.IsSuccess.Should().BeTrue();
        await uow.CommitAsync(CancellationToken.None);



        // Ensure open month exists (valid constraint: mode "none" => amount NULL)
        var fixedNow = new DateTimeOffset(2026, 01, 11, 12, 0, 0, TimeSpan.Zero);
        var ym = YearMonthUtil.CurrentYearMonth(fixedNow.UtcDateTime);

        await BudgetMonthSeeds.SeedOpenMonthAsync(
            cs: _db.ConnectionString,
            budgetId: fin.Value,
            yearMonth: ym,
            carryOverMode: "none",
            carryOverAmount: null,
            createdByUserId: persoid);

        // ACT 3: live dashboard
        ITimeProvider clock = new FakeTimeProvider(fixedNow);
        var monthHandler = new GetBudgetDashboardMonthQueryHandler(
            monthsRepo,
            dashRepo,
            userRepo,
            projector,
            clock);

        var monthRes = await monthHandler.Handle(new GetBudgetDashboardMonthQuery(persoid, ym), CancellationToken.None);
        monthRes.IsSuccess.Should().BeTrue();
        var live = monthRes.Value!.LiveDashboard!;

        // ASSERT: parity (ignore ids)
        preview.Income.TotalIncomeMonthly.Should().Be(live.Income.TotalIncomeMonthly);
        preview.Expenditure.TotalExpensesMonthly.Should().Be(live.Expenditure.TotalExpensesMonthly);
        preview.Subscriptions.TotalMonthlyAmount.Should().Be(live.Subscriptions.TotalMonthlyAmount);
        preview.Debt.TotalMonthlyPayments.Should().Be(live.Debt.TotalMonthlyPayments);
        preview.FinalBalanceWithCarryMonthly.Should().Be(live.FinalBalanceWithCarryMonthly);
        preview.Savings.Should().NotBeNull();
        live.Savings.Should().NotBeNull();

        preview.Savings!.Goals.Select(g => g.MonthlyContribution)
            .Should().BeEquivalentTo(live.Savings!.Goals.Select(g => g.MonthlyContribution));

        var previewTotalSavings =
            preview.Savings.MonthlySavings + preview.Savings.Goals.Sum(g => g.MonthlyContribution);

        var liveTotalSavings =
            live.Savings.MonthlySavings + live.Savings.Goals.Sum(g => g.MonthlyContribution);

        previewTotalSavings.Should().Be(liveTotalSavings);

        preview.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be(preview.Income.TotalIncomeMonthly - preview.Expenditure.TotalExpensesMonthly - previewTotalSavings + preview.CarryOverAmountMonthly);

        preview.Expenditure.ByCategory
            .Select(x => (x.CategoryName, x.TotalMonthlyAmount))
            .Should().BeEquivalentTo(
                live.Expenditure.ByCategory.Select(x => (x.CategoryName, x.TotalMonthlyAmount)));
    }
}
