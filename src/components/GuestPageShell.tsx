"use client";

import { useEffect, type ReactNode } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

/**
 * Best-effort discourage copy / print / casual capture on the guest form page.
 * Limits: OS screenshot buttons and camera photos of the screen cannot be blocked.
 */
export function GuestPageShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.guestRoute = "1";
    document.body.classList.add("guest-route");

    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "p") {
        e.preventDefault();
        return;
      }
      if ((key === "c" || key === "x" || key === "a") && !isEditableTarget(e.target)) {
        e.preventDefault();
      }
    }

    function onCopy(e: ClipboardEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onCut(e: ClipboardEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onContextMenu(e: MouseEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    function onDragStart(e: DragEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("dragstart", onDragStart, true);

    return () => {
      delete document.documentElement.dataset.guestRoute;
      document.body.classList.remove("guest-route");
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("dragstart", onDragStart, true);
    };
  }, []);

  return (
    <div
      className="guest-form-protect min-h-dvh pb-20"
      onCopy={(e) => {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
      }}
      onCut={(e) => {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
      }}
      onContextMenu={(e) => {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
      }}
      onDragStart={(e) => {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
