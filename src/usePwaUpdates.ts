import { useEffect, useRef } from "react";

const RETURN_KEY = "viva-update-return";
export function consumeUpdateReturn(): "home" | "library" | "levels" | null {
  try {
    const route = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return route === "home" || route === "library" || route === "levels"
      ? route
      : null;
  } catch {
    return null;
  }
}

/** Install normally; only adopt an update from a safely saved, quiet navigation surface. */
export function usePwaUpdates(options: {
  safe: boolean;
  screen: string;
  persist: () => boolean;
}) {
  const latest = useRef(options);
  latest.current = options;
  const check = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (options.safe) check.current?.();
  }, [options.safe, options.screen]);
  useEffect(() => {
    if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined,
      disposed = false,
      reloadReady = false,
      reloaded = false,
      lastCheck = 0,
      lastRequest = 0;
    let controlled = !!navigator.serviceWorker.controller;
    let installedTimer = 0;
    let watched: ServiceWorker | undefined;
    const apply = () => {
      if (disposed || document.hidden || !latest.current.safe) return;
      if (reloadReady && !reloaded) {
        if (!latest.current.persist()) return;
        try {
          sessionStorage.setItem(RETURN_KEY, latest.current.screen);
        } catch {
          return;
        }
        reloaded = true;
        location.reload();
        return;
      }
      if (
        registration?.waiting &&
        Date.now() - lastRequest > 1000 &&
        latest.current.persist()
      ) {
        lastRequest = Date.now();
        registration.waiting.postMessage({ type: "ACTIVATE_VIVA" });
      }
      if (registration && Date.now() - lastCheck > 60000 && navigator.onLine) {
        lastCheck = Date.now();
        void registration.update().catch(() => {});
      }
    };
    check.current = apply;
    const controller = () => {
      if (controlled) {
        reloadReady = true;
        apply();
      }
      controlled = true;
    };
    const installed = () => {
      if (!disposed && watched?.state === "installed") {
        clearTimeout(installedTimer);
        installedTimer = window.setTimeout(apply, 50);
      }
    };
    const found = () => {
      const worker = registration?.installing ?? undefined;
      if (worker === watched) return;
      watched?.removeEventListener("statechange", installed);
      watched = worker;
      watched?.addEventListener("statechange", installed);
      installed();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controller);
    const ready = (event: MessageEvent) => {
      if (event.data?.type !== "VIVA_READY_CHECK" || !event.ports[0]) return;
      event.ports[0].postMessage({
        ready: latest.current.safe && latest.current.persist(),
      });
      event.ports[0].close();
    };
    navigator.serviceWorker.addEventListener("message", ready);
    document.addEventListener("visibilitychange", apply);
    window.addEventListener("pageshow", apply);
    window.addEventListener("online", apply);
    // Yield one paint so installation does not compete with the first render.
    const frame = requestAnimationFrame(() => {
      const script = new URL(`${import.meta.env.BASE_URL}sw.js`, location.href);
      void navigator.serviceWorker
        .getRegistration(script.href)
        .then((existing) =>
          existing?.scope === new URL("./", script).href
            ? existing
            : navigator.serviceWorker.register(script.href, {
                updateViaCache: "none",
              }),
        )
        .then((reg) => {
          if (disposed) return;
          registration = reg;
          reg.addEventListener("updatefound", found);
          found();
          apply();
        })
        .catch(() => {});
    });
    return () => {
      disposed = true;
      clearTimeout(installedTimer);
      watched?.removeEventListener("statechange", installed);
      check.current = null;
      cancelAnimationFrame(frame);
      registration?.removeEventListener("updatefound", found);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controller,
      );
      navigator.serviceWorker.removeEventListener("message", ready);
      document.removeEventListener("visibilitychange", apply);
      window.removeEventListener("pageshow", apply);
      window.removeEventListener("online", apply);
    };
  }, []);
}
