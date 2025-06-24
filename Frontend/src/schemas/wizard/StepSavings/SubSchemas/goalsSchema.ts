import * as yup from 'yup';


const today = new Date();
today.setHours(0, 0, 0, 0);

const maxYearsInFuture = 40; 
const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + maxYearsInFuture);

export const goalItemSchema = yup.object({
  id: yup.string().optional(),
  name: yup.string().trim().required('Ange ett namn på målet.'),
  targetAmount: yup
    .number()
    .typeError('Ange ett giltigt belopp.')
    .nullable()
    .required('Ange målbelopp.')
    .min(1, 'Beloppet måste vara > 0 kr.'),
  
  targetDate: yup
    .date() 
    .transform((value, originalValue) => {
       
        return originalValue === "" ? null : value;
    })
    .typeError('Välj ett giltigt datum.') 
    .required('Ange ett måldatum.')
    .min(today, 'Måldatumet kan inte vara i dåtiden.')
    .max(maxDate, `Målet kan inte vara mer än ${maxYearsInFuture} år framåt i tiden.`),
    

  amountSaved: yup
    .number()
    .typeError('Ange ett giltigt belopp.')
    .nullable()
    .min(0, 'Beloppet måste vara >= 0 kr.'),
});


export const goalsSchema = yup.array(goalItemSchema).nullable();
export type GoalItem = yup.InferType<typeof goalItemSchema>;
