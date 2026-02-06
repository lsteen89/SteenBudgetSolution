import * as yup from "yup";

const svMoneyNullable = yup
  .number()
  .nullable()
  .transform((val, originalValue) => {
    // Treat "" as null (important for inputs)
    if (originalValue === "" || originalValue === undefined) return null;
    return Number.isNaN(val) ? null : val;
  });

const nameNullable = yup
  .string()
  .transform((v) => (typeof v === "string" ? v.trim() : v))
  .nullable()
  .transform((v) => (v === "" ? null : v));

export const subscriptionItemSchema = yup
  .object({
    id: yup.string().optional(),
    name: nameNullable,
    cost: svMoneyNullable,
  })
  .test(
    "empty-or-valid",
    "Fyll i både namn (minst 2 tecken) och belopp (> 0 kr), eller lämna raden tom.",
    function (value) {
      const name = value?.name ?? null;
      const cost = value?.cost ?? null;

      const hasName = !!name;
      const hasCost = cost !== null;

      // 1) Empty row is OK
      if (!hasName && !hasCost) return true;

      // 2) If cost entered -> must be > 0
      if (hasCost && Number(cost) <= 0) {
        return this.createError({
          path: `${this.path}.cost`,
          message: "Beloppet måste vara > 0 kr.",
        });
      }

      // 3) If name entered -> must be at least 2 chars
      if (hasName && String(name).length < 2) {
        return this.createError({
          path: `${this.path}.name`,
          message: "Minst 2 tecken.",
        });
      }

      // 4) Require both once user started
      if (hasName && !hasCost) {
        return this.createError({
          path: `${this.path}.cost`,
          message: "Ange ett belopp (> 0 kr).",
        });
      }
      if (hasCost && !hasName) {
        return this.createError({
          path: `${this.path}.name`,
          message: "Ange ett namn.",
        });
      }

      return true;
    }
  );
export const subscriptionsSchema = yup.object({
  netflix: svMoneyNullable,
  spotify: svMoneyNullable,
  hbomax: svMoneyNullable,
  viaplay: svMoneyNullable,
  disneyPlus: svMoneyNullable,
  customSubscriptions: yup.array(subscriptionItemSchema).ensure(),
});