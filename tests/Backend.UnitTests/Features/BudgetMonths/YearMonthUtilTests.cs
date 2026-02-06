using System;
using System.Linq;
using Backend.Application.Features.Budgets.Months.Helpers;
using FluentAssertions;
using Xunit;

namespace Backend.UnitTests.Features.BudgetMonths;

public sealed class YearMonthUtilTests
{
    [Theory]
    [InlineData("2026-01")]
    [InlineData("1999-12")]
    public void TryParse_Valid_ReturnsTrue(string ym)
    {
        var ok = YearMonthUtil.TryParse(ym, out var year, out var month);

        ok.Should().BeTrue();
        year.Should().Be(int.Parse(ym[..4]));
        month.Should().Be(int.Parse(ym[5..7]));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2026")]
    [InlineData("2026-1")]     // not allowed by your strict TryParse
    [InlineData("2026-001")]
    [InlineData("abcd-ef")]
    [InlineData("2026-00")]
    [InlineData("2026-13")]
    [InlineData("2026/01")]
    public void TryParse_Invalid_ReturnsFalse(string? ym)
    {
        var ok = YearMonthUtil.TryParse(ym, out _, out _);
        ok.Should().BeFalse();
    }

    [Fact]
    public void Normalize_Valid_ReturnsCanonical()
    {
        YearMonthUtil.Normalize("2026-01").Should().Be("2026-01");
    }

    [Fact]
    public void Normalize_Invalid_Throws()
    {
        Action act = () => YearMonthUtil.Normalize("2026-1");
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("2026-01", "2026-01", 0)]
    [InlineData("2025-12", "2026-01", 1)]
    [InlineData("2025-10", "2026-01", 3)]
    [InlineData("2026-01", "2025-12", -1)]
    [InlineData("2024-01", "2026-01", 24)]
    public void MonthsBetween_Works(string fromYm, string toYm, int expected)
    {
        YearMonthUtil.MonthsBetween(fromYm, toYm).Should().Be(expected);
    }

    [Fact]
    public void IntermediateMonths_ExcludesEndpoints()
    {
        var list = YearMonthUtil.IntermediateMonths("2025-10", "2026-01").ToList();
        list.Should().Equal(new[] { "2025-11", "2025-12" });
    }

    [Fact]
    public void IntermediateMonths_WhenAdjacent_ReturnsEmpty()
    {
        var list = YearMonthUtil.IntermediateMonths("2025-12", "2026-01").ToList();
        list.Should().BeEmpty();
    }
}
