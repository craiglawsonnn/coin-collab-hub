import DarkVeilBase from "./DarkVeil";
import type { ComponentProps } from "react";

export type LightVeilProps = ComponentProps<typeof DarkVeilBase>;

/**
 * Light veil = warmer hue + softer motion + white→gold overlay.
 * No shader changes; fully stable on theme toggles.
 */
export default function LightVeil({
  className = "",
  ...rest
}: LightVeilProps) {
  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* The canvas */}
      <DarkVeilBase
        className="absolute inset-0"
        whiteBackground
        // gold-ish defaults (tweak to taste)
        hueShift={48}               // rotate towards yellow/gold
        noiseIntensity={0.015}      // cleaner
        scanlineIntensity={0.02}    // softer
        scanlineFrequency={3.2}
        warpAmount={0.04}           // calmer
        {...rest}
      />

      {/* Subtle gold glow (kept very light) */}
      <div
        className="
          pointer-events-none absolute inset-0 mix-blend-multiply
          bg-[radial-gradient(120%_80%_at_20%_10%,rgba(255,215,0,0.16),transparent_60%)]
        "
      />
      {/* optional gentle highlight to keep things airy */}
      <div
        className="
          pointer-events-none absolute inset-0 mix-blend-screen
          bg-[radial-gradient(90%_70%_at_80%_20%,rgba(255,255,255,0.35),transparent_60%)]
        "
      />
    </div>
  );
}