interface ChanceCreationFlowProps {
  strikerStats: Record<string, any>;
}

const XC_ZONES = [
  { key: 'crossing_movement_xC', label: 'Crossing Movement', shortLabel: 'Crossing' },
  { key: 'movement_in_behind_xC', label: 'In Behind', shortLabel: 'In Behind' },
  { key: 'movement_down_side_xC', label: 'Down The Side', shortLabel: 'Down Side' },
  { key: 'triple_threat_xC', label: 'Triple Threat', shortLabel: 'Triple Threat' },
  { key: 'movement_to_feet_xC', label: 'To Feet', shortLabel: 'To Feet' },
] as const;

const getXCColor = (value: number): string => {
  if (value >= 0.4) return 'hsl(43, 49%, 61%)';
  if (value >= 0.25) return 'hsl(142, 72%, 29%)';
  if (value >= 0.15) return 'hsl(142, 76%, 36%)';
  if (value >= 0.08) return 'hsl(82, 84%, 67%)';
  if (value >= 0.03) return 'hsl(48, 96%, 53%)';
  if (value > 0) return 'hsl(25, 95%, 53%)';
  return 'hsl(var(--muted))';
};

const getTextColor = (value: number): string => {
  if (value >= 0.25) return '#fff';
  return '#000';
};

export const ChanceCreationFlow = ({ strikerStats }: ChanceCreationFlowProps) => {
  const crossingXC = strikerStats?.crossing_movement_xC ?? null;
  const inBehindXC = strikerStats?.movement_in_behind_xC ?? null;
  const downSideXC = strikerStats?.movement_down_side_xC ?? null;
  const tripleXC = strikerStats?.triple_threat_xC ?? null;
  const toFeetXC = strikerStats?.movement_to_feet_xC ?? null;

  // Only show if at least one xC value exists
  const hasAnyData = [crossingXC, inBehindXC, downSideXC, tripleXC, toFeetXC].some(v => v != null && v > 0);
  if (!hasAnyData) return null;

  const pitchW = 360;
  const pitchH = 480;
  const goalW = 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Chance Creation Flow</h4>
        <span className="text-xs text-muted-foreground">xC by movement type</span>
      </div>

      <svg viewBox={`0 0 ${pitchW} ${pitchH}`} className="w-full max-w-[400px] mx-auto" style={{ background: 'hsl(142, 40%, 32%)' }}>
        {/* Pitch outline */}
        <rect x="10" y="10" width={pitchW - 20} height={pitchH - 20} fill="none" stroke="white" strokeWidth="2" rx="2" />

        {/* Centre line */}
        <line x1="10" y1={pitchH / 2} x2={pitchW - 10} y2={pitchH / 2} stroke="white" strokeWidth="1" opacity="0.4" />

        {/* Penalty area */}
        <rect x="60" y="10" width={pitchW - 120} height="100" fill="none" stroke="white" strokeWidth="1.5" />

        {/* 6-yard box */}
        <rect x="120" y="10" width={pitchW - 240} height="40" fill="none" stroke="white" strokeWidth="1" />

        {/* Goal */}
        <rect x={(pitchW - goalW) / 2} y="2" width={goalW} height="10" fill="none" stroke="white" strokeWidth="2" />

        {/* ===== ZONES ===== */}

        {/* 1. Crossing Movement - Central top inside penalty area */}
        {crossingXC != null && (
          <g>
            <rect x="100" y="14" width={pitchW - 200} height="45" rx="4"
              fill={getXCColor(crossingXC)} opacity="0.85" />
            <text x={pitchW / 2} y="32" textAnchor="middle" fontSize="9" fontWeight="bold" fill={getTextColor(crossingXC)}>Crossing Movement</text>
            <text x={pitchW / 2} y="50" textAnchor="middle" fontSize="16" fontWeight="bold" fill={getTextColor(crossingXC)}>{crossingXC.toFixed(2)}</text>
          </g>
        )}

        {/* 2. In Behind - Central high, with arrow towards goal */}
        {inBehindXC != null && (
          <g>
            <rect x="110" y="70" width={pitchW - 220} height="55" rx="4"
              fill={getXCColor(inBehindXC)} opacity="0.85" />
            <text x={pitchW / 2} y="88" textAnchor="middle" fontSize="9" fontWeight="bold" fill={getTextColor(inBehindXC)}>In Behind</text>
            <text x={pitchW / 2} y="112" textAnchor="middle" fontSize="16" fontWeight="bold" fill={getTextColor(inBehindXC)}>{inBehindXC.toFixed(2)}</text>
            {/* Arrow towards goal */}
            <line x1={pitchW / 2} y1="70" x2={pitchW / 2} y2="55" stroke="white" strokeWidth="2" markerEnd="url(#arrowhead)" />
          </g>
        )}

        {/* 3. Down The Side - Wide zones either side */}
        {downSideXC != null && (
          <g>
            {/* Left wide zone */}
            <rect x="14" y="60" width="75" height="70" rx="4"
              fill={getXCColor(downSideXC)} opacity="0.85" />
            <text x="52" y="90" textAnchor="middle" fontSize="8" fontWeight="bold" fill={getTextColor(downSideXC)}>Down</text>
            <text x="52" y="100" textAnchor="middle" fontSize="8" fontWeight="bold" fill={getTextColor(downSideXC)}>The Side</text>
            <text x="52" y="120" textAnchor="middle" fontSize="14" fontWeight="bold" fill={getTextColor(downSideXC)}>{(downSideXC / 2).toFixed(2)}</text>
            {/* Diagonal arrow towards goal */}
            <line x1="52" y1="60" x2="90" y2="25" stroke="white" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

            {/* Right wide zone */}
            <rect x={pitchW - 89} y="60" width="75" height="70" rx="4"
              fill={getXCColor(downSideXC)} opacity="0.85" />
            <text x={pitchW - 52} y="90" textAnchor="middle" fontSize="8" fontWeight="bold" fill={getTextColor(downSideXC)}>Down</text>
            <text x={pitchW - 52} y="100" textAnchor="middle" fontSize="8" fontWeight="bold" fill={getTextColor(downSideXC)}>The Side</text>
            <text x={pitchW - 52} y="120" textAnchor="middle" fontSize="14" fontWeight="bold" fill={getTextColor(downSideXC)}>{(downSideXC / 2).toFixed(2)}</text>
            {/* Diagonal arrow towards goal */}
            <line x1={pitchW - 52} y1="60" x2={pitchW - 90} y2="25" stroke="white" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
          </g>
        )}

        {/* 4. Triple Threat - Central zone below penalty area */}
        {tripleXC != null && (
          <g>
            <rect x="80" y="145" width={pitchW - 160} height="65" rx="4"
              fill={getXCColor(tripleXC)} opacity="0.85" />
            <text x={pitchW / 2} y="168" textAnchor="middle" fontSize="9" fontWeight="bold" fill={getTextColor(tripleXC)}>Triple Threat</text>
            <text x={pitchW / 2} y="195" textAnchor="middle" fontSize="16" fontWeight="bold" fill={getTextColor(tripleXC)}>{tripleXC.toFixed(2)}</text>
          </g>
        )}

        {/* 5. To Feet - Full width zone beneath */}
        {toFeetXC != null && (
          <g>
            <rect x="20" y="225" width={pitchW - 40} height="65" rx="4"
              fill={getXCColor(toFeetXC)} opacity="0.85" />
            <text x={pitchW / 2} y="250" textAnchor="middle" fontSize="9" fontWeight="bold" fill={getTextColor(toFeetXC)}>To Feet</text>
            <text x={pitchW / 2} y="275" textAnchor="middle" fontSize="16" fontWeight="bold" fill={getTextColor(toFeetXC)}>{toFeetXC.toFixed(2)}</text>
          </g>
        )}

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="white" />
          </marker>
        </defs>
      </svg>

      {/* Total xC */}
      <div className="text-center text-xs text-muted-foreground">
        Total xC: {[crossingXC, inBehindXC, downSideXC, tripleXC, toFeetXC]
          .filter(v => v != null)
          .reduce((sum, v) => sum + (v ?? 0), 0)
          .toFixed(2)}
      </div>
    </div>
  );
};
