/** Best effort only: iOS browsers may offer no vibration API. */
export function hapticPower(combined = false, reduced = false) {
  if (
    reduced ||
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  )
    return false;
  try {
    return navigator.vibrate(combined ? [12, 24, 16] : 12);
  } catch {
    return false;
  }
}
