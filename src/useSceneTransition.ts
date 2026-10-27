import {
  useCallback,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

/** Brief sequential dissolves: one live scene, no browser snapshots or duplicate Games. */
export function useSceneTransition<T extends string>(
  screen: T,
  setScreen: Dispatch<SetStateAction<T>>,
  root: RefObject<HTMLElement | null>,
  reduced: boolean,
) {
  const active = useRef<Animation | null>(null),
    generation = useRef(0),
    current = useRef(screen),
    initial = useRef(true),
    leaving = useRef<HTMLElement | null>(null),
    destination = useRef<T | null>(null);
  current.current = screen;
  const preference = useRef(reduced);
  preference.current = reduced;
  const release = () => {
    if (leaving.current) leaving.current.inert = false;
    leaving.current = null;
  };
  function finishPending() {
    const next = destination.current;
    if (next === null) return;
    generation.current++;
    active.current?.cancel();
    release();
    destination.current = null;
    setScreen(next);
  }
  useLayoutEffect(() => {
    active.current?.cancel();
    active.current = null;
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (preference.current || document.hidden) return;
    const scene = root.current?.querySelector<HTMLElement>(":scope > section");
    const animation = scene?.animate?.([{ opacity: 0.3 }, { opacity: 1 }], {
      duration: 140,
      easing: "ease-out",
    });
    active.current = animation ?? null;
    return () => animation?.cancel();
  }, [screen, root]);
  useLayoutEffect(() => {
    if (reduced) {
      finishPending();
      active.current?.cancel();
    }
  }, [reduced]);
  useLayoutEffect(() => {
    const hidden = () => {
      if (document.hidden) finishPending();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  useLayoutEffect(
    () => () => {
      generation.current++;
      active.current?.cancel();
      release();
    },
    [],
  );
  return useCallback(
    (next: T) => {
      if (
        destination.current === next ||
        (current.current === next && !destination.current)
      )
        return;
      if (current.current === next) {
        generation.current++;
        active.current?.cancel();
        release();
        destination.current = null;
        return;
      }
      const token = ++generation.current;
      active.current?.cancel();
      release();
      destination.current = next;
      const apply = () => {
        if (token !== generation.current) return;
        release();
        destination.current = null;
        setScreen(next);
      };
      const scene =
        root.current?.querySelector<HTMLElement>(":scope > section");
      if (preference.current || !scene?.animate || document.hidden) {
        apply();
        return;
      }
      scene.inert = true;
      leaving.current = scene;
      const animation = scene.animate([{ opacity: 1 }, { opacity: 0.3 }], {
        duration: 80,
        easing: "ease-in",
        fill: "forwards",
      });
      active.current = animation;
      void animation.finished.then(apply).catch(() => {});
    },
    [setScreen, root],
  );
}
