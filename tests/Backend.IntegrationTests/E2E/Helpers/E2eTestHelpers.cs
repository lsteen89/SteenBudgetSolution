using System.Text.RegularExpressions;

namespace Backend.IntegrationTests.E2E.Helpers;

public static class E2eTestHelpers
{
    public static string Extract6DigitCode(string html)
    {
        var m = Regex.Match(
            html,
            @"data-test-id=""verification-code""[^>]*>\s*(\d{6})\s*<",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);

        if (!m.Success)
            throw new Exception($"No 6-digit verification code found in email body.\nHTML:\n{html}");

        return m.Groups[1].Value;
    }
}