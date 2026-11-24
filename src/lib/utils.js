// Purpose: Implement the utils lib module, keeping this responsibility separate for maintainability.
export function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}
