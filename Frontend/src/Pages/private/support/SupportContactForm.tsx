import type { ApiProblem } from "@/api/api.types";
import { sendSupportMessage } from "@/api/Services/Mail/sendSupportMessage";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { buildContactSupportSchema } from "@/schemas/support/support.schema";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useToast } from "@/ui/toast/toast";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { yupResolver } from "@hookform/resolvers/yup";
import React from "react";
import { useForm } from "react-hook-form";

import type {
  ContactSupportFormValues,
  SupportCategory,
  SupportT,
} from "./support.types";

const defaultValues: ContactSupportFormValues = {
  category: "",
  subject: "",
  body: "",
};

type SupportContactFormProps = {
  t: SupportT;
};

type SupportCategoryOption = {
  value: SupportCategory;
  label: string;
};

const getSupportCategories = (t: SupportT): SupportCategoryOption[] => [
  { value: "budget-help", label: t("catBudgetHelp") },
  { value: "shared-budget", label: t("catSharedBudget") },
  { value: "bug-report", label: t("catBugReport") },
  { value: "other", label: t("catOther") },
];

export function SupportContactForm({ t }: SupportContactFormProps) {
  const toast = useToast();
  const locale = useAppLocale();
  const user = useAuthStore((s) => s.user);

  const schema = React.useMemo(() => buildContactSupportSchema(t), [t]);
  const categories = React.useMemo(() => getSupportCategories(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ContactSupportFormValues>({
    resolver: yupResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues,
  });

  const showErrors = submitCount > 0;
  const selectedCategory = watch("category");

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "—";
  const email = user?.email?.trim() || "";

  const selectedCategoryLabel =
    categories.find((x) => x.value === selectedCategory)?.label ??
    t("catOther");

  const onSubmit = async (data: ContactSupportFormValues) => {
    if (!user?.firstName || !user?.lastName || !user?.email) {
      toast.error("Missing account details. Please sign in again.", {
        id: "Support.MissingUser",
      });
      return;
    }

    try {
      await sendSupportMessage({
        firstName: user.firstName.trim(),
        lastName: user.lastName.trim(),
        senderEmail: user.email.trim(),
        subject: `[${selectedCategoryLabel}] ${data.subject.trim()}`,
        body: data.body.trim(),
      });

      toast.success(t("sentToast"));
      reset(defaultValues);
    } catch (err) {
      const problem = err as ApiProblem;
      toast.error(toUserMessage(problem, locale), {
        id: problem.code ?? "Support.SendFailed",
      });
    }
  };

  return (
    <>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-eb-text">
          {t("contactTitle")}
        </h2>
        <p className="mt-2 text-sm text-eb-text/65">{t("contactLead")}</p>

        <div className="mt-4 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.28)] px-4 py-3">
          <p className="text-sm text-eb-text/60">
            {t("signedInAs")}{" "}
            <span className="font-semibold text-eb-text/85">{fullName}</span>
            {email ? (
              <>
                {" · "}
                <span className="text-eb-text/70">{email}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-5"
      >
        <div className="grid gap-4">
          <FormField
            label={t("category")}
            htmlFor="category"
            error={showErrors ? errors.category?.message : undefined}
          >
            <select
              id="category"
              aria-invalid={showErrors && !!errors.category}
              {...register("category")}
              className={cn(
                "h-12 w-full rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4",
                "text-sm text-eb-text",
                "shadow-[0_8px_30px_rgb(21_39_81_/_0.06)]",
                "outline-none transition",
                "focus:border-eb-accent/40 focus:ring-2 focus:ring-eb-accent/20",
              )}
            >
              <option value="">{t("categoryPlaceholder")}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={t("subject")}
            htmlFor="subject"
            error={showErrors ? errors.subject?.message : undefined}
          >
            <TextInput
              id="subject"
              aria-invalid={showErrors && !!errors.subject}
              {...register("subject")}
            />
          </FormField>

          <FormField
            label={t("message")}
            htmlFor="body"
            error={showErrors ? errors.body?.message : undefined}
          >
            <textarea
              id="body"
              rows={7}
              aria-invalid={showErrors && !!errors.body}
              {...register("body")}
              className={cn(
                "min-h-[180px] w-full resize-y rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 py-3",
                "text-sm text-eb-text placeholder:text-eb-text/40",
                "shadow-[0_8px_30px_rgb(21_39_81_/_0.06)]",
                "outline-none transition",
                "focus:border-eb-accent/40 focus:ring-2 focus:ring-eb-accent/20",
              )}
              placeholder={t("placeholder")}
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CtaButton
            type="submit"
            disabled={isSubmitting || !user?.email}
            aria-busy={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t("sending") : t("send")}
          </CtaButton>
        </div>

        <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] px-4 py-3">
          <p className="text-sm text-eb-text/60">{t("note")}</p>
        </div>
      </form>
    </>
  );
}
