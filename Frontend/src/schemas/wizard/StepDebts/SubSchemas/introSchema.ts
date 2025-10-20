import * as yup from 'yup';
export const debtsIntroSchema = yup.object({

  hasDebts: yup
    .boolean()
    .nullable()
    .required('Välj ett alternativ'),

});