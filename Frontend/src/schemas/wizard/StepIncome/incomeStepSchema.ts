import * as yup from 'yup';
import { Frequency, VALID_FREQUENCIES } from '@/types/common';

// Schema for an individual household member
const householdMemberSchema = yup.object().shape({
  id: yup.string().optional(),
  name: yup.string().trim().required('Ange namn på personen.'),
  income: yup
    .number()
    .typeError('Ange en giltig siffra för inkomst.')
    .nullable()
    .required('Ange nettoinkomst.')
    .min(0, 'Inkomsten kan inte vara negativ.')
    .test('is-not-zero', 'Inkomsten kan inte vara 0 om den är angiven.', (value) => value === null || value !== 0),
  frequency: yup // <--- UPDATED SECTION
    .string<Frequency>()
    .oneOf(VALID_FREQUENCIES, 'Ogiltig frekvens vald.')
    .required('Välj frekvens.'),
  yearlyIncome: yup.number().nullable().optional(),
});

// Schema for an individual side hustle
const sideHustleSchema = yup.object().shape({
  id: yup.string().optional(),
  name: yup.string().trim().required('Ange namn för sidoinkomsten.'),
  income: yup
    .number()
    .typeError('Ange en giltig siffra för inkomst.')
    .nullable()
    .required('Ange sidoinkomstens storlek.')
    .min(0, 'Inkomsten kan inte vara negativ.')
    .test('is-not-zero', 'Inkomsten kan inte vara 0 om den är angiven.', (value) => value === null || value !== 0),
  frequency: yup // <--- UPDATED SECTION
    .string<Frequency>()
    .oneOf(VALID_FREQUENCIES, 'Ogiltig frekvens vald.')
    .required('Välj sidoinkomstens frekvens.'),
  yearlyIncome: yup.number().nullable().optional(),
});

// Main schema for the entire income step

export const incomeStepSchema = yup.object({
  netSalary: yup
    .number()
    .typeError('Ange en giltig siffra för din primära inkomst.')
    .nullable()                        // 👈 nullable matches default null
    .required('Ange din primära inkomst.')
    .min(0)
    .test('not-zero', 'Inkomsten kan inte vara 0.', v => v === null || v !== 0),
  salaryFrequency : yup.string<Frequency>().oneOf(VALID_FREQUENCIES).required(),
  showSideIncome  : yup.boolean().nullable().default(null),
  showHouseholdMembers : yup.boolean().nullable().default(null),
  householdMembers : yup.array(householdMemberSchema).nullable().default(null),
  sideHustles     : yup.array(sideHustleSchema).nullable().default(null),
  yearlySalary    : yup.number().nullable(),
});

export type IncomeFormValues = yup.InferType<typeof incomeStepSchema>; 