// Purpose: a small flat drawing of the SAME space shuttle the rocket story flies in 3D (white orbiter, black
// nose, orange external tank, two white boosters). Used on the hero's "Scroll to launch" badge, so the rocket you
// see before scrolling is the rocket that launches – no swap to a different rocket.
export default function ShuttleIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 44 120" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="si-tank" x1="0" x2="1">
          <stop offset="0" stopColor="#a8501d" />
          <stop offset="0.45" stopColor="#f08a3e" />
          <stop offset="1" stopColor="#9c4718" />
        </linearGradient>
        <linearGradient id="si-white" x1="0" x2="1">
          <stop offset="0" stopColor="#b9c2cc" />
          <stop offset="0.45" stopColor="#ffffff" />
          <stop offset="1" stopColor="#aab3be" />
        </linearGradient>
      </defs>
      {/* boosters */}
      <path d="M7 34 Q9 26 11 34 V96 H7Z" fill="url(#si-white)" />
      <path d="M33 34 Q35 26 37 34 V96 H33Z" fill="url(#si-white)" />
      <rect x="6.5" y="96" width="5" height="5" fill="#3b4048" />
      <rect x="32.5" y="96" width="5" height="5" fill="#3b4048" />
      {/* external tank */}
      <path d="M14 30 Q22 4 30 30 V98 Q22 102 14 98Z" fill="url(#si-tank)" />
      {/* orbiter: body, black nose, delta wings, tail fin */}
      <path d="M2 92 L17 64 V92Z" fill="url(#si-white)" />
      <path d="M42 92 L27 64 V92Z" fill="url(#si-white)" />
      <path d="M2 92 L17 64 L17 70 L6 92Z" fill="#20252c" />
      <path d="M42 92 L27 64 L27 70 L38 92Z" fill="#20252c" />
      <path d="M17 50 Q22 30 27 50 V96 H17Z" fill="url(#si-white)" />
      <path d="M17.6 46 Q22 31 26.4 46Z" fill="#14181e" />
      <rect x="19.5" y="52" width="5" height="2" rx="1" fill="#2a3038" />
      {/* engines */}
      <path d="M18 96 h8 l1.5 5 h-11Z" fill="#4a5059" />
    </svg>
  );
}