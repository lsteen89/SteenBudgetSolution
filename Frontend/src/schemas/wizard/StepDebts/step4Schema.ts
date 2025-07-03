import * as yup from "yup";
import { debtsIntroSchema }  from "./SubSchemas/introSchema";
import { debtsInfoSchema }   from "./SubSchemas/infoSchema";
import { debtsArraySchema }  from "./SubSchemas/debtsArraySchema";

export const step4Schema = yup.object({
  intro: debtsIntroSchema.optional(),
  info : debtsInfoSchema.optional(),
  debts: debtsArraySchema,
});

export type Step4FormValues = yup.InferType<typeof step4Schema>;