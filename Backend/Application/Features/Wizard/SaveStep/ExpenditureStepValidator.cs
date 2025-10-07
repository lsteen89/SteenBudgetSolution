using Backend.Application.Models.Wizard;
using Backend.Domain.Shared;
using FluentValidation;
using System.Text.Json;
using Backend.Common.Utilities;

namespace Backend.Application.Features.Wizard.SaveStep;

public class ExpenditureStepValidator : IWizardStepValidator
{
    public int StepNumber => 2;
    private readonly IValidator<ExpenditureFormValues> _validator;

    public ExpenditureStepValidator(IValidator<ExpenditureFormValues> validator) => _validator = validator;

    public Result<string> ValidateAndSerialize(object stepData)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<ExpenditureFormValues>(stepData.ToString()!, JsonHelper.Camel);

            if (dto is null)
            {
                return Result<string>.Failure(new Error("Validation.Failed", "Step data cannot be null."));
            }

            _validator.ValidateAndThrow(dto);
            // Use sparse serialization to omit nulls
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