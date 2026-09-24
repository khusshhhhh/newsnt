"use client";

import { useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 5;

/**
 * Pointer-driven reordering for a wrapping grid of tiles. Works with a
 * mouse, a pen and touch — HTML5 drag-and-drop never fires on touch
 * screens, which is why photos couldn't be reordered on a phone or tablet.
 *
 * Each tile gets `tileProps(index)`; dragging moves the item live as the
 * pointer crosses other tiles, and `onCommit` fires once, on release, if
 * the order actually changed. A mouse can drag from anywhere on the tile;
 * touch only from the element given `handleProps()` (which disables
 * browser panning), so swiping across the grid still scrolls the page.
 * Focused tiles also move with the arrow keys.
 */
export function useReorder<T>({
  items,
  setItems,
  onCommit,
}: {
  items: T[];
  setItems: (items: T[]) => void;
  onCommit: (items: T[]) => void;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const itemsRef = useRef(items);
  const setItemsRef = useRef(setItems);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    itemsRef.current = items;
    setItemsRef.current = setItems;
    onCommitRef.current = onCommit;
  });

  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  function move(list: T[], from: number, to: number) {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function start(e: React.PointerEvent<HTMLElement>, index: number, fromHandle: boolean) {
    if (e.button !== 0) return;
    if (e.pointerType !== "mouse" && !fromHandle) return;
    // Let buttons inside the tile (remove, retry) keep working.
    if (!fromHandle && (e.target as HTMLElement).closest("button, a, input")) return;

    const container = (e.currentTarget as HTMLElement).closest("[data-reorder-root]");
    const startX = e.clientX;
    const startY = e.clientY;
    const startIndex = index;
    let current = index;
    let active = fromHandle;
    const snapshot = itemsRef.current;
    if (active) setDraggingIndex(current);

    function onMove(ev: PointerEvent) {
      if (!active) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        active = true;
        setDraggingIndex(current);
      }
      ev.preventDefault();
      const over = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>("[data-reorder-index]");
      if (!over || !container?.contains(over)) return;
      const target = Number(over.dataset.reorderIndex);
      if (Number.isNaN(target) || target === current) return;
      const next = move(itemsRef.current, current, target);
      current = target;
      setDraggingIndex(target);
      setItemsRef.current(next);
    }

    function onEnd(ev: PointerEvent) {
      cleanup();
      setDraggingIndex(null);
      if (!active) return;
      if (ev.type === "pointercancel") {
        setItemsRef.current(snapshot);
        return;
      }
      if (current !== startIndex) onCommitRef.current(itemsRef.current);
      // Swallow the click that follows a mouse drag (dispatched in the same
      // task as pointerup) so it doesn't trigger anything under the pointer.
      const swallow = (c: MouseEvent) => c.stopPropagation();
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      cleanupRef.current = null;
    }

    cleanupRef.current?.();
    cleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>, index: number) {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
    const target = index + delta;
    if (!delta || target < 0 || target >= itemsRef.current.length) return;
    e.preventDefault();
    const next = move(itemsRef.current, index, target);
    setItemsRef.current(next);
    onCommitRef.current(next);
  }

  return {
    draggingIndex,
    rootProps: { "data-reorder-root": "" },
    tileProps: (index: number) => ({
      "data-reorder-index": index,
      tabIndex: 0,
      "aria-roledescription": "sortable",
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => start(e, index, false),
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => onKeyDown(e, index),
    }),
    handleProps: (index: number) => ({
      style: { touchAction: "none" } as const,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        e.stopPropagation();
        start(e, index, true);
      },
    }),
  };
}
