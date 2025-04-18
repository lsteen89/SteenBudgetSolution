// schemaUtils.ts
import * as yup from 'yup';
import { rentSchema }        from './rentSchema';
import { foodSchema }        from './foodSchema';
import { utilitiesSchema }   from './utilitiesSchema';
import { ExpenditureFormValues } from
  '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/interface/ExpenditureFormValues';

const base = {
  rent:       rentSchema,
  food:       foodSchema,
  utilities:  utilitiesSchema,
};

export const getSchemaForStep = (
  currentSubStep: number,
): yup.ObjectSchema<ExpenditureFormValues> => {
  switch (currentSubStep) {
    case 2:
      return yup.object({
        ...base,
        rent:      rentSchema.required(),
        food:      foodSchema.notRequired(),
        utilities: utilitiesSchema.notRequired(),
      }) as yup.ObjectSchema<ExpenditureFormValues>;

    case 3:
      return yup.object({
        ...base,
        rent:      rentSchema.notRequired(),
        food:      foodSchema.required(),
        utilities: utilitiesSchema.notRequired(),
      }) as yup.ObjectSchema<ExpenditureFormValues>;

    case 4:
      return yup.object({
        ...base,
        rent:      rentSchema.notRequired(),
        food:      foodSchema.notRequired(),
        utilities: utilitiesSchema.required(),
      }) as yup.ObjectSchema<ExpenditureFormValues>;

    default:
      return yup.object({
        ...base,
        rent:      rentSchema.notRequired(),
        food:      foodSchema.notRequired(),
        utilities: utilitiesSchema.notRequired(),
      }) as yup.ObjectSchema<ExpenditureFormValues>;
  }
};
