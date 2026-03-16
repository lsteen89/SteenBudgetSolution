namespace Backend.Application.Features.Support.Contact.Composer;

public static class SupportMessageEmailComposer
{
    public static string ComposeHtml(
        string firstName,
        string lastName,
        string email,
        string subject,
        string body,
        string? category,
        string? ipAddress,
        string? userAgent,
        string userId)
    {
        var safeBody = System.Net.WebUtility.HtmlEncode(body)
            .Replace("\n", "<br />");

        var safeSubject = System.Net.WebUtility.HtmlEncode(subject);
        var safeCategory = System.Net.WebUtility.HtmlEncode(category ?? "General");
        var safeName = System.Net.WebUtility.HtmlEncode($"{firstName} {lastName}".Trim());
        var safeEmail = System.Net.WebUtility.HtmlEncode(email);
        var safeIp = System.Net.WebUtility.HtmlEncode(ipAddress ?? "unknown");
        var safeUa = System.Net.WebUtility.HtmlEncode(userAgent ?? "unknown");
        var safeUserId = System.Net.WebUtility.HtmlEncode(userId);

        return $"""
        <h2>New support message</h2>
        <p><strong>User:</strong> {safeName}</p>
        <p><strong>Email:</strong> {safeEmail}</p>
        <p><strong>User ID:</strong> {safeUserId}</p>
        <p><strong>Category:</strong> {safeCategory}</p>
        <p><strong>Subject:</strong> {safeSubject}</p>
        <hr />
        <p>{safeBody}</p>
        <hr />
        <p><strong>IP:</strong> {safeIp}</p>
        <p><strong>User-Agent:</strong> {safeUa}</p>
        """;
    }
}