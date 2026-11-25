interface IsometricBlaugranaCubeProps {
  className?: string;
}

/**
 * Crisp 30-degree isometric 3-face cube cluster rendered in the Blaugrana palette:
 * - Top face: Blaugrana Gold (#EDBB00) or Sky Blau (#1C6DD0)
 * - Left face: Blaugrana Royal Blue (#004D98)
 * - Right face: Blaugrana Garnet (#A50044)
 */
export function IsometricBlaugranaCube({
  className = 'w-8 h-8',
}: IsometricBlaugranaCubeProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top isometric face - Gold */}
      <polygon
        points="32,6 56,20 32,34 8,20"
        fill="#EDBB00"
        stroke="#070B14"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left isometric face - Blau (#004D98) */}
      <polygon
        points="8,20 32,34 32,58 8,44"
        fill="#004D98"
        stroke="#070B14"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right isometric face - Grana (#A50044) */}
      <polygon
        points="56,20 32,34 32,58 56,44"
        fill="#A50044"
        stroke="#070B14"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner isometric rib accents */}
      <polyline
        points="16,25 32,34 48,25"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

/**
 * Geometric isometric stacked stripes backdrop for Blaugrana section headers.
 */
export function IsometricBlaugranaBackdrop({
  className = '',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 420 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMaxYMid slice"
    >
      {/* Large Isometric Cube 1 */}
      <polygon points="310,18 390,64 310,110 230,64" fill="#1C6DD0" fillOpacity="0.45" />
      <polygon points="230,64 310,110 310,196 230,150" fill="#004D98" fillOpacity="0.6" />
      <polygon points="390,64 310,110 310,196 390,150" fill="#A50044" fillOpacity="0.65" />

      {/* Offset Isometric Cube 2 */}
      <polygon points="180,96 236,128 180,160 124,128" fill="#EDBB00" fillOpacity="0.55" />
      <polygon points="124,128 180,160 180,214 124,182" fill="#004D98" fillOpacity="0.55" />
      <polygon points="236,128 180,160 180,214 236,182" fill="#A50044" fillOpacity="0.6" />

      {/* Accent Isometric Tile 3 */}
      <polygon points="366,138 408,162 366,186 324,162" fill="#EDBB00" fillOpacity="0.45" />
      <polygon points="324,162 366,186 366,220 324,196" fill="#004D98" fillOpacity="0.45" />
      <polygon points="408,162 366,186 366,220 408,196" fill="#A50044" fillOpacity="0.5" />
    </svg>
  );
}
