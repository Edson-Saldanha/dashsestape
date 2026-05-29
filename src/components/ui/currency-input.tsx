import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | string | null | undefined;
  onValueChange: (value: number) => void;
  currency?: string;
}

/**
 * Currency input with live BRL formatting.
 * Stores numeric value via onValueChange (e.g. 1234.56) and displays "R$ 1.234,56".
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, currency = "BRL", className, ...props }, ref) => {
    const format = (cents: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);

    const toCents = (v: number | string | null | undefined): number => {
      if (v === null || v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      if (!isFinite(n)) return 0;
      return Math.round(n * 100);
    };

    const initialCents = toCents(value);
    const [display, setDisplay] = React.useState<string>(() =>
      initialCents === 0 ? "" : format(initialCents),
    );

    React.useEffect(() => {
      const cents = toCents(value);
      setDisplay(cents === 0 ? "" : format(cents));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D+/g, "");
      const cents = digits ? parseInt(digits, 10) : 0;
      setDisplay(cents === 0 ? "" : format(cents));
      onValueChange(cents / 100);
    };

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={props.placeholder ?? "R$ 0,00"}
        className={cn(className)}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";