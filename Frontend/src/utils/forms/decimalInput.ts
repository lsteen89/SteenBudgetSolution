import type { ChangeEvent } from "react";

export const sanitizeDecimalInput = (raw: string): string =>
    raw.replace(/[^\d.,\s]/g, "");

export const withSanitizedDecimalChange = (
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void
) => {
    return (e: ChangeEvent<HTMLInputElement>) => {
        const cleaned = sanitizeDecimalInput(e.target.value);

        // IMPORTANT: mutate event so RHF gets cleaned value
        if (cleaned !== e.target.value) {
            e.target.value = cleaned;
        }

        onChange?.(e);
    };
};
