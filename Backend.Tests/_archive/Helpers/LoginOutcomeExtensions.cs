using Backend.Application.Common.Security;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Tests.Helpers;

public static class LoginOutcomeExtensions
{
    /// <summary>
    ///  Fails the test if the outcome is not <see cref="LoginOutcome.Success"/>
    ///  and returns the strongly-typed record so you can grab tokens in one line.
    /// </summary>
    public static LoginOutcome.Success ShouldBeSuccess(this LoginOutcome outcome)
        => Assert.IsType<LoginOutcome.Success>(outcome);

    public static LoginOutcome.Fail ShouldBeFail(this LoginOutcome outcome)
        => Assert.IsType<LoginOutcome.Fail>(outcome);
}