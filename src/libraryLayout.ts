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
