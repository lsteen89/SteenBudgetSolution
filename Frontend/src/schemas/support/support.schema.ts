import {
  supportCategoryValues,
  type SupportCategory,
} from "@/Pages/private/support/support.types";
import { supportDict } from "@/utils/i18n/pages/private/support/support.i18n";
import * as yup from "yup";

type SupportKey = keyof typeof supportDict.sv;

export function buildContactSupportSchema(t: (k: SupportKey) => string) {
  return yup.object({
    category: yup
      .string()
      .trim()
      .required(t("valCategoryRequired"))
      .test(
        "valid-category",
        t("valCategoryRequired"),
        (value) =>
          !!value && supportCategoryValues.includes(value as SupportCategory),
      ),
    subject: yup
      .string()
      .trim()
      .required(t("valSubjectRequired"))
      .max(120, t("valSubjectTooLong")),
    body: yup
      .string()
      .trim()
      .required(t("valBodyRequired"))
      .min(10, t("valBodyTooShort"))
      .max(4000, t("valBodyTooLong")),
  });
}
