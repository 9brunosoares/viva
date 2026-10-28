export const TEST_MODE_KEY = "viva-test-mode-v1";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
/** Local preference only; production QA flags never enable this control. */
export function readTestMode(storage?: Pick<Storage, "getItem">): boolean {
  try {
    return (storage ?? localStorage).getItem(TEST_MODE_KEY) === "true";
  } catch {
    return false;
  }
}
export function saveTestMode(
  enabled: boolean,
  storage?: Pick<PreferenceStorage, "setItem">,
): boolean {
  try {
    (storage ?? localStorage).setItem(TEST_MODE_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}
