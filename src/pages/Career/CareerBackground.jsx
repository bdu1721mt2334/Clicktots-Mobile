// Purpose: Quiet, professional background for the Career overlay.
//   A soft top spotlight, a faint blueprint grid and two very slow muted glows (see career.css).
//   On a role page the glows pick up that role's colours (tintA / tintB) and fade between them.

export default function CareerBackground({ tintA, tintB }) {
  const style = {};
  if (tintA) style["--ct-blob-a"] = tintA;
  if (tintB) style["--ct-blob-b"] = tintB;

  return (
    <div aria-hidden="true" className="ct-bg-layer" style={style}>
      <div className="ct-spot" />
      <div className="ct-blob ct-blob--a" />
      <div className="ct-blob ct-blob--b" />
      <div className="ct-grid" />
    </div>
  );
}