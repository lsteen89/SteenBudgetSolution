using System.ComponentModel.DataAnnotations;

namespace Backend.Application.Options.URL;

public sealed class AppUrls
{
    [Required, Url] public string VerifyUrl { get; init; } = ""; // e.g. https://app.ebudget.se/verify
}