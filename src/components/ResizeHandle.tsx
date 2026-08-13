import { useRef, type MouseEvent as ReactMouseEvent } from "react";

interface Props {
  direction: "horizontal" | "vertical";
  onResize: (deltaPx: number) => void;
}

/** A thin draggable divider. Reports incremental pixel deltas as the user
 * drags — callers decide the sign (which way growth means bigger). */
export function ResizeHandle({ direction, onResize }: Props) {
  const lastRef = useRef(0);

  function onMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    lastRef.current = direction === "horizontal" ? e.clientX : e.clientY;

    function onMove(ev: MouseEvent) {
      const current = direction === "horizontal" ? ev.clientX : ev.clientY;
      const delta = current - lastRef.current;
      lastRef.current = current;
      onResize(delta);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return <div className={`resize-handle resize-handle-${direction}`} onMouseDown={onMouseDown} />;
}
