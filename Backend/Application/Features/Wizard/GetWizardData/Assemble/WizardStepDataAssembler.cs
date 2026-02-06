using Backend.Domain.Entities.Wizard;
using System.Buffers;
using System.Text.Json;
using Backend.Common.Utilities;
using Backend.Application.Features.Wizard.GetWizardData.Abstractions;

namespace Backend.Application.Features.Wizard.GetWizardData.Assemble;

public sealed class WizardStepDataAssembler : IWizardStepDataAssembler
{
    public T? AssembleSingle<T>(IEnumerable<WizardStepRowEntity> rows)
    {
        var list = rows as IList<WizardStepRowEntity> ?? rows.ToList();
        if (list.Count == 0) return default;

        // pick newest deterministically
        var newest = list
            .OrderByDescending(r => r.UpdatedAt)
            .ThenByDescending(r => r.DataVersion) // optional tie-breaker
            .First();

        return JsonSerializer.Deserialize<T>(newest.StepData, JsonHelper.Camel);
    }

    public T? AssembleMulti<T>(IEnumerable<WizardStepRowEntity> rows)
    {
        var list = rows as IList<WizardStepRowEntity> ?? rows.ToList();
        if (list.Count == 0) return default;

        // Merge substeps in order. Later substeps overwrite earlier keys (desired).
        var buffer = new ArrayBufferWriter<byte>();
        using var writer = new Utf8JsonWriter(buffer);

        writer.WriteStartObject();

        foreach (var row in list.OrderBy(r => r.SubStep))
        {
            using var doc = JsonDocument.Parse(row.StepData);

            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                throw new JsonException("StepData root must be a JSON object.");

            foreach (var property in doc.RootElement.EnumerateObject())
                property.WriteTo(writer);
        }

        writer.WriteEndObject();
        writer.Flush();

        return JsonSerializer.Deserialize<T>(buffer.WrittenSpan, JsonHelper.Camel);
    }
}
