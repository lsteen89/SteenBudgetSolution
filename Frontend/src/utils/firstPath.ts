import { FieldErrors } from "react-hook-form";

export const firstPath = (errs: FieldErrors, prefix = ""): string | null => {
  if (!errs) return null;

  // dive first, fall back to this obj's .message
  const keys = Object.keys(errs).filter(
    k => k !== "message" && k !== "root" && k !== "type" && k !== "ref"
  );
  for (const key of keys) {
    const val  = (errs as any)[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const deep = firstPath(val[i] as FieldErrors, `${path}.${i}`);
        if (deep) return deep;
      }
    } else if (val && typeof val === "object") {
      const deep = firstPath(val as FieldErrors, path);
      if (deep) return deep;
    }
  }
  return (errs as any).message ? prefix || null : null;
};
