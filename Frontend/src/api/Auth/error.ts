import { isAxiosError, AxiosError } from 'axios';
import { VALIDATION_FIELD_MAP } from '@api/validationFieldMap';

export type ValidationDetail = { field: string; message: string; severity?: string };

// Accepts "DebtName[2]" and maps using VALIDATION_FIELD_MAP
export function resolveRHFPathFromLabel(label: string): { path: string; index?: number } {
    // Extract optional index suffix: Label[3]
    const m = /^([^\[]+)(?:\[(\d+)\])?$/.exec(label.trim());
    const beKey = (m && m[1]) ? m[1] : label.trim();
    const index = (m && m[2]) ? Number(m[2]) : undefined;

    const mapped = VALIDATION_FIELD_MAP[beKey] ?? beKey; // fallback: use as-is

    // If mapped contains "[]", replace with ".{index}" when index exists
    if (mapped.includes('[]')) {
        if (typeof index === 'number') {
            return { path: mapped.replace('[]', `.${index}`), index };
        }
        // No index → array-level field (e.g., "debts")
        return { path: mapped.replace('.[]', ''), index: undefined };
    }

    return { path: mapped, index };
}

/** Existing */
export function getApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
    if (isAxiosError(err)) {
        const env = err.response?.data as any;
        return env?.error?.message ?? err.message ?? fallback;
    }
    return fallback;
}

// Your previous regex parser; augment to emit labels with optional indices
export function parseValidationDetails(raw?: string): ValidationDetail[] {
    if (!raw) return [];
    const details: ValidationDetail[] = [];
    const lines = raw.split('\n').map(s => s.trim());

    // Supports:
    // -- DebtName[2]: Message. Severity: Error
    // -- Debts: Message. Severity: Error
    const rx = /^--\s*(.+?):\s*(.+?)(?:\.)?\s*Severity:\s*(\w+)/;

    for (const line of lines) {
        const m = rx.exec(line);
        if (!m) continue;
        const [, label, msg, severity] = m;
        details.push({ field: label.trim(), message: msg.trim(), severity });
    }
    return details;
}

export function isValidationFailed(err: unknown): err is AxiosError & { errorCode?: string; validationDetails?: ValidationDetail[] } {
    return isAxiosError(err) && (err as any)?.errorCode === 'Validation.Failed';
}
