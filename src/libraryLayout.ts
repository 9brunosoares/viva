import { shelfSurfaces } from "./shelfSurface";
import { spineMetrics } from "./spineMetrics";

/** Top support plane in the supplied 496 x 756 art, above its thick front lip. */
export type BookPosition = {
  left: number;
  bottom: number;
  height: number;
  width: number;
  surface?: string;
};
const leans = [0, -1, 0, 1, 0, -1, 0, 1, 0, 0];
/** Piecewise interpolation follows the actual ridge in each illustration. */
export function shelfY(state: number, x: number): number {
  const points = shelfSurfaces[state];
  let i = 1;
  while (i < points.length - 1 && x > points[i][0]) i++;
  const [a, b] = [points[i - 1], points[i]];
  return a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
}
export function shelfPositions(state: number): BookPosition[] {
  return Array.from({ length: 10 }, (_, i) => {
    const x = 243 + i * 20.5,
      foot = shelfY(state, x);
    const h = 43 + [0, 1, -1, 2, 0, 1, -1, 0, 2, 0][i];
    return {
      left: (x / 496) * 100,
      bottom: ((756 - foot) / 756) * 100,
      height: (h / 756) * 100,
      width: ((h * 0.4) / 496) * 100,
      surface: "dedicated-second-shelf",
    };
  });
}

/** Preserve the alpha-bounded art size; anchor the solid, visible base instead. */
export function bookPlacement(state: number, index: number, id: number) {
  const slot = shelfPositions(state)[index],
    m = spineMetrics[id],
    h = (slot.height / 100) * 756,
    w = (h * m.artWidth) / m.artHeight,
    x = (slot.left / 100) * 496,
    contactX = ((m.contactX - m.left) / m.artWidth) * w,
    contactY = ((m.contactY - m.top) / m.artHeight) * h,
    lean = leans[index],
    radians = (lean * Math.PI) / 180,
    dx = contactX - w / 2,
    dy = contactY - h,
    rotatedX = w / 2 + Math.cos(radians) * dx - Math.sin(radians) * dy,
    rotatedY = Math.sin(radians) * dx + Math.cos(radians) * dy,
    supportX = x + rotatedX,
    supportY = shelfY(state, supportX),
    floorAngle =
      (Math.atan(
        shelfY(state, supportX + 0.5) - shelfY(state, supportX - 0.5),
      ) *
        180) /
      Math.PI;
  return {
    ...slot,
    bottom: ((756 - (supportY - rotatedY)) / 756) * 100,
    width: (w / 496) * 100,
    lean,
    contactX: (contactX / w) * 100,
    contactY: (contactY / h) * 100,
    shadowAngle: floorAngle - lean,
    supportX,
    supportY,
  };
}
