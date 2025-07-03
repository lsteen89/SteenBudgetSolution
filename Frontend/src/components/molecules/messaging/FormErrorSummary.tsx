import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { FieldErrors, FieldError } from "react-hook-form";

// Define the props the component will accept
interface FormErrorSummaryProps {
  errors: FieldErrors;
  // 'name' will be the key of the field array in the form, e.g., "goals"
  name: string;
}

const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({ errors, name }) => {
  const raw = errors[name];

  // 1) Array-level “root” error (e.g. min length)
  const rootMsg =
    raw && !Array.isArray(raw) && typeof raw === 'object' && 'message' in raw
      ? (raw as FieldError).message
      : null;

  // 2) Item-level errors inside an array
  const itemErrors = Array.isArray(raw) ? raw : [];

  if (!rootMsg && itemErrors.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-lg border border-red-500/50 bg-red-500/10 p-4"
      >
        <div className="flex items-center">
          <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0 text-red-700" />
          <h4 className="font-bold text-red-700">Vänligen åtgärda felen nedan</h4>
        </div>

        <ul className="mt-3 list-disc list-inside space-y-1 pl-8 text-sm text-red-600/90">
          {/* Root array error */}
          {rootMsg && <li>{rootMsg}</li>}

          {/* Item-level errors */}
          {itemErrors.map((err, idx) =>
            Object.values(err ?? {}).map(
              (e) =>
                e &&
                typeof e === 'object' &&
                'message' in e && (
                  <li key={`${idx}-${(e as FieldError).message}`}>
                    {(e as FieldError).message}
                  </li>
                )
            )
          )}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
};

export default FormErrorSummary;