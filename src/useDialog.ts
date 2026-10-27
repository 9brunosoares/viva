import { useEffect, useRef } from "react";
/** Keep only the visible reading/pause surface interactive and restore its opener. */
export function useDialog(open: boolean, onDismiss?: () => void) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".modal");
    if (!modal) return;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    const title = modal.querySelector("h2");
    if (title) {
      title.id ||= "viva-dialog-title";
      modal.setAttribute("aria-labelledby", title.id);
      modal.removeAttribute("aria-label");
    }
    const blocked: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = modal;
    while (branch.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of parent.children) {
        if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
        blocked.push({ element: sibling, inert: sibling.inert });
        sibling.inert = true;
      }
      if (parent.matches(".app")) break;
      branch = parent;
    }
    const elements = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,a[href],[tabindex="0"]',
        ),
      ).filter(
        (el) =>
          !el.closest("[inert]") &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== "hidden",
      );
    elements()[0]?.focus({ preventScroll: true });
    function trap(e: KeyboardEvent) {
      if (e.key === "Escape" && dismiss.current) {
        e.preventDefault();
        dismiss.current();
        return;
      }
      if (e.key !== "Tab") return;
      const targets = elements(),
        first = targets[0],
        last = targets.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      for (const { element, inert } of blocked) element.inert = inert;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
}
