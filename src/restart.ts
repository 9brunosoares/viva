import { fresh, KEY, type Progress } from "./progress";
import { SESSION_KEY, STORIES_KEY } from "./session";
import { DIFFICULTY_KEY } from "./difficulty";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** Called only after explicit in-game confirmation. Never clear unrelated data or audio preferences. */
export function restartJourney(storage: StorageLike): Progress | null {
  const keys = [KEY, SESSION_KEY, STORIES_KEY, DIFFICULTY_KEY];
  let previous: [string, string | null][] = [];
  try {
    previous = keys.map((key) => [key, storage.getItem(key)]);
    const progress = fresh();
    storage.setItem(KEY, JSON.stringify(progress));
    for (const key of keys.slice(1)) storage.removeItem(key);
    return progress;
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        /* Storage can be unavailable; never report success. */
      }
    }
    return null;
  }
}
