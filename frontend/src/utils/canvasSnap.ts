import { SnapGuides } from "../store/editor.store";

const SNAP_THRESHOLD = 12;

function snapAxis(
  pos: number,
  size: number,
  canvasSize: number,
  threshold: number
): { pos: number; guide?: number } {
  const candidates = [
    { assetRef: pos,            snapTo: 0,              snapped: 0,                   guide: 0              },
    { assetRef: pos,            snapTo: canvasSize / 2, snapped: canvasSize / 2,      guide: canvasSize / 2 },
    { assetRef: pos + size / 2, snapTo: canvasSize / 2, snapped: canvasSize / 2 - size / 2, guide: canvasSize / 2 },
    { assetRef: pos + size,     snapTo: canvasSize / 2, snapped: canvasSize / 2 - size,     guide: canvasSize / 2 },
    { assetRef: pos + size,     snapTo: canvasSize,     snapped: canvasSize - size,   guide: canvasSize     },
  ];

  let best: { pos: number; guide?: number } = { pos };
  let bestDist = threshold + 1;

  for (const c of candidates) {
    const dist = Math.abs(c.assetRef - c.snapTo);
    if (dist < bestDist) {
      bestDist = dist;
      best = { pos: c.snapped, guide: c.guide };
    }
  }

  return best;
}

export function snapToCanvas(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasWidth: number,
  canvasHeight: number,
  threshold = SNAP_THRESHOLD
): { x: number; y: number; guides: SnapGuides } {
  const rx = snapAxis(x, w, canvasWidth, threshold);
  const ry = snapAxis(y, h, canvasHeight, threshold);

  return {
    x: rx.pos,
    y: ry.pos,
    guides: {
      vertical: rx.guide,
      horizontal: ry.guide,
    },
  };
}
