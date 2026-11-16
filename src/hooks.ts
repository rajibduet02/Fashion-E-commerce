import { useEffect } from "react";

export function useTitle(title: string) {
  useEffect(() => {
    document.title =
      title === "Home"
        ? "AURELLE — Discover Your Style. Try Before You Buy."
        : `${title} — AURELLE`;
  }, [title]);
}

export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

export function useLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
