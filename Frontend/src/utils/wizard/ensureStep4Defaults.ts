import { Step4FormValues } from '@/types/Wizard/Step4FormValues';

export function ensureStep4Defaults(src: Partial<Step4FormValues> | undefined): Step4FormValues {
  return {
    intro: {
      hasDebts: src?.intro?.hasDebts ?? null,
    },
    info: {
      notes: src?.info?.notes ?? '',
    },
    debts: (src?.debts || []).map(d => ({
      id: d?.id ?? crypto.randomUUID(),
      name: d?.name ?? '',
      amount: d?.amount ?? null,
    })),
  } as Step4FormValues;
}
