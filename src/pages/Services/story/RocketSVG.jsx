// Purpose: A realistic crewed rocket, drawn in SVG (nose up), used by the service page hero badge and the
// rocket story. Metallic cylinder shading, Clicktots livery in the service colour, porthole, fins, landing
// legs, engine bell – and a crew door + ramp that RocketStory opens after the Moon landing.
//   doorRef / rampRef / specRef: optional refs so the story can open the door, lower the ramp and slide the
//   specular highlight (fakes the rocket rolling in 3D).
import { useId } from "react";

export default function RocketSVG({ className = "", doorRef, rampRef, specRef, glowRef }) {
  const id = useId().replace(/:/g, "");
  const body = `rb-${id}`;
  const dark = `rd-${id}`;
  const metal = `rm-${id}`;
  const spec = `rs-${id}`;
  const clip = `rc-${id}`;
  const light = `rl-${id}`;
  return (
    <svg viewBox="0 0 60 200" className={`rk-svg ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={body} x1="0" x2="1">
          <stop offset="0" stopColor="#7c8794" />
          <stop offset="0.16" stopColor="#d9dfe6" />
          <stop offset="0.38" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#eef1f4" />
          <stop offset="0.84" stopColor="#adb6c1" />
          <stop offset="1" stopColor="#6c7682" />
        </linearGradient>
        <linearGradient id={dark} x1="0" x2="1">
          <stop offset="0" stopColor="#12171d" />
          <stop offset="0.4" stopColor="#47525e" />
          <stop offset="0.62" stopColor="#36404b" />
          <stop offset="1" stopColor="#0f1318" />
        </linearGradient>
        <linearGradient id={metal} x1="0" x2="1">
          <stop offset="0" stopColor="#2b2f35" />
          <stop offset="0.45" stopColor="#a3aab2" />
          <stop offset="0.7" stopColor="#6b727a" />
          <stop offset="1" stopColor="#24282d" />
        </linearGradient>
        <linearGradient id={spec} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={light} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9b8" />
          <stop offset="1" stopColor="#ff9f4a" />
        </linearGradient>
        <clipPath id={clip}>
          <path d="M30 4 C40 18 44 34 44 52 L44 162 L16 162 L16 52 C16 34 20 18 30 4 Z" />
        </clipPath>
      </defs>

      {/* landing legs (behind the body) */}
      <path d="M17 160 L3 194" stroke="#59616b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M43 160 L57 194" stroke="#59616b" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="0" y="193" width="8" height="3" rx="1.5" fill="#3a4049" />
      <rect x="52" y="193" width="8" height="3" rx="1.5" fill="#3a4049" />

      {/* fins */}
      <path d="M16 128 L5 168 L5 180 L16 168 Z" fill={`url(#${dark})`} />
      <path d="M44 128 L55 168 L55 180 L44 168 Z" fill={`url(#${dark})`} />

      {/* engine bell */}
      <path d="M21 174 L39 174 L43 191 L17 191 Z" fill={`url(#${metal})`} />
      <rect x="17" y="189.5" width="26" height="2.5" rx="1" fill="#1b1e22" />

      {/* skirt */}
      <path d="M16 160 L44 160 L47 175 L13 175 Z" fill={`url(#${dark})`} />

      {/* nose + body */}
      <g clipPath={`url(#${clip})`}>
        <rect x="16" y="0" width="28" height="165" fill={`url(#${body})`} />
        {/* livery */}
        <rect x="16" y="52" width="28" height="5" fill={`url(#${dark})`} />
        <rect x="16" y="66" width="28" height="3" fill="var(--c, #2dd4bf)" />
        <rect x="16" y="120" width="28" height="4" fill={`url(#${dark})`} />
        <text
          x="30"
          y="97"
          transform="rotate(-90 30 97)"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="5.4"
          letterSpacing="1.1"
          fill="#27303a"
          fontFamily="inherit"
          fontWeight="700"
        >
          CLICKTOTS
        </text>
        {/* rolling highlight (3D roll) */}
        <g ref={specRef}>
          <rect x="22" y="0" width="9" height="165" fill={`url(#${spec})`} />
        </g>
      </g>

      {/* porthole */}
      <circle cx="30" cy="36" r="4.6" fill="#0b1520" stroke="#8d96a1" strokeWidth="1.3" />
      <circle cx="28.6" cy="34.6" r="1.4" fill="#cfe7ff" opacity="0.7" />

      {/* crew door: dark opening + warm light, the door panel swings, the ramp lowers */}
      <rect x="22.5" y="133" width="15" height="24" rx="2" fill="#0a0f15" />
      <rect ref={glowRef} x="23.5" y="134" width="13" height="22" rx="1.6" fill={`url(#${light})`} opacity="0" />
      <g ref={rampRef} className="rk-svg-ramp">
        <path d="M37.5 156.2 L52 191 L49.4 192 L35.6 157.4 Z" fill={`url(#${metal})`} />
      </g>
      <g ref={doorRef} className="rk-svg-door">
        <rect x="22.5" y="133" width="15" height="24" rx="2" fill={`url(#${body})`} stroke="#7d8792" strokeWidth="0.6" />
        <rect x="34" y="143" width="1.6" height="4" rx="0.8" fill="#4a535d" />
      </g>
    </svg>
  );
}
