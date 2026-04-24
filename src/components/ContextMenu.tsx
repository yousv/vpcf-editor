import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { color, font, radius, shadow, transition, zIndex } from '../theme';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = 160;
  const menuHeight = items.length * 32 + 8;
  const adjustedX = x + menuWidth > viewportWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > viewportHeight ? y - menuHeight : y;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: adjustedY,
        left: adjustedX,
        zIndex: zIndex.toast + 10,
        background: color.surfaceRaised,
        border: `1px solid ${color.borderStrong}`,
        borderRadius: radius.lg,
        padding: '4px 0',
        minWidth: menuWidth,
        boxShadow: shadow.lg,
      }}
    >
      {items.map((item, idx) => (
        item.separator
          ? <div key={idx} style={{ height: 1, background: color.border, margin: '4px 0' }} />
          : <ContextMenuItemRow key={idx} item={item} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
};

const ContextMenuItemRow: React.FC<{ item: ContextMenuItem; onClose: () => void }> = ({
  item, onClose,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => { item.onClick(); onClose(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        height: 32,
        cursor: 'pointer',
        background: isHovered ? color.surfaceActive : 'transparent',
        color: item.danger ? color.error : color.text,
        fontSize: font.sizeSm,
        transition: transition.quick,
        userSelect: 'none',
      }}
    >
      {item.label}
    </div>
  );
};
