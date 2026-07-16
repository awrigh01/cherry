"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * EscapeBack - Press Escape to return to the table (`/`), matching the
 * page's BACK link. Mounted on the book spread only.
 *
 * @example
 * ```tsx
 * <EscapeBack />
 * ```
 */
export function EscapeBack(): null {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      // Don't steal Esc from an open dialog / focused editable if one exists
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      router.push("/");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
