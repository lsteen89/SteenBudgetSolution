import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import { cn } from "@/lib/utils";
import { sanitizeMoneyInput } from "@/utils/money/moneyInput";
import * as React from "react";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "onChange"
> & {
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, onChange, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn("text-right font-semibold tabular-nums", className)}
        onChange={(event) => {
          event.target.value = sanitizeMoneyInput(event.target.value);
          onChange?.(event);
        }}
        {...props}
      />
    );
  },
);

MoneyInput.displayName = "MoneyInput";

export default MoneyInput;
