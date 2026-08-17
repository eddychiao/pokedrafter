import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MARGIN = 12;
const CURSOR_OFFSET = 18;

interface Props {
  content: ReactNode;
  children: ReactNode;
  /** Element type for the trigger wrapper — 'div' for block contexts like the sprite box. */
  as?: 'span' | 'div';
  className?: string;
}

/**
 * Wraps a trigger element with a popup that follows the cursor and clamps itself to the
 * viewport, so it never gets clipped off the top/side of the screen the way a fixed
 * "always above" tooltip would near screen edges.
 */
export function HoverTarget({ content, children, as = 'span', className }: Props) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!point || !popRef.current) {
      setStyle({ visibility: 'hidden' });
      return;
    }
    const { width, height } = popRef.current.getBoundingClientRect();

    let left = point.x + CURSOR_OFFSET;
    if (left + width > window.innerWidth - MARGIN) left = point.x - width - CURSOR_OFFSET;
    left = Math.max(MARGIN, left);

    let top = point.y - height - CURSOR_OFFSET;
    if (top < MARGIN) top = point.y + CURSOR_OFFSET;
    if (top + height > window.innerHeight - MARGIN) top = Math.max(MARGIN, window.innerHeight - height - MARGIN);

    setStyle({ left, top, visibility: 'visible' });
  }, [point]);

  const Wrapper = as;

  return (
    <Wrapper
      className={`hover-wrap ${className ?? ''}`}
      onMouseMove={(e: MouseEvent) => setPoint({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPoint(null)}
    >
      {children}
      {point &&
        createPortal(
          <div className="hover-pop-float" ref={popRef} style={style}>
            {content}
          </div>,
          document.body,
        )}
    </Wrapper>
  );
}
