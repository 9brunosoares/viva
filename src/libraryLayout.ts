/** Support measured in the supplied 496 x 756 art: second shelf, sloping up right. */
export type BookPosition = {
  left: number;
  bottom: number;
  height: number;
  width: number;
  surface?: string;
};
export function shelfPositions(state: number): BookPosition[] {
  return Array.from({ length: 10 }, (_, i) => {
    const x = 243 + i * 20.5,
      foot = (state < 2 ? 191 : 192) - (x - 232) * 0.048;
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
export const keepsakePlaces = {
  diploma: { x: 424, y: 115, w: 24, h: 23 },
  drawing: { x: 199, y: 211, w: 25, h: 31 },
  caipirinha: { x: 310, y: 645, w: 20, h: 34 },
  belt: { x: 207, y: 138, w: 23, h: 55 },
  candle: { x: 296, y: 340, w: 18, h: 35 },
  album: { x: 326, y: 265, w: 27, h: 26 },
  speaker: { x: 359, y: 340, w: 28, h: 21 },
  "tattoo-frame": { x: 168, y: 49, w: 30, h: 37 },
} as const;
