using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Mappings.Budget;
using Backend.Domain.Entities.Budget.Savings;
using FluentAssertions;

namespace Backend.UnitTests.Mappings;

// Regression: the wizard collects habit answers (auto/manual/invest/preferNot)
// under `SavingMethods`, but those are NOT plan-level storage vehicles. The
// SavingsMethod table holds savings_account/isk/funds/cash/custom and is
// owned by the savings editor — never by the wizard finalize path.
//
// These tests pin the contract: SavingsMapping must accept the wizard's
// historic field shape (so JSON keeps deserializing) without persisting any
// SavingsMethod rows from those values. If someone reintroduces the old
// mapping, both tests turn red immediately — long before the data hits prod.
public sealed class SavingsMappingHabitDropTests
{
    private static readonly Guid BudgetId = Guid.NewGuid();

    [Fact]
    public void ToDomain_WithWizardHabitMethods_DoesNotProduceAnySavingsMethodRows()
    {
        var dto = new SavingsData
        {
            Habits = new SavingHabitsDto
            {
                MonthlySavings = 2_000m,
                SavingMethods = new[] { "auto", "manual", "invest", "preferNot" },
            },
        };

        var savings = dto.ToDomain(BudgetId);

        savings.MonthlySavings.Should().Be(2_000m);
        savings.SavingMethods.Should().BeEmpty(
            "wizard habit answers must not be written to SavingsMethod — that table holds storage vehicles only");
    }

    [Fact]
    public void ApplyPatchFrom_WithWizardHabitMethods_DoesNotPopulateSavingsMethodRows()
    {
        var savings = new Savings { BudgetId = BudgetId };
        var dto = new SavingsData
        {
            Habits = new SavingHabitsDto
            {
                MonthlySavings = 1_500m,
                SavingMethods = new[] { "auto", "manual" },
            },
        };

        savings.ApplyPatchFrom(dto);

        savings.MonthlySavings.Should().Be(1_500m);
        savings.SavingMethods.Should().BeEmpty();
    }
}
