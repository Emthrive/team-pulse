// ============================================================
//  BRANDING — wordmark „teampulse” (alb, pentru sidebar) + mark „p”
// ============================================================

/** Wordmark orizontal „teampulse” cu „pulse” subliniat cu gradient. */
export function Wordmark({ height = 26, color = "#ffffff" }: { height?: number; color?: string }) {
  return (
    <svg
      height={height}
      viewBox="14 40 566 112"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TeamPulse"
    >
      <defs>
        <linearGradient id="wordmarkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1B67C6" />
          <stop offset="1" stopColor="#38C6EE" />
        </linearGradient>
      </defs>
      <text
        x="20"
        y="120"
        textLength="250"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
        fontSize="100"
        fill={color}
      >
        team
      </text>
      <text
        x="270"
        y="120"
        textLength="300"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
        fontSize="100"
        fill={color}
      >
        pulse
      </text>
      <rect x="270" y="132" width="300" height="15" rx="3" fill="url(#wordmarkGrad)" />
    </svg>
  );
}

/** Mark pătrat „p” (identic cu favicon-ul) pentru sidebar-ul colapsat. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TeamPulse">
      <defs>
        <linearGradient id="markGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1B67C6" />
          <stop offset="1" stopColor="#38C6EE" />
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="64" height="64" rx="14" fill="#000000" />
      <text
        x="45"
        y="64"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="54"
        fill="#ffffff"
      >
        p
      </text>
      <rect x="55" y="67" width="19" height="7" rx="3.5" fill="url(#markGrad)" />
    </svg>
  );
}
