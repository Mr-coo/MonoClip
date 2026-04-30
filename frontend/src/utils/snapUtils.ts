import { MediaAsset } from "../types/mediaAsset";

function tlDuration(a: MediaAsset): number {
  return a.endTime - a.startTime;
}

function overlaps(startA: number, durA: number, startB: number, durB: number): boolean {
  return startA < startB + durB && startA + durA > startB;
}

/**
 * Snap a proposed startInTimeLine for a moved clip so it doesn't overlap
 * any other clip on the same layer. Returns the nearest non-overlapping position.
 */
export function snapMoveStart(
  proposed: number,
  selfId: string,
  layer: number,
  duration: number,
  assets: MediaAsset[]
): number {
  const others = assets.filter((a) => a.id !== selfId && a.layer === layer);

  const hasOverlap = (start: number) =>
    others.some((o) => overlaps(start, duration, o.startInTimeLine, tlDuration(o)));

  if (!hasOverlap(proposed)) return proposed;

  // Candidates: snap right after each neighbor, or right before each neighbor
  const candidates = [
    0,
    ...others.flatMap((o) => [
      o.startInTimeLine + tlDuration(o),
      o.startInTimeLine - duration,
    ]),
  ];

  const valid = candidates.filter((c) => c >= 0 && !hasOverlap(c));
  if (!valid.length) return proposed;

  return valid.reduce((best, c) =>
    Math.abs(c - proposed) < Math.abs(best - proposed) ? c : best
  );
}

/**
 * Clamp the right timeline edge of a clip being resized so it doesn't
 * overlap any right neighbor on the same layer.
 * Returns the clamped timeline end position.
 */
export function clampResizeRight(
  proposedTlEnd: number,
  tlStart: number,
  selfId: string,
  layer: number,
  assets: MediaAsset[]
): number {
  const others = assets.filter((a) => a.id !== selfId && a.layer === layer);
  const blocking = others.filter(
    (o) => o.startInTimeLine >= tlStart && proposedTlEnd > o.startInTimeLine
  );
  if (!blocking.length) return proposedTlEnd;
  return Math.min(...blocking.map((o) => o.startInTimeLine));
}

/**
 * Clamp the left timeline edge of a clip being resized so it doesn't
 * overlap any left neighbor on the same layer.
 * Returns the clamped timeline start position.
 */
export function clampResizeLeft(
  proposedTlStart: number,
  tlEnd: number,
  selfId: string,
  layer: number,
  assets: MediaAsset[]
): number {
  const others = assets.filter((a) => a.id !== selfId && a.layer === layer);
  const blocking = others.filter((o) => {
    const oe = o.startInTimeLine + tlDuration(o);
    return oe <= tlEnd && proposedTlStart < oe;
  });
  if (!blocking.length) return proposedTlStart;
  return Math.max(...blocking.map((o) => o.startInTimeLine + tlDuration(o)));
}