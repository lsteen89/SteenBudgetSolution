using Backend.Application.Models.Wizard;
using Backend.Domain.Shared;
using FluentValidation;
using System.Text.Json;
using Backend.Common.Utilities;


namespace Backend.Application.Features.Wizard.SaveStep;

public sealed class DebtsStepValidator : IWizardStepValidator
{
    public int StepNumber => 4;

    private readonly IValidator<DebtsFormValues> _validator;

    public DebtsStepValidator(IValidator<DebtsFormValues> validator)
        => _validator = validator;

    public Result<string> ValidateAndSerialize(object stepData)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<DebtsFormValues>(stepData.ToString()!, JsonHelper.Camel);


            if (dto is null)
            {
                return Result<string>.Failure(new Error("Validation.Failed", "Step data cannot be null."));
            }

            _validator.ValidateAndThrow(dto);

            // Re-serialize normalized, camel-cased data as the value to persist
            var json = JsonHelper.SerializeSparse(dto);
            return Result<string>.Success(json);
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
