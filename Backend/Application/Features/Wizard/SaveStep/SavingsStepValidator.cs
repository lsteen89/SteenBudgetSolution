using Backend.Application.Models.Wizard;
using Backend.Domain.Shared;
using FluentValidation;
using System.Text.Json;
using Backend.Common.Utilities;

namespace Backend.Application.Features.Wizard.SaveStep;
public class SavingsStepValidator : IWizardStepValidator
{
    public int StepNumber => 3;
    private readonly IValidator<SavingsFormValues> _validator;

    public SavingsStepValidator(IValidator<SavingsFormValues> validator) => _validator = validator;

    public Result<string> ValidateAndSerialize(object stepData)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<SavingsFormValues>(stepData.ToString()!, JsonHelper.Camel);
            // Explicitly handle the null case
            if (dto is null)
            {
                return Result.Failure<string>(new Error("Validation.Failed", "Step data cannot be null."));
            }
            _validator.ValidateAndThrow(dto);
            return JsonSerializer.Serialize(dto, JsonHelper.Camel);
        }
        catch (ValidationException ex) { return Result.Failure<string>(new Error("Validation.Failed", ex.Message)); }
        catch (Exception ex) { return Result.Failure<string>(new Error("Serialization.Failed", ex.Message)); }
    }
}