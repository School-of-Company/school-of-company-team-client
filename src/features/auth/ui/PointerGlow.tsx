"use client";

import { useEffect, useRef } from "react";

/**
 * Brand glow behind the sign-in block that eases toward the pointer.
 * Moves with transform only; stays still for reduced motion and coarse (touch) pointers.
 */
export function PointerGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    )
      return;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    const tick = () => {
      x += (targetX - x) * 0.07;
      y += (targetY - y) * 0.07;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame =
        Math.abs(targetX - x) + Math.abs(targetY - y) > 0.4
          ? requestAnimationFrame(tick)
          : 0;
    };
    const onMove = (event: PointerEvent) => {
      // ponytail: follow at 60% of the offset from the resting point so the glow stays near the block.
      targetX = (event.clientX - window.innerWidth / 2) * 0.6;
      targetY = (event.clientY - window.innerHeight * 0.42) * 0.6;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={ref} aria-hidden="true" className="ui-identity-glow" />;
}
