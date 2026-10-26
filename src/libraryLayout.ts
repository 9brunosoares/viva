/** Feet follow shelf edges in the new 496 × 756 reading-corner artwork. */
export type BookPosition = {
  left: number;
  bottom: number;
  height: number;
  width: number;
};
export function shelfPositions(state: number): BookPosition[] {
  const shelf = (
    xs: number[],
    base: number,
    height: number,
    width: number,
    slope = 0.025,
  ) =>
    xs.map((x, i) => ({
      left: (x / 496) * 100,
      bottom: ((756 - (base - (x - 270) * slope)) / 756) * 100,
      height: ((height + [0, -2, 2, -1][i % 4]) / 756) * 100,
      width: (width / 496) * 100,
    }));
  if (state < 2) return shelf([275, 303, 331, 359], 249, 61, 24);
  if (state === 2)
    return [
      ...shelf([266, 292, 318, 344], 354, 63, 24, 0),
      ...shelf([290, 311], 267, 53, 18),
      ...shelf([310], 191, 51, 18),
    ];
  return [
    ...shelf([290, 308, 326, 344], 191, 52, 17, 0.045),
    ...shelf([323, 341], 268, 51, 17, 0.025),
    ...shelf([243, 261, 279, 297], 123, 55, 17, 0.06),
  ];
}
