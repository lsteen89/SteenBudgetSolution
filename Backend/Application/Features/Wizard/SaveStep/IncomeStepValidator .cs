using Backend.Application.Models.Wizard;
using Backend.Domain.Shared;
using FluentValidation;
using System.Text.Json;
using Backend.Common.Utilities;

namespace Backend.Application.Features.Wizard.SaveStep;

public class IncomeStepValidator : IWizardStepValidator
{
    public int StepNumber => 1;
    private readonly IValidator<IncomeFormValues> _validator;

    public IncomeStepValidator(IValidator<IncomeFormValues> validator)
    {
        _validator = validator;
    }
    public Result<string> ValidateAndSerialize(object stepData)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<IncomeFormValues>(stepData.ToString()!, JsonHelper.Camel);

            if (dto is null)
            {
                return Result<string>.Failure(new Error("Validation.Failed", "Step data cannot be null."));
            }

            _validator.ValidateAndThrow(dto);

            return Result<string>.Success(JsonSerializer.Serialize(dto, JsonHelper.Camel));
        }
        catch (ValidationException ex)
        {
            return Result<string>.Failure(new Error("Validation.Failed", ex.Message));
        }
        catch (Exception ex)
        {
            return Result<string>.Failure(new Error("Serialization.Failed", ex.Message));
        }
    }
}