"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  formatNumericInputValue,
  reconcileNumericInputValue,
} from "@/lib/numeric-input";

type NumericInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value"
> & {
  value: number;
};

export function NumericInput({
  value,
  onChange,
  onFocus,
  ...props
}: NumericInputProps) {
  const [text, setText] = React.useState(() =>
    formatNumericInputValue(value),
  );

  React.useEffect(() => {
    setText((current) => reconcileNumericInputValue(current, value));
  }, [value]);

  return (
    <Input
      {...props}
      type="number"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange?.(event);
      }}
      onFocus={(event) => {
        if (!event.currentTarget.readOnly) event.currentTarget.select();
        onFocus?.(event);
      }}
    />
  );
}
