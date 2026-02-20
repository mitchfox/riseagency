import { useRef, useEffect, useState } from "react";
import { computeVisibleElements, type ComputedAnnotationElement } from "@/lib/annotationRenderUtils";

interface Props {
  elements: any[];
  videoRef: React.RefObject<HTMLVideoElement>;
  clipStart?: number;
}

/** Read-only SVG overlay that renders saved annotations during portal video playback */
export const ReadOnlyAnnotationOverlay = ({ elements, videoRef, clipStart = 0 }: Props) => {
  const [visibleEls, setVisibleEls] = useState<ComputedAnnotationElement[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!elements || elements.length === 0) return;
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      const time = video.currentTime;
      // Compute relative time from clip start for annotation timing
      const relTime = clipStart + (time - (video as any).__clipStartTime || time);
      const visible = computeVisibleElements(elements, relTime, { forceOpacity: 1 });
      setVisibleEls(visible);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [elements, videoRef, clipStart]);

  if (visibleEls.length === 0) return null;

  const getDashArray = (pattern?: string, sw?: number): string | undefined => {
    const w = sw || 3;
    switch (pattern) {
      case 'dashed': return `${w * 4} ${w * 2}`;
      case 'dotted': return `${w} ${w * 2}`;
      case 'dash-dot': return `${w * 4} ${w * 1.5} ${w} ${w * 1.5}`;
      default: return undefined;
    }
  };

  const renderElement = (el: ComputedAnnotationElement) => {
    const x = el.computedX;
    const y = el.computedY;
    const opacity = el.computedOpacity;

    switch (el.type) {
      case 'line':
        return (
          <line key={el.id} x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
            stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
            strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth)} opacity={opacity} />
        );

      case 'arrow': {
        const mid = `portal-arrow-${el.id}`;
        const mw = Math.max(el.strokeWidth * 3, el.strokeWidth * 2.5);
        const mh = Math.max(el.strokeWidth * 2, el.strokeWidth * 1.8);
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth={mw} markerHeight={mh} refX={mw} refY={mh / 2} orient="auto">
                <polygon points={`0 0, ${mw} ${mh / 2}, 0 ${mh}`} fill={el.color} />
              </marker>
            </defs>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
              markerEnd={`url(#${mid})`} strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth)} />
          </g>
        );
      }

      case 'curved-arrow': {
        const mid = `portal-carrow-${el.id}`;
        const cmw = Math.max(el.strokeWidth * 3, el.strokeWidth * 2.5);
        const cmh = Math.max(el.strokeWidth * 2, el.strokeWidth * 1.8);
        const offset = el.curveOffset ?? -15;
        const mx = (x + (el.x2 ?? x)) / 2;
        const my = (y + (el.y2 ?? y)) / 2;
        const dx = (el.x2 ?? x) - x;
        const dy = (el.y2 ?? y) - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const cx = mx + nx * offset;
        const cy = my + ny * offset;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth={cmw} markerHeight={cmh} refX={cmw} refY={cmh / 2} orient="auto">
                <polygon points={`0 0, ${cmw} ${cmh / 2}, 0 ${cmh}`} fill={el.color} />
              </marker>
            </defs>
            <path d={`M ${x} ${y} Q ${cx} ${cy} ${el.x2 ?? x} ${el.y2 ?? y}`}
              stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round"
              markerEnd={`url(#${mid})`} strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth)} />
          </g>
        );
      }

      case 'rect':
        return (
          <rect key={el.id} x={`${x}%`} y={`${y}%`} width={`${el.width}%`} height={`${el.height}%`}
            stroke={el.color} strokeWidth={el.strokeWidth}
            fill={el.fillOpacity ? el.color : 'none'} fillOpacity={el.fillOpacity || 0} opacity={opacity} />
        );

      case 'circle': {
        const rx = el.width ?? el.radius ?? 1;
        const ry = el.height ?? el.radius ?? 1;
        return (
          <ellipse key={el.id} cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`}
            stroke={el.color} strokeWidth={el.strokeWidth}
            fill={el.fillOpacity ? el.color : 'none'} fillOpacity={el.fillOpacity || 0} opacity={opacity} />
        );
      }

      case 'spotlight': {
        const rx = el.width ?? el.radius ?? 5;
        const ry = el.height ?? el.radius ?? 5;
        const maskId = `portal-spot-${el.id}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`} fill="black" />
              </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="black" fillOpacity={el.fillOpacity || 0.3} mask={`url(#${maskId})`} />
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`} fill="none" stroke={el.color} strokeWidth={2} strokeOpacity={0.6} />
          </g>
        );
      }

      case 'player-marker': {
        const r = parseInt(el.color.slice(1, 3), 16);
        const g = parseInt(el.color.slice(3, 5), 16);
        const b = parseInt(el.color.slice(5, 7), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const textColor = lum > 0.5 ? '#000000' : '#ffffff';
        return (
          <g key={el.id} opacity={opacity}>
            <circle cx={`${x}%`} cy={`${y}%`} r={`${el.radius || 2.5}%`} fill={el.color} fillOpacity={0.85} stroke="white" strokeWidth={1.5} />
            <text x={`${x}%`} y={`${y}%`} fill={textColor} textAnchor="middle" dominantBaseline="central" fontSize="2.2%" fontWeight="bold">{el.number ?? ''}</text>
          </g>
        );
      }

      case 'point':
        return (
          <circle key={el.id} cx={`${x}%`} cy={`${y}%`} r={`${el.radius || 1}%`}
            fill={el.color} fillOpacity={0.9} stroke="white" strokeWidth={1.5} opacity={opacity} />
        );

      case 'vision-cone': {
        const len = el.coneLength || 15;
        const angle = el.angle || 0;
        const spread = el.coneSpread || 40;
        const halfSpread = spread / 2;
        const rad1 = ((angle - halfSpread) * Math.PI) / 180;
        const rad2 = ((angle + halfSpread) * Math.PI) / 180;
        const vx1 = x + len * Math.cos(rad1);
        const vy1 = y + len * Math.sin(rad1);
        const vx2 = x + len * Math.cos(rad2);
        const vy2 = y + len * Math.sin(rad2);
        return (
          <g key={el.id} opacity={opacity}>
            <path d={`M ${x}% ${y}% L ${vx1}% ${vy1}% A ${len} ${len} 0 0 1 ${vx2}% ${vy2}% Z`}
              fill={el.color} fillOpacity={el.fillOpacity || 0.2} stroke={el.color} strokeWidth={1} strokeOpacity={0.4} />
            <circle cx={`${x}%`} cy={`${y}%`} r="0.8%" fill={el.color} fillOpacity={0.8} />
          </g>
        );
      }

      case 'semi-circle': {
        const rx = el.width || el.radius || 4;
        const ry = el.height || (rx * 0.35);
        const rotation = el.angle || 0;
        const startAngle = -50 * (Math.PI / 180);
        const endAngle = 230 * (Math.PI / 180);
        const x1 = x + rx * Math.cos(startAngle);
        const y1 = y + ry * Math.sin(startAngle);
        const x2 = x + rx * Math.cos(endAngle);
        const y2 = y + ry * Math.sin(endAngle);
        return (
          <g key={el.id} opacity={opacity} transform={`rotate(${rotation}, ${x}%, ${y}%)`}>
            <path d={`M ${x1}% ${y1}% A ${rx}% ${ry}% 0 1 1 ${x2}% ${y2}%`}
              fill="none" stroke={el.color} strokeWidth={el.strokeWidth} strokeOpacity={0.9} strokeLinecap="round" />
          </g>
        );
      }

      default:
        return null;
    }
  };

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ objectFit: 'fill' }}
    >
      {visibleEls.map(renderElement)}
    </svg>
  );
};
