import * as React from "react";

/**
 * Keyboard handler: pressing Enter moves focus to the next focusable
 * form field inside the same container (skipping textareas which keep
 * native Enter = newline behavior). Attach to a wrapping <div onKeyDown={...}>.
 */
export function enterFocusNext(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (!target) return;
  const tag = target.tagName;
  // Allow newline in textareas and don't intercept buttons/links.
  if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
  // Allow form submission on submit buttons.
  if ((target as HTMLInputElement).type === "submit") return;

  const container = e.currentTarget as HTMLElement;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [role="combobox"]:not([disabled]), button[data-enter-focusable]:not([disabled])',
    ),
  ).filter((el) => el.offsetParent !== null || el === target);

  const idx = focusables.indexOf(target);
  if (idx === -1) return;
  const next = focusables[idx + 1];
  if (next) {
    e.preventDefault();
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== "checkbox" && next.type !== "radio") {
      try { next.select(); } catch {}
    }
  }
}