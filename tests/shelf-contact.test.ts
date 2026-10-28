import assert from "node:assert/strict";
import test from "node:test";
import { bookPlacement, shelfPositions, shelfY } from "../src/libraryLayout";
import { shelfSurfaces } from "../src/shelfSurface";
import { spineMetrics } from "../src/spineMetrics";
import { campaignBookIds } from "../src/config";

test("support follows measured segments in all four original illustrations", () => {
  for (let stage = 0; stage < 4; stage++) {
    const points = shelfSurfaces[stage];
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1], points[i]];
      assert.equal(shelfY(stage, a[0]), a[1]);
      assert.ok(
        Math.abs(shelfY(stage, (a[0] + b[0]) / 2) - (a[1] + b[1]) / 2) < 1e-10,
      );
    }
  }
  assert.notEqual(shelfY(1, 280), shelfY(2, 280));
  assert.notEqual(shelfY(2, 440), shelfY(3, 440));
});

test("all solid book bases rest on the local support without resizing or reordering", () => {
  for (let stage = 0; stage < 4; stage++) {
    const slots = shelfPositions(stage);
    for (const [index, id] of campaignBookIds.entries()) {
      const p = bookPlacement(stage, index, id),
        m = spineMetrics[id];
      assert.equal(p.left, slots[index].left);
      assert.equal(p.height, slots[index].height);
      assert.ok(
        Math.abs(
          p.width / p.height - ((756 / 496) * m.artWidth) / m.artHeight,
        ) < 1e-12,
      );
      assert.ok(
        m.contactY < m.top + m.artHeight,
        "translucent fringe is excluded",
      );
      const h = (p.height * 756) / 100,
        w = (p.width * 496) / 100,
        angle = (p.lean * Math.PI) / 180;
      const dx = (p.contactX * w) / 100 - w / 2,
        dy = (p.contactY * h) / 100 - h;
      const foot =
        756 -
        (p.bottom * 756) / 100 +
        Math.sin(angle) * dx +
        Math.cos(angle) * dy;
      assert.ok(Math.abs(foot - shelfY(stage, p.supportX)) < 1e-10);
    }
  }
});
