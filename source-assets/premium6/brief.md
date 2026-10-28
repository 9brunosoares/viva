# Viva! — Upgrade 6: Sophistication Pass

Engineering brief for Codex. Read it in full before touching code.

## 0. How to read this document

Read and execute this brief as a small, senior, multidisciplinary indie studio, not as a single coder. Each section is owned by one discipline (game design, gameplay engineering, art direction and asset pipeline, UX/UI, motion, QA, release). Before you implement a section, think as that specialist would: what makes this excellent, what could regress, and how will you prove it works.

The goal of this upgrade is to raise Viva! to a new level of finish and sophistication: more variety on the board, rewards that happen inside the world, a library that feels physically real, a more cinematic ending, and one coherent UI language.

The goal is **not** to add features at any cost. The current game works and is loved. Every change must be additive, isolated and reversible. If a change cannot be made safely, ship the safe subset and document what was deferred and why.

### 0.1 Hard constraints (non-negotiable)

1. **Audio is frozen.** Do not modify `src/audio.ts`, the audio settings key, volumes, effects, melodies, their trigger points or their timing. Do not add new sounds or new calls into the audio module. The only allowed audio-adjacent change is the *visual* restyle of the audio button (section 5), with zero behavior change.
2. **Progress is sacred.** `viva-progress-v1`, `viva-difficulty-v1`, `viva-stories-v1` and the existing campaign/book order semantics must stay backward compatible. A player mid-campaign on the current build must update and continue with nothing lost, nothing duplicated and no milestone replayed or skipped.
3. **Book order stays as is.** The order is drawn once per campaign and persisted. Do not change that logic.
4. **Easy stays effortless.** Easy exists so the player can walk through the whole story. Do not change existing moves or targets on any difficulty. New mechanics must not make Easy meaningfully harder (see 2.4).
5. **Texts are frozen** unless this brief explicitly gives new text. This includes the final dedication: *"Jogo criado por Bruno, um filho que te ama pra sempre e te admira pela eternidade."* — character for character.
6. **The surprises stay secret.** Nothing may anticipate Blade (after phase 5) or the family portrait and dedication (after phase 10) in intros, menus, file names shown to the player, previews or UI.
7. **No new runtime dependencies, no paid services, no backend.** Static PWA on GitHub Pages, offline-first, as today.
8. **Respect `prefers-reduced-motion`** for every new animation, live, as the current code does.

### 0.2 Verify the current state first

The external review that produced this brief was run on an earlier build. Some items it flagged are already done in the current build (for example, phase 9 is now Tatuagens and the synopsis is already deferred to the library). Before starting:

- Read `src/config.ts`, `src/engine.ts`, `src/Game.tsx`, `src/App.tsx`, `src/progress.ts`, `src/session.ts`, `src/libraryLayout.ts` and the existing upgrade notes (`GAMEPLAY.md`, `BIBLIOTECA.md`, `AMBIENTACAO.md`, `MOBILE.md`, `VALIDACAO.md`).
- Identify phases **by theme, not by index**, wherever this brief names a phase (Química, Ensino Infantil, Praia, Kung Fu, Meu Pet, Espiritismo, Roma, Pagode, Tatuagens, Família).
- Do not re-implement anything that already exists. If something in this brief conflicts with the current build in a way you cannot resolve, keep the current behavior and note it in the report.
- Create a git tag restore point before the first change, following the existing convention (for example `viva-pre-premium-6-YYYYMMDD`).

### 0.3 Scope at a glance

| # | Area | Owner |
|---|---|---|
| 1 | New art intake and cropping | Art direction / asset pipeline |
| 2 | Board obstacles and phase variety | Game design + gameplay engineering |
| 3 | Victory moment | Motion + gameplay engineering |
| 4 | Celebrations inside the library, dedicated shelf, keepsakes | UX + motion + art direction |
| 5 | Unified flat UI and typography | UX/UI |
| 6 | Cinematic ending | Motion + narrative |
| 7 | Blade's tail easter egg | Motion |
| 8 | QA, performance and release | QA + release |

Recommended implementation order: 1 → 5 → 3 → 2 → 4 → 6 → 7 → 8. UI and typography first because every later screen is built on them; the engine change (2) before the scenes that depend on keepsakes (4).

---

## 1. Art intake and cropping — Art direction / asset pipeline

New art is attached with this brief. Handle it with the same care as previous asset passes: originals preserved, crops by components with transparent margin, no fragments of neighbors, independent exports.

### 1.1 Expected deliverables

| Asset | Description | Use |
|---|---|---|
| Petals overlay | Top-down carpet of pink-coral and white petals, sparser in the center | Board cell layer (section 2) |
| Gift, 3 states | Front-facing square gift box that fills a cell: wrapped; ribbon removed; torn open with golden glow | Board blocker (section 2) |
| Keepsake sprite sheet | One high-resolution sheet, 4 × 2 grid, 8 keepsakes | Library and board (sections 2 and 4) |
| Blade's tail | Fluffy black chow chow tail, curled, flat-cut base | Easter egg (section 7) |
| Library backgrounds | Retouched stages with one empty shelf, higher resolution (~1008 × 1536) | Library (section 4) |

The keepsake sheet is ordered left to right, top to bottom:

| Cell | Keepsake | Phase (by theme) | Placement in library |
|---|---|---|---|
| 1 | Rolled chemistry diploma with ribbon and seal | Química | Surface |
| 2 | Child's crayon drawing on paper | Ensino Infantil | Surface or pinned to wall |
| 3 | Caipirinha | Praia | Surface |
| 4 | Black belt hanging from a wall peg | Kung Fu | Wall |
| 5 | Lit candle in gold candlestick | Espiritismo | Surface |
| 6 | Travel photo album with Colosseum cover | Roma | Surface |
| 7 | Small round smart speaker with light ring | Pagode | Surface |
| 8 | Framed line drawing of her first tattoo | Tatuagens | Wall |

Meu Pet and Família have **no keepsake** on purpose: their reward is Blade and the family portrait.

### 1.2 Process

1. Inspect every delivered image before cropping: real alpha vs. a painted checkerboard or white background, dimensions, angle, light direction, whether the content matches the table above. If an image deviates (for example, a cell is missing or two objects touch), crop what is usable and report the issue; do not invent or redraw art.
2. Keep originals untouched in `fotos/atlas_imagens/` (or the existing originals folder) with descriptive names.
3. Remove white or flat backgrounds only when real alpha is absent. Trim to content plus a uniform transparent margin, as in prior crops.
4. Export to WebP at sizes appropriate for the 3× iPhone display of their rendered size: board assets around 3× the cell's CSS size, keepsakes at the larger of their board and library sizes, backgrounds at the delivered resolution. Keep total asset weight reasonable; report the delta.
5. Register every new asset in the existing asset audit (`asset-audit.json` or equivalent) and in the service worker precache.
6. Verify keepsakes remain recognizable at board-cell size (~46 CSS px). If one is not, report it.

---

## 2. Board obstacles and phase variety — Game design + gameplay engineering

### 2.1 Design intent

The board today is the same 7 × 8 collection board in every phase. Add three gentle obstacles that fit the cozy, gift-like tone, introduced one at a time. They are texture, not walls: the player should notice them, enjoy clearing them and never feel stuck.

| Obstacle | Behavior | Feel |
|---|---|---|
| **Petals** (cell layer) | A layer under a cell's piece. Any clear that includes that cell (match, power, cascade) sweeps the petals away. The piece above behaves normally. | Like sweeping a floor of flowers |
| **Gift** (blocker tile) | Occupies a cell instead of a piece. Never matches, cannot be swapped or selected. Falls with gravity like a piece. Takes 2 hits: a match orthogonally adjacent or a power covering it removes one layer (wrapped → unwrapped → opens and disappears with a glow). | Opening a present |
| **Keepsake drop** (ingredient tile) | The phase's keepsake enters at the top. Never matches, but can be swapped like a piece. Falls with gravity. When it rests in the bottom row after the board settles, it is collected and flies to the objective counter. | Bringing a memory home |

Gifts falling with gravity is a deliberate low-risk choice: it avoids static blockers that create unfillable holes and diagonal-refill logic.

### 2.2 Phase distribution (identify phases by theme)

| Phase | Obstacles | New objective |
|---|---|---|
| Química | None | — |
| Ensino Infantil | None | — |
| Praia | Petals (debut, few cells) | Clear the petals |
| Kung Fu | Gifts (debut, few) | Open the gifts |
| Meu Pet | Light petals | Clear the petals |
| Espiritismo | Keepsake drop (debut: the candle), nothing else | Bring the keepsake down |
| Roma | Gifts + keepsake drop (album) | Both |
| Pagode | Petals (it already has the cascade objective) | Clear the petals |
| Tatuagens | Gifts + petals + keepsake drop (tattoo frame) | All three |
| Família | Light petals + light gifts | Both |

Keep quantities low. As a starting point: 6–10 petal cells, 2–4 gifts, 1 keepsake. Tune with simulation (2.4), never by intuition alone.

Each new obstacle's debut phase gets one short line in the existing intro or objective hint style, in Portuguese, consistent with the current tone. Examples (adjust to the existing copy voice): "Varra as pétalas combinando peças em cima delas." / "Combine ao lado dos presentes para abri-los." / "Leve a lembrança até o fundo do tabuleiro." No tutorial overlays.

Do not add obstacles to the infinite mode unless it is trivial and safe; if added, use only petals.

### 2.3 Engineering

Extend the engine; do not rewrite it.

- **Data model.** Add optional fields, defaulting to the current behavior:
  - a per-cell `petals` layer (boolean or 0/1 array of `COLS × ROWS`);
  - a tile `role` (or equivalent): `"piece"` (default), `"gift"` with `hp: 2 | 1`, `"keepsake"`.
  - A gift and a keepsake must never participate in `matches()`. Ensure `kind`-based comparisons cannot accidentally match them (use a sentinel that cannot equal a real kind, and guard explicitly).
- **Rules to update, with unit tests for each:** `matches`, `validSwap` (gifts not swappable; keepsake swappable but only valid if the swap creates a match, same as pieces), `moves` / the no-moves shuffle (shuffle must not destroy gifts, keepsakes or petals), gravity and refill, power clears (powers damage gifts in their area and clear petals; powers do not destroy the keepsake), cascade evaluation, victory evaluation after the last cascade (unchanged contract), the hint system (must ignore gifts and still prioritize objectives).
- **Board generation.** No initial matches (existing rule). Place petals and gifts deterministically from a per-level spec, seeded like the rest of the board. Spawn the keepsake on the top row after the first valid move or at a fixed early point; never spawn it in the bottom row.
- **Keepsake collection.** Collect only on a stable board, never mid-cascade. If the keepsake cannot progress for many moves, it is acceptable to let refill pull it down naturally; do not add special cheats.
- **Objectives.** Add objective kinds for petals, gifts and keepsake, rendered with the same objective chip component and their new icons. Difficulty scaling applies to the new targets in the same proportional way as existing ones, but Easy uses the base values.
- **Session persistence.** The session (`viva-session-v1` or its current name) stores the board. Store the new fields; a session saved by the previous build (without them) must load as a valid board with no obstacles. Bump the session schema version only if needed, with a migration. Do not touch `viva-progress-v1`.
- **Visuals.** Petals render beneath the piece and fade/scatter on clear. Gifts render in the cell with a darker wood cell background so the green paper does not blend with sage cells. Gift damage plays a small shake and swaps to the next state; opening plays a short glow and burst. Keepsake has a faint gold glint so it never reads as a piece. Use transforms and opacity only.
- **Accessibility.** Extend the tile `aria-label` with the obstacle state ("com pétalas", "presente fechado", "lembrança").

### 2.4 Balance — must be proven

Use the existing simulation harness (see `GAMEPLAY.md`, 960-simulation suite) and extend it to the new rules:

- Easy: win rate ≥ 99% with the existing simple bot, on every phase.
- Medium and Hard: no phase should become dramatically harder than before; report the before/after win rates and average remaining moves per phase.
- No board state where the keepsake or gifts make the board unsolvable without a shuffle that respects them.

If any phase fails the Easy threshold, reduce its obstacle count, do not touch moves or the base targets.

---

## 3. Victory moment — Motion + gameplay engineering

Current issues: the final "Conseguiu!" is translucent and low contrast over the pieces and is repeated by the status text below; "Uma dica" stays visible during the celebration; leftover moves have no payoff.

1. Make "Conseguiu!" legible: a solid warm backing (cream or gold card with soft edge), dark green text in the display font (section 5), centered over the board, scaling in with a gentle overshoot.
2. Show the message once. Hide the duplicate status line and hide "Uma dica" during the celebration.
3. **Leftover-moves finale.** After the last cascade, convert remaining moves into a short visual payoff: up to 8 random pieces flip into row/column powers one after another and fire. Hard cap of about 3 seconds. A tap anywhere skips to the reward. It must not change objectives, progress, rewards or saved state, and must operate on a throwaway copy of the board after victory is already recorded. Respect the audio freeze: no new sound calls; if the existing power activation path fires sound, either route the finale through a visual-only path or keep it silent. Reduced motion: skip the finale entirely.
4. Keep the existing contemplation window and transition timing as the baseline; total time from last match to reward must not grow by more than the finale's cap.

---

## 4. The library: celebrations, dedicated shelf, keepsakes — UX + motion + art direction

The library is the heart of the game. Rewards should happen **inside** it, not on separate document-like pages.

### 4.1 Dedicated shelf and physical integration

- Replace the library stage backgrounds with the retouched higher-resolution versions. Positions of furniture, Blade and the frame must be re-verified against the new images; update `libraryLayout.ts` coordinates by measuring the new art, not by guessing.
- One shelf is now empty in every stage. That shelf is reserved for the player's ten earned books. Place spines on it with a consistent baseline sitting exactly on the shelf top, consistent scale from stage to stage.
- Physical integration of spines: a soft contact shadow under each spine and a faint shadow on the back panel, a warm multiply tint matched to the shelf lighting (spines are currently brighter than the scene), slight variation in lean (0–3°) and height consistent with the art, and correct occlusion against foreground elements. They must look placed, not pasted.
- Earned spines stay tappable and open the book viewer exactly as today.

### 4.2 Keepsakes in the room

- On first completion of a phase that has a keepsake (section 1.1), its keepsake appears in the library at a fixed, curated spot: surface items on shelves, the side table or window sill; wall items (belt, tattoo frame) on the wall. Choose spots by studying the art so each object sits naturally with correct scale, perspective, contact shadow and lighting, and none collides with controls, Blade, the portrait or book spines in any stage.
- Keepsake visibility is **derived from `completed`** in the existing progress; no new progress key is needed. Players who already completed phases on the old build see the corresponding keepsakes immediately after updating, without an arrival animation.
- Keepsakes are decorative only: not tappable, no labels, no tooltip.

### 4.3 Celebrations inside the library

Rework the reward flow so it lands in the library scene. Keep the existing state machine, persistence steps (`pendingCelebration`, book/reveal/accept steps) and texts; change only presentation.

- **Book reward.** After the victory transition, show the library with a soft dim. The new book's cover rises to center at a generous size with title and author, plus the existing "Guardar na biblioteca" action. On accept, animate the cover shrinking and flying into its spine slot on the dedicated shelf (FLIP-style transform), then the spine settles with a tiny bounce and a brief warm glint. The first-ever reward keeps its existing short collection explanation, presented in the same in-library style.
- **Keepsake arrival.** In phases with a keepsake, after the book settles, the keepsake flies from the center to its spot and settles.
- **Blade's arrival** (after Meu Pet). Present it in the library: the scene dims slightly, Blade fades or slides in onto the rug using the existing sprites, with the existing card text and action. Keep his permanent position, poses, hidden menu and session-persisted pose exactly as they work today.
- Repeated phases and infinite mode keep their current reward behavior (no duplicate book, no duplicate keepsake).
- Reduced motion: replace flights with crossfades; all texts and actions remain.

### 4.4 Layout fixes

- Fix the overlap between the "Modo infinito" button and the family portrait on the final library state. Define safe zones for floating controls versus scene objects and verify every stage (0/10, 1/10, 5/10 with Blade, 10/10 with portrait) at 375 × 667, 390 × 844 and 430 × 932.

---

## 5. Unified flat UI and typography — UX/UI

### 5.1 One flat icon and button family

- Retire the ornate 3D control images (`control-back`, `control-pause`, `control-settings` and any similar ornate control art). Replace them with inline SVG icons in one flat family: cream circular button, thin gold border, dark green outline icons, the same visual language as the current round audio button. Same hit areas (minimum 44 × 44 pt).
- Restyle the audio button to match, visually only (see 0.1).
- Replace underlined text links ("Uma dica", "Ouvir", "Meus livros · N/10" and similar) with proper secondary controls: pill buttons or chips with the same family's styling. No underlined link styling anywhere in the game.
- Unify button hierarchy across all screens: one primary style (green with gold border), one secondary style, one icon-button style. Audit every screen and remove one-off variants.
- Keep all `aria-label`s and focus behavior.

### 5.2 Typography

- Replace the system fonts (Georgia, Trebuchet MS) with self-hosted, offline-cached open-license fonts. Recommended pairing (SIL Open Font License, free):
  - **Fraunces** (soft display serif) for titles: library title, phase names, book titles, "Conseguiu!", the ending headline.
  - **Nunito** (rounded sans) for UI and body: buttons, counters, objectives, synopsis.
  - A handwritten script for the final dedication only, for example **Caveat** or **Dancing Script**.
- Ship WOFF2 files in the repo, subset to Latin and Latin Extended (Portuguese accents must render), `font-display: swap`, preloaded where critical, added to the service worker precache. No runtime request to Google Fonts.
- Define a small type scale and use it everywhere. Check that counters and objective numbers use tabular figures.

---

## 6. Cinematic ending — Motion + narrative

After the tenth book is stored, replace the static ending card with a short choreography in the library. Keep the existing persisted steps and the existing melody exactly as they are, including when it starts (audio is frozen).

1. The library lights dim gradually (warm dark overlay, slight vignette), around 1.5 s.
2. The family portrait appears on the table where it will permanently live, with a soft glow.
3. The scene slowly pushes in toward the portrait (CSS transform scale and translate on the scene container), around 2.5–3 s, ease-in-out.
4. The headline appears in the display font, then the dedication appears line by line in the handwritten font, text exactly as specified in 0.1.
5. After a short pause, the existing "Voltar ao meu cantinho" action fades in. The action returns to the library with the portrait in place, as today; the existing option to reread the dedication from the portrait remains.

No melodrama: no confetti, no particles beyond a gentle glow. Reduced motion: no push-in, crossfades only, same texts. Interruption at any step resumes correctly using the existing persistence.

---

## 7. Blade's tail easter egg — Motion

- Applies **only** to the Meu Pet phase. Nowhere else, never again after it.
- During a Meu Pet match, Blade's tail peeks from behind the board frame (top or side edge, behind the frame in z-order) and wags 2–3 times, about 1.6 s per appearance, **twice per match** at random moments, only while the board is idle (no cascade, no selection, no dialog).
- The wag is a rotation from the tail's base with a soft ease; the tail slides in and out from behind the frame.
- `pointer-events: none`; it must never cover pieces or objectives or intercept input.
- It does not reveal Blade's name or arrival: no text, no sound, no interaction.
- Reduced motion: a single static peek, or skip entirely.
- Applies to first plays and replays of Meu Pet; not to infinite mode.

---

## 8. QA, performance and release — QA + release

### 8.1 Regression guarantees

- All existing unit tests and browser tests pass. Add tests for every new rule in section 2 and for every persistence path that changed.
- Migration test: take a progress and session snapshot from the current build at several points (0/10; mid-phase with a saved session; 5/10 right before Blade's reveal; 9/10; 10/10 after the ending), load them in the new build and verify continuity, keepsakes derived correctly, no duplicated rewards and no replayed milestones.
- Interruption tests: reload during the victory finale, during the book flight, during Blade's arrival and during each ending step.
- Verify the Meu Pet and Família intros still do not anticipate their reveals, and that the tail appears only in Meu Pet.

### 8.2 Device and performance checks

- Playwright in Chromium and WebKit at 375 × 667, 390 × 844 and 430 × 932, portrait. Capture screenshots of every screen and state and review them yourself as an art director would: overlaps, clipping, legibility, alignment, scale coherence.
- Animations use transform and opacity only; no layout thrash during cascades. Check frame pacing on WebKit with CPU throttling. Large images decode before their scene animates.
- Offline: install, go offline, play a phase, earn a book, reload. Fonts and new assets must load from cache.
- Reduced motion on and off, toggled live.

### 8.3 Iterate until satisfied

Do not stop at "it works". Play the full campaign on Easy at least once end to end, plus targeted phases on Medium and Hard. Compare before and after screenshots. Fix what a demanding art director, game designer and QA lead would reject. Repeat until you are genuinely satisfied with the result.

### 8.4 Release

1. Bump the service worker cache version so updates install cleanly; keep the existing coordinated, safe-screen update flow.
2. Write a report file in the style of the previous upgrades (for example `PREMIUM6.md`): what changed per section, files touched, new assets and their sizes, simulation results before/after, test results, known limitations and anything deferred.
3. Update `README.md` sections that describe changed behavior.
4. Commit in logical, reviewable commits and publish to GitHub (`main`) as in previous rounds, so the existing Pages workflow deploys it. Confirm the workflow run succeeded and that the published build loads.
