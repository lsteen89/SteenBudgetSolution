namespace Backend.Domain.Entities.Budget.Expenses;

public sealed record ExpenseCategoryDefinition
{
    public ExpenseCategoryDefinition(
        Guid id,
        string code,
        string name,
        int sortOrder,
        params string[] aliases)
    {
        Id = id;
        Code = code;
        Name = name;
        SortOrder = sortOrder;
        Aliases = aliases;
    }

    public Guid Id { get; }
    public string Code { get; }
    public string Name { get; }
    public int SortOrder { get; }
    public IReadOnlyList<string> Aliases { get; }
}
