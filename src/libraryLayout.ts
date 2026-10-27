/** Measured support planes in each 496 × 756 illustration. */
export type BookPosition = {
  left: number;
  bottom: number;
  height: number;
  width: number;
  surface?: string;
};
export function shelfPositions(state: number): BookPosition[] {
  const place = (
    x: number,
    foot: number,
    h: number,
    surface: string,
  ): BookPosition => ({
    left: (x / 496) * 100,
    bottom: ((756 - foot) / 756) * 100,
    height: (h / 756) * 100,
    width: ((h * 0.4) / 496) * 100,
    surface,
  });
  if (state === 0) return [place(288, 244, 46, "middle-lower")];
  if (state === 1)
    return [
      place(286, 244, 46, "middle-lower"),
      place(310, 243, 44, "middle-lower"),
      place(287, 180, 45, "middle-upper"),
      place(312, 179, 46, "middle-upper"),
    ];
  if (state === 2)
    return [
      place(283, 343, 50, "lower"),
      place(305, 342, 49, "lower"),
      place(327, 341, 48, "lower"),
      place(306, 184, 43, "middle-upper"),
      place(330, 183, 29, "middle-upper"),
      place(375, 181, 33, "middle-upper"),
      place(364, 245, 36, "book-stack"),
    ];
  return [
    place(238, 119, 50, "upper"),
    place(260, 118, 53, "upper"),
    place(282, 116, 57, "upper"),
    place(305, 115, 49, "upper"),
    place(389, 183, 48, "middle-upper"),
    place(412, 182, 54, "middle-upper"),
    place(238, 265, 48, "middle-lower"),
    place(261, 264, 54, "middle-lower"),
    place(284, 264, 51, "middle-lower"),
    place(290, 348, 43, "lower"),
  ];
}
