import React, { useCallback, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { color, font, radius, size, space, transition } from '../theme';
import { Swatch } from './Primitives';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { hexToRgb, isValidHex, rgbToHex } from '../utils/colorUtils';

interface SavedColorsPaletteProps {
  onColorSelect?: (hex: string) => void;
  selectedHex?: string | null;
}

interface ContextMenuState {
  x: number; y: number; targetHex: string; targetIndex: number;
}

export const SavedColorsPalette: React.FC<SavedColorsPaletteProps> = ({ onColorSelect, selectedHex }) => {
  const { config, persistConfig } = useAppStore();
  const savedColors = config.savedColors;

  const draggedIndexRef               = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex]   = useState<number | null>(null);
  const [contextMenu, setContextMenu]     = useState<ContextMenuState | null>(null);
  const [editingIndex, setEditingIndex]   = useState<number | null>(null);
  const [editValue, setEditValue]         = useState('');
  const editInputRef                      = useRef<HTMLInputElement>(null);

  const persistColors = useCallback((colors: string[]) => {
    persistConfig({ ...config, savedColors: colors });
  }, [config, persistConfig]);

  const handleRemove = useCallback((hexColor: string) => {
    persistColors(savedColors.filter((c) => c.toUpperCase() !== hexColor.toUpperCase()));
  }, [savedColors, persistColors]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = draggedIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      draggedIndexRef.current = null;
      return;
    }
    const reordered = [...savedColors];
    const [moved]   = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    persistColors(reordered);
  }, [savedColors, persistColors]);

  const handleDragEnd = useCallback(() => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, hexColor: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, targetHex: hexColor, targetIndex: index });
  }, []);

  const startEdit = useCallback((index: number, currentHex: string) => {
    setEditingIndex(index);
    setEditValue(currentHex);
    setContextMenu(null);
    setTimeout(() => editInputRef.current?.focus(), 40);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingIndex === null) return;
    const trimmed   = editValue.trim();
    const candidate = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
    if (isValidHex(candidate)) {
      const rgb = hexToRgb(candidate);
      if (rgb) {
        const updated = [...savedColors];
        updated[editingIndex] = rgbToHex(rgb).toUpperCase();
        persistColors(updated);
      }
    }
    setEditingIndex(null);
  }, [editingIndex, editValue, savedColors, persistColors]);

  const getContextMenuItems = useCallback((hexColor: string, index: number): ContextMenuItem[] => [
    { label: 'Edit',     onClick: () => startEdit(index, hexColor) },
    { label: 'Copy Hex', onClick: () => navigator.clipboard.writeText(hexColor) },
    { separator: true } as ContextMenuItem,
    { label: 'Remove', danger: true, onClick: () => handleRemove(hexColor) },
  ], [startEdit, handleRemove]);

  if (savedColors.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: space.md, height: size.swatchSm }}>
        <span style={{ fontSize: font.sizeXs, color: color.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Saved
        </span>
        <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>None saved yet</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', minHeight: size.swatchSm }}>
        <span style={{ fontSize: font.sizeXs, color: color.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
          Saved
        </span>
        {savedColors.map((hexColor, index) => {
          if (editingIndex === index) {
            return (
              <input
                key={`edit-${index}`}
                ref={editInputRef}
                value={editValue}
                maxLength={7}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingIndex(null);
                }}
                style={{
                  width: 82, height: size.swatchSm, padding: '0 7px',
                  background: color.surfaceActive, border: `1px solid ${color.borderStrong}`,
                  borderRadius: radius.md, color: color.text,
                  fontSize: font.sizeSm, fontFamily: font.mono,
                }}
              />
            );
          }

          const isSelected = selectedHex?.toUpperCase() === hexColor.toUpperCase();
          const isDragged  = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;

          return (
            <div
              key={`${hexColor}-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onContextMenu={(e) => handleContextMenu(e, hexColor, index)}
              style={{
                opacity:     isDragged ? 0.2 : 1,
                outline:     isDragOver ? `2px dashed ${color.borderStrong}` : 'none',
                outlineOffset: 3,
                borderRadius: radius.md,
                transition:  transition.quick,
                cursor:      'grab',
                flexShrink:  0,
              }}
            >
              <Swatch
                hexColor={hexColor.toLowerCase()}
                swatchSize={size.swatchSm}
                selected={isSelected}
                onClick={() => onColorSelect?.(hexColor)}
                title={hexColor}
              />
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.targetHex, contextMenu.targetIndex)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};
