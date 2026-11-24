// Purpose: the "Back" pill shown on every inner page (Case Study, Blog, Career, Projects, service pages).
//   Fixed at the top-right of the page (where the old X close button was); the pages keep their own logo on the left.
import { ArrowLeft } from "lucide-react";

export default function BackButton({ onClick, label = "Back", tone = "dark", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`ct-back ct-back-${tone} group ${className}`}
    >
      <span className="ct-back-icon" aria-hidden="true">
        <ArrowLeft className="ct-back-a" size={14} strokeWidth={2.2} />
        <ArrowLeft className="ct-back-b" size={14} strokeWidth={2.2} />
      </span>
      <span className="ct-back-label">{label}</span>
    </button>
  );
}
