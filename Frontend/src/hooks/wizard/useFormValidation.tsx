import { useState, useCallback, useRef, useLayoutEffect } from "react";
import _get from "lodash/get";
import _set from "lodash/set";

type ValidationResult = Record<string, string>;

export const useFormValidation = <T extends object>(
  initial: T,
  validateFn: (values: T) => ValidationResult
) => {
  /* ---------- state ---------- */
  const [values, setValues]   = useState<T>(initial);
  const [errors, setErrors]   = useState<ValidationResult>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /* ---------- refs ---------- */
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollTarget = useRef<string | null>(null);

  /* ---------- helpers ---------- */
  const register = (path: string) => ({
    id: path,
    name: path,
    ref: (el: HTMLElement | null) => {
      if (el) fieldRefs.current[path] = el;
      else delete fieldRefs.current[path];
    },
    value: _get(values, path) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues(v => {
        const clone = structuredClone(v);
        _set(clone, path, e.target.value);
        return clone;
      }),
    onBlur: () => setTouched(t => ({ ...t, [path]: true })),
  });

  /* ---------- validation ---------- */
  const validate = useCallback(() => {
    const errs = validateFn(values);
    setErrors(errs);

    const firstBad = Object.keys(errs)[0];
    if (firstBad) scrollTarget.current = firstBad;

    return !firstBad;
  }, [values, validateFn]);

  useLayoutEffect(() => {
    if (!scrollTarget.current) return;

    requestAnimationFrame(() => {
      const el = fieldRefs.current[scrollTarget.current!];
      scrollTarget.current = null;

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      }
    });
  });

  /* ---------- API ---------- */
  return {
    values,
    errors,
    touched,

    register,          // attach to every field
    validate,          // validate all
    validateField: (p: string) => {
      const msg = validateFn(values)[p];
      setErrors(e => ({ ...e, [p]: msg }));
      return msg;
    },
    markFieldTouched: (p: string) =>
      setTouched(t => ({ ...t, [p]: true })),
    removeFieldState: (p: string) => {
      setErrors(e => { const n = { ...e }; delete n[p]; return n; });
      setTouched(t => { const n = { ...t }; delete n[p]; return n; });
    },
  };
};
export default useFormValidation;
