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
  // Access the errors for the specific field array dynamically using the name prop
  const fieldArrayErrors = errors[name];

  // We only render if there are errors for this specific field array
  if (!fieldArrayErrors || !Array.isArray(fieldArrayErrors)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-lg border border-red-500/50 bg-red-500/10 p-4"
      >
        <div className="flex items-center">
          <AlertTriangle
            className="mr-3 h-5 w-5 flex-shrink-0 text-red-700"
            aria-hidden="true"
          />
          <h4 className="font-bold text-red-700">
            Vänligen åtgärda felen nedan
          </h4>
        </div>
        <ul className="mt-3 list-disc list-inside space-y-1 pl-8 text-sm text-red-600/90">
          {fieldArrayErrors.map((goalError, index) => {
            if (!goalError) return null; // Handles sparse error arrays

            // This is the type-safe way to iterate through the nested errors
            return Object.values(goalError).map((error) => {
              // We add a type guard to ensure 'error' is a FieldError object
              if (error && typeof error === 'object' && 'message' in error) {
                return (
                  <li key={`${index}-${(error as FieldError).message}`}>
                    {(error as FieldError).message}
                  </li>
                );
              }
              return null;
            });
          })}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
};

export default FormErrorSummary;