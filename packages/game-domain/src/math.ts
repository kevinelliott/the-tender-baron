import { fault } from "./errors.js";

export const DEFAULT_NUMERIC_LIMIT = 9_000_000_000_000_000;

export function requireInteger(
  value: number,
  label: string,
  minimum = -DEFAULT_NUMERIC_LIMIT,
  maximum = DEFAULT_NUMERIC_LIMIT
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fault(
      "TB_NUMERIC_RANGE",
      `${label} must be a safe integer between ${minimum} and ${maximum}.`,
      "Return to the last verified service state."
    );
  }
  return value;
}

export function checkedAdd(
  left: number,
  right: number,
  label: string,
  minimum = -DEFAULT_NUMERIC_LIMIT,
  maximum = DEFAULT_NUMERIC_LIMIT
): number {
  requireInteger(left, `${label} left operand`);
  requireInteger(right, `${label} right operand`);
  const result = left + right;
  return requireInteger(result, label, minimum, maximum);
}

export function checkedSubtract(
  left: number,
  right: number,
  label: string,
  minimum = -DEFAULT_NUMERIC_LIMIT,
  maximum = DEFAULT_NUMERIC_LIMIT
): number {
  return checkedAdd(left, -right, label, minimum, maximum);
}

export function checkedMultiplyDivideFloor(
  left: number,
  right: number,
  divisor: number,
  label: string,
  minimum = -DEFAULT_NUMERIC_LIMIT,
  maximum = DEFAULT_NUMERIC_LIMIT
): number {
  requireInteger(left, `${label} left operand`);
  requireInteger(right, `${label} right operand`);
  requireInteger(divisor, `${label} divisor`, 1);

  const product = left * right;
  requireInteger(product, `${label} intermediate product`);
  return requireInteger(Math.floor(product / divisor), label, minimum, maximum);
}

export function clampInteger(value: number, minimum: number, maximum: number): number {
  requireInteger(value, "clamped value");
  requireInteger(minimum, "clamp minimum");
  requireInteger(maximum, "clamp maximum");
  if (minimum > maximum) {
    fault(
      "TB_NUMERIC_RANGE",
      "Clamp minimum cannot be greater than its maximum.",
      "Use a valid fixed-point range."
    );
  }
  return Math.min(maximum, Math.max(minimum, value));
}
