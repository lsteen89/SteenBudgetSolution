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
            // 1. Deserialize to a nullable type
            var dto = JsonSerializer.Deserialize<IncomeFormValues>(stepData.ToString()!, JsonHelper.Camel);

            // 2. Explicitly handle the null case
            if (dto is null)
            {
                return Result.Failure<string>(new Error("Validation.Failed", "Step data cannot be null."));
            }

            // 3. From this point on, the compiler knows 'dto' is not null.
            //    The warning will now be gone.
            _validator.ValidateAndThrow(dto);
            
            return JsonSerializer.Serialize(dto, JsonHelper.Camel);
        }
        catch (ValidationException ex) 
        { 
            return Result.Failure<string>(new Error("Validation.Failed", ex.Message)); 
        }
        catch (Exception ex) 
        { 
            return Result.Failure<string>(new Error("Serialization.Failed", ex.Message)); 
        }
    }
}