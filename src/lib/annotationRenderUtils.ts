/**
 * Unified, deterministic annotation render evaluation.
 *
 * Both live playback and export MUST call these functions.
 * No DOM, no React state, no mutable references.
 */

import type { AnnotationElement, ElementKeyframe } from '@/components/staff/annotations/AnnotationProjects';

// ── Output type: every visual property fully resolved ──

export interface ComputedAnnotationElement extends AnnotationElement {
  /** Final computed opacity after keyframes, animateIn/Out */
  computedOpacity: number;
  /** Final computed x after keyframe interpolation */
  computedX: number;
  /** Final computed y after keyframe interpolation */
  computedY: number;
  /** Final computed scale after keyframe interpolation */
  computedScale: number;
}

export interface ComputeConfig {
  /** Include elements that would normally be filtered out (e.g. drawing mode selected element) */
  includeHidden?: boolean;
  /** Override opacity for all elements (e.g. 1 during freeze/drawing) */
  forceOpacity?: number | null;
}

// ── Pure keyframe interpolation ──

function interpolateKeyframes(
  keyframes: ElementKeyframe[],
  time: number
): { x: number; y: number; opacity: number; scale: number } | null {
  if (!keyframes || keyframes.length === 0) return null;

  // Before first keyframe
  if (time <= keyframes[0].time) {
    const kf = keyframes[0];
    return { x: kf.x, y: kf.y, opacity: kf.opacity ?? 1, scale: kf.scale ?? 1 };
  }

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    const kf = keyframes[keyframes.length - 1];
    return { x: kf.x, y: kf.y, opacity: kf.opacity ?? 1, scale: kf.scale ?? 1 };
  }

  // Between keyframes — linear interpolation using exact time
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      const range = b.time - a.time;
      const progress = range > 0 ? Math.max(0, Math.min(1, (time - a.time) / range)) : 0;
      return {
        x: a.x + (b.x - a.x) * progress,
        y: a.y + (b.y - a.y) * progress,
        opacity: (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * progress,
        scale: (a.scale ?? 1) + ((b.scale ?? 1) - (a.scale ?? 1)) * progress,
      };
    }
  }

  return null;
}

// ── Core: compute visible elements at time T ──

export function computeVisibleElements(
  elements: AnnotationElement[],
  time: number,
  config?: ComputeConfig
): ComputedAnnotationElement[] {
  const result: ComputedAnnotationElement[] = [];

  for (const el of elements) {
    const start = el.appearAt;
    const end = el.duration !== undefined ? start + el.duration : Infinity;

    // Visibility check — strict: element must have appeared AND not yet ended
    // The 0.25s epsilon is only on the start side so annotations that appear within 0.2s of each other
    // all show together; but it must NOT cause earlier annotations to persist into later groups.
    const isVisible = time >= start - 0.25 && time < end;

    if (!isVisible && !config?.includeHidden) continue;

    // Start with element's own coordinates
    let computedX = el.x;
    let computedY = el.y;
    let computedScale = 1;
    let computedOpacity = el.opacity ?? 1;

    // If forceOpacity is set, use it and skip animation calculations
    if (config?.forceOpacity != null) {
      computedOpacity = config.forceOpacity;
    } else {
      // Apply keyframe interpolation
      if (el.keyframes && el.keyframes.length > 0) {
        const interp = interpolateKeyframes(el.keyframes, time);
        if (interp) {
          computedX = interp.x;
          computedY = interp.y;
          computedOpacity = interp.opacity;
          computedScale = interp.scale;
        }
      }

      // Apply animateIn
      if (el.animateIn && el.animateIn > 0) {
        const elapsed = time - el.appearAt;
        if (elapsed >= 0 && elapsed < el.animateIn) {
          const progress = Math.max(0, Math.min(1, elapsed / el.animateIn));
          computedOpacity = progress * (el.opacity ?? 1);
        }
      }

      // Apply animateOut
      if (el.animateOut && el.animateOut > 0 && el.duration) {
        const remaining = (el.appearAt + el.duration) - time;
        if (remaining >= 0 && remaining < el.animateOut) {
          const progress = Math.max(0, Math.min(1, remaining / el.animateOut));
          computedOpacity = progress * (el.opacity ?? 1);
        }
      }
    }

    result.push({
      ...el,
      computedOpacity,
      computedX,
      computedY,
      computedScale,
    });
  }

  return result;
}

// ── SVG string generator for export (no DOM dependency) ──

function getDashArrayExport(pattern?: string, sw?: number): string {
  const w = sw || 3;
  switch (pattern) {
    case 'dashed': return ` stroke-dasharray="${w * 4} ${w * 2}"`;
    case 'dotted': return ` stroke-dasharray="${w} ${w * 2}"`;
    case 'dash-dot': return ` stroke-dasharray="${w * 4} ${w * 1.5} ${w} ${w * 1.5}"`;
    default: return '';
  }
}

export function renderElementsToSVGString(
  elements: ComputedAnnotationElement[],
  width: number,
  height: number
): string {
  const parts: string[] = [];

  for (const el of elements) {
    const opacity = el.computedOpacity;
    if (opacity <= 0) continue;

    // Use computed coordinates
    const x = el.computedX;
    const y = el.computedY;

    const groupOpen = `<g opacity="${opacity}">`;
    const groupClose = '</g>';
    const dash = getDashArrayExport(el.dashPattern, el.strokeWidth);

    switch (el.type) {
      case 'line':
        parts.push(
          groupOpen,
          `<line x1="${x}%" y1="${y}%" x2="${el.x2}%" y2="${el.y2}%" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-linecap="round"${dash}/>`,
          groupClose
        );
        break;

      case 'arrow': {
        const mid = `arrow-exp-${el.id}`;
        parts.push(
          groupOpen,
          `<defs><marker id="${mid}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${el.color}"/></marker></defs>`,
          `<line x1="${x}%" y1="${y}%" x2="${el.x2}%" y2="${el.y2}%" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-linecap="round" marker-end="url(#${mid})"${dash}/>`,
          groupClose
        );
        break;
      }

      case 'curved-arrow': {
        const mid = `carrow-exp-${el.id}`;
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
        parts.push(
          groupOpen,
          `<defs><marker id="${mid}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${el.color}"/></marker></defs>`,
          `<path d="M ${x} ${y} Q ${cx} ${cy} ${el.x2 ?? x} ${el.y2 ?? y}" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="none" stroke-linecap="round" marker-end="url(#${mid})"${dash}/>`,
          groupClose
        );
        break;
      }

      case 'rect':
        parts.push(
          groupOpen,
          `<rect x="${x}%" y="${y}%" width="${el.width}%" height="${el.height}%" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${el.fillOpacity ? el.color : 'none'}" fill-opacity="${el.fillOpacity || 0}"/>`,
          groupClose
        );
        break;

      case 'circle': {
        const rx = el.width ?? el.radius ?? 1;
        const ry = el.height ?? el.radius ?? 1;
        parts.push(
          groupOpen,
          `<ellipse cx="${x}%" cy="${y}%" rx="${rx}%" ry="${ry}%" stroke="${el.color}" stroke-width="${el.strokeWidth}" fill="${el.fillOpacity ? el.color : 'none'}" fill-opacity="${el.fillOpacity || 0}"/>`,
          groupClose
        );
        break;
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
        parts.push(
          groupOpen,
          `<g transform="rotate(${rotation}, ${x}%, ${y}%)">`,
          `<path d="M ${x1}% ${y1}% A ${rx}% ${ry}% 0 1 1 ${x2}% ${y2}%" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-opacity="0.9" stroke-linecap="round"/>`,
          `</g>`,
          groupClose
        );
        break;
      }

      case 'space-oval': {
        const rx = (el.width || 15) / 2;
        const ry = (el.height || 8) / 2;
        const patId = `hatch-exp-${el.id}`;
        parts.push(
          groupOpen,
          `<defs><pattern id="${patId}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="${el.color}" stroke-width="1.5" stroke-opacity="${el.fillOpacity || 0.25}"/></pattern></defs>`,
          `<ellipse cx="${x}%" cy="${y}%" rx="${rx}%" ry="${ry}%" fill="url(#${patId})" stroke="${el.color}" stroke-width="${el.strokeWidth * 0.5}" stroke-opacity="0.5" stroke-dasharray="3 2"/>`,
          groupClose
        );
        break;
      }

      case 'spotlight': {
        const rx = el.width ?? el.radius ?? 5;
        const ry = el.height ?? el.radius ?? 5;
        const maskId = `spot-exp-${el.id}`;
        parts.push(
          groupOpen,
          `<defs><mask id="${maskId}"><rect x="0" y="0" width="100%" height="100%" fill="white"/><ellipse cx="${x}%" cy="${y}%" rx="${rx}%" ry="${ry}%" fill="black"/></mask></defs>`,
          `<rect x="0" y="0" width="100%" height="100%" fill="black" fill-opacity="${el.fillOpacity || 0.3}" mask="url(#${maskId})"/>`,
          `<ellipse cx="${x}%" cy="${y}%" rx="${rx}%" ry="${ry}%" fill="none" stroke="${el.color}" stroke-width="2" stroke-opacity="0.6"/>`,
          groupClose
        );
        break;
      }

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
        const largeArc = spread > 180 ? 1 : 0;
        parts.push(
          groupOpen,
          `<path d="M ${x}% ${y}% L ${vx1}% ${vy1}% A ${len} ${len} 0 ${largeArc} 1 ${vx2}% ${vy2}% Z" fill="${el.color}" fill-opacity="${el.fillOpacity || 0.2}" stroke="${el.color}" stroke-width="1" stroke-opacity="0.4"/>`,
          `<circle cx="${x}%" cy="${y}%" r="0.8%" fill="${el.color}" fill-opacity="0.8"/>`,
          groupClose
        );
        break;
      }

      case 'distance': {
        const dx = (el.x2 || 0) - x;
        const dy = (el.y2 || 0) - y;
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
        const mx = (x + (el.x2 || 0)) / 2;
        const my = (y + (el.y2 || 0)) / 2;
        parts.push(
          groupOpen,
          `<line x1="${x}%" y1="${y}%" x2="${el.x2}%" y2="${el.y2}%" stroke="${el.color}" stroke-width="1.5" stroke-dasharray="4 2"/>`,
          `<circle cx="${x}%" cy="${y}%" r="0.5%" fill="${el.color}"/>`,
          `<circle cx="${el.x2}%" cy="${el.y2}%" r="0.5%" fill="${el.color}"/>`,
          `<text x="${mx}%" y="${my - 1}%" fill="${el.color}" font-size="1.8%" text-anchor="middle" font-weight="bold">${dist}</text>`,
          groupClose
        );
        break;
      }

      case 'player-marker': {
        const r = parseInt(el.color.slice(1, 3), 16);
        const g = parseInt(el.color.slice(3, 5), 16);
        const b = parseInt(el.color.slice(5, 7), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const textColor = lum > 0.5 ? '#000000' : '#ffffff';
        parts.push(
          groupOpen,
          `<circle cx="${x}%" cy="${y}%" r="${el.radius || 2.5}%" fill="${el.color}" fill-opacity="0.85" stroke="white" stroke-width="1.5"/>`,
          `<text x="${x}%" y="${y}%" fill="${textColor}" text-anchor="middle" dominant-baseline="central" font-size="2.2%" font-weight="bold">${el.number ?? ''}</text>`,
          groupClose
        );
        break;
      }

      case 'point':
        parts.push(
          groupOpen,
          `<circle cx="${x}%" cy="${y}%" r="${el.radius || 1}%" fill="${el.color}" fill-opacity="0.9" stroke="white" stroke-width="1.5"/>`,
          groupClose
        );
        break;

      case 'linked-line': {
        const mid = `lnk-exp-${el.id}`;
        parts.push(
          groupOpen,
          `<defs><marker id="${mid}" markerWidth="6" markerHeight="6" refX="3" refY="3"><circle cx="3" cy="3" r="2.5" fill="${el.color}"/></marker></defs>`,
          `<line x1="${x}%" y1="${y}%" x2="${el.x2}%" y2="${el.y2}%" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-dasharray="6 3" marker-start="url(#${mid})" marker-end="url(#${mid})"/>`,
          groupClose
        );
        break;
      }

      case 'magnifier': {
        const r = el.radius || 8;
        parts.push(
          groupOpen,
          `<circle cx="${x}%" cy="${y}%" r="${r}%" fill="none" stroke="white" stroke-width="2.5" stroke-opacity="0.9"/>`,
          `<text x="${x}%" y="${(y || 0) - r - 1}%" fill="white" font-size="1.5%" text-anchor="middle" opacity="0.7">🔍 ${el.zoomLevel || 2}x</text>`,
          groupClose
        );
        break;
      }

      case 'image-layer':
        // Image layers are video-dependent; in export they just show as transparent region markers
        parts.push(
          groupOpen,
          `<rect x="${x}%" y="${y}%" width="${el.width || 10}%" height="${el.height || 10}%" fill="none" stroke="white" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="4 2"/>`,
          groupClose
        );
        break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" preserveAspectRatio="none">${parts.join('')}</svg>`;
}

// ── Helpers ──

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Seek with proper promise handling ──

export function waitForSeek(video: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(fallback);

      // Poll readyState >= 2 (HAVE_CURRENT_DATA) for up to 100ms
      const pollStart = performance.now();
      const pollReady = () => {
        if (video.readyState >= 2 || performance.now() - pollStart > 100) {
          // 50ms decode safety delay then rAF compositor flush
          setTimeout(() => {
            requestAnimationFrame(() => resolve());
          }, 50);
        } else {
          setTimeout(pollReady, 10);
        }
      };
      pollReady();
    };

    const fallback = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, 300);

    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;
  });
}
