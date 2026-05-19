using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using FluentAssertions;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

/// <summary>
/// Locks the JSON wire contract for the PATCH savings-goal request.
///
/// Reproduces the controller pipeline's serializer options (camelCase
/// naming + enum-as-string) so a payload that the frontend actually sends
/// from /dashboard/savings cannot silently lose its target date.
///
/// If the running backend ever fails to bind `"targetDate": "yyyy-MM-dd"`
/// to <see cref="PatchBudgetMonthSavingsGoalRequestDto.TargetDate"/>, this
/// test fails immediately — no need to chase the symptom through the
/// handler.
/// </summary>
public sealed class PatchBudgetMonthSavingsGoalRequestDtoBindingTests
{
    private static JsonSerializerOptions ControllerOptions() => new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    [Fact]
    public void Binds_user_repro_payload_with_target_date_and_scope()
    {
        // The exact payload the user observed leaving the FE network panel.
        const string json = """
            {
              "monthlyContribution": 2339,
              "targetDate": "2026-12-01",
              "scope": "currentMonthAndBudgetPlan"
            }
            """;

        var dto = JsonSerializer.Deserialize<PatchBudgetMonthSavingsGoalRequestDto>(
            json,
            ControllerOptions());

        dto.Should().NotBeNull();
        dto!.MonthlyContribution.Should().Be(2339m);
        dto.TargetDate.Should().NotBeNull();
        dto.TargetDate!.Value.Should().Be(new DateOnly(2026, 12, 1));
        dto.Scope.Should().Be("currentMonthAndBudgetPlan");
    }

    [Fact]
    public void TargetDate_is_null_when_absent_from_payload()
    {
        const string json = """
            {
              "monthlyContribution": 2100,
              "scope": "currentMonthOnly"
            }
            """;

        var dto = JsonSerializer.Deserialize<PatchBudgetMonthSavingsGoalRequestDto>(
            json,
            ControllerOptions());

        dto.Should().NotBeNull();
        dto!.TargetDate.Should().BeNull();
    }

    [Fact]
    public void Round_trips_isoformat_through_camelcase_serializer()
    {
        var original = new PatchBudgetMonthSavingsGoalRequestDto(
            MonthlyContribution: 1800m,
            TargetDate: new DateOnly(2027, 9, 30),
            Scope: "currentMonthAndBudgetPlan");

        var json = JsonSerializer.Serialize(original, ControllerOptions());

        // The on-the-wire JSON must use camelCase keys and the ISO date format
        // the FE consumes. Anything else means we'd break clients.
        json.Should().Contain("\"monthlyContribution\":1800");
        json.Should().Contain("\"targetDate\":\"2027-09-30\"");
        json.Should().Contain("\"scope\":\"currentMonthAndBudgetPlan\"");

        var rehydrated = JsonSerializer.Deserialize<PatchBudgetMonthSavingsGoalRequestDto>(
            json,
            ControllerOptions());

        rehydrated.Should().BeEquivalentTo(original);
    }
}
