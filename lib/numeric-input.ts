export function formatNumericInputValue(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value !== 0
    ? String(value)
    : "";
}

export function reconcileNumericInputValue(
  currentText: string,
  modelValue: number | undefined,
): string {
  const nextText = formatNumericInputValue(modelValue);
  if (currentText === "" && nextText === "") return currentText;

  const currentNumber = Number(currentText);
  if (
    currentText.trim() !== "" &&
    Number.isFinite(currentNumber) &&
    currentNumber === modelValue
  ) {
    return currentText;
  }

  return nextText;
}
