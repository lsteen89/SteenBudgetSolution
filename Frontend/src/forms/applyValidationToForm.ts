import type { FieldError, FieldValues, UseFormSetError } from 'react-hook-form';
import type { ValidationDetail } from '@/api/Auth/error';
import { resolveRHFPathFromLabel } from '@/api/Auth/error';

/**
 * Maps BE validation details to RHF errors. Works with arrays/sections.
 */
export function applyValidationToForm<TFieldValues extends FieldValues>(
    setError: UseFormSetError<TFieldValues>,
    details: ValidationDetail[],
    fallbackFieldPath?: string
) {
    if (!details?.length) {
        if (fallbackFieldPath) {
            setError(fallbackFieldPath as any, {
                type: 'server',
                message: 'Ogiltiga fält.',
            } as FieldError);
        }
        return;
    }

    for (const d of details) {
        const { path } = resolveRHFPathFromLabel(d.field);
        const finalPath =
            (path === 'form' || !path) && fallbackFieldPath ? fallbackFieldPath : path;

        setError(finalPath as any, {
            type: 'server',
            message: d.message,
        } as FieldError);
    }
}
