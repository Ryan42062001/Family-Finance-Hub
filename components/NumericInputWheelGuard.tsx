"use client";

import { useEffect } from "react";
import { protectFocusedNumberFromWheel } from "@/lib/dom/numeric-input-wheel";

/**
 * Installed once in the root shell: covers Profile, Planning, Paycheck,
 * Scenario Lab, onboarding, and all other native numeric inputs.
 * Keeps keyboard focus and native type=number / min / max / step behavior.
 */
export default function NumericInputWheelGuard() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      protectFocusedNumberFromWheel(event, {
        activeElement: document.activeElement,
        viewportHeight: window.innerHeight,
        getOverflow(element) {
          const style = window.getComputedStyle(element);
          return { x: style.overflowX, y: style.overflowY };
        },
        scrollPage(dx, dy) { window.scrollBy(dx, dy); },
      });
    };
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => document.removeEventListener("wheel", onWheel, true);
  }, []);
  return null;
}
