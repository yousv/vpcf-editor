import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { color, font, radius, size, transition } from '../theme';
import { PickerButton, Swatch } from './Primitives';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import type { ColorPalette } from '../types';

interface SavedColorsPaletteProps {
  onColorSelect?: (hex: string) => void;
  selectedHex?: string | null;
  allowAddColor?: boolean;
}

interface ColorCtxMenu  { x: number; y: number; paletteId: string; colorIndex: number; hex: string; }
interface PaletteCtxMenu { x: number; y: number; paletteId: string; }

function genId() { return Math.random().toString(36).slice(2, 10); }

export const SavedColorsPalette: React.FC<SavedColorsPaletteProps> = ({
  onColorSelect, selectedHex, allowAddColor,
}) => {
  const { config, persistConfig } = useAppStore();
  const palettes = config.palettes;

  const [expandedId, setExpandedId]               = useState<string | null>(null);
  const [colorCtx, setColorCtx]                   = useState<ColorCtxMenu | null>(null);
  const [paletteCtx, setPaletteCtx]               = useState<PaletteCtxMenu | null>(null);
  const [editingPaletteId, setEditingPaletteId]   = useState<string | null>(null);
  const [editNameVal, setEditNameVal]               = useState('');
  const [editColorTarget, setEditColorTarget]       = useState<{ paletteId: string; idx: number; hex: string } | null>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  const save = useCallback((next: ColorPalette[]) => {
    persistConfig({ ...config, palettes: next });
  }, [config, persistConfig]);

  const addPalette = useCallback(() => {
    const id = genId();
    save([...palettes, { id, name: 'New Palette', colors: [] }]);
    setExpandedId(id);
    setEditingPaletteId(id);
    setEditNameVal('New Palette');
  }, [palettes, save]);

  const deletePalette = useCallback((id: string) => {
    save(palettes.filter(p => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }, [palettes, save, expandedId]);

  const movePalette = useCallback((id: string, dir: -1 | 1) => {
    const idx  = palettes.findIndex(p => p.id === id);
    if (idx === -1) return;
    const next = [...palettes];
    const to   = idx + dir;
    if (to < 0 || to >= next.length) return;
    [next[idx], next[to]] = [next[to], next[idx]];
    save(next);
  }, [palettes, save]);

  const commitName = useCallback((id: string) => {
    const t = editNameVal.trim();
    if (t) save(palettes.map(p => p.id === id ? { ...p, name: t } : p));
    setEditingPaletteId(null);
  }, [editNameVal, palettes, save]);

  const removeColor = useCallback((paletteId: string, idx: number) => {
    save(palettes.map(p =>
      p.id === paletteId ? { ...p, colors: p.colors.filter((_, i) => i !== idx) } : p
    ));
  }, [palettes, save]);

  const addColor = useCallback((paletteId: string, hex: string) => {
    const upper = hex.toUpperCase();
    save(palettes.map(p => {
      if (p.id !== paletteId) return p;
      if (p.colors.some(c => c.toUpperCase() === upper)) return p;
      return { ...p, colors: [...p.colors, upper] };
    }));
  }, [palettes, save]);

  const editColor = useCallback((paletteId: string, idx: number, hex: string) => {
    const upper = hex.toUpperCase();
    save(palettes.map(p =>
      p.id === paletteId
        ? { ...p, colors: p.colors.map((c, i) => i === idx ? upper : c) }
        : p
    ));
    setEditColorTarget(null);
  }, [palettes, save]);

  const moveColor = useCallback((paletteId: string, from: number, to: number) => {
    save(palettes.map(p => {
      if (p.id !== paletteId) return p;
      const next = [...p.colors];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...p, colors: next };
    }));
  }, [palettes, save]);

  useEffect(() => {
    if (editingPaletteId) setTimeout(() => { editNameRef.current?.focus(); editNameRef.current?.select(); }, 30);
  }, [editingPaletteId]);

  const expanded = palettes.find(p => p.id === expandedId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        overflowX: 'auto', overflowY: 'visible',
        scrollbarWidth: 'thin', scrollbarColor: `${color.border} transparent`,
        paddingBottom: 2,
      }}>
        {palettes.length === 0 && (
          <span style={{ fontSize: font.sizeXs, color: color.textFaint, whiteSpace: 'nowrap' }}>No palettes</span>
        )}
        {palettes.map(palette => (
          <PaletteChip
            key={palette.id}
            palette={palette}
            isExpanded={expandedId === palette.id}
            isEditing={editingPaletteId === palette.id}
            editNameVal={editNameVal}
            editNameRef={editNameRef}
            selectedHex={selectedHex}
            onToggle={() => setExpandedId(prev => prev === palette.id ? null : palette.id)}
            onContextMenu={(e) => {
              e.preventDefault(); e.stopPropagation();
              setPaletteCtx({ x: e.clientX, y: e.clientY, paletteId: palette.id });
            }}
            onEditNameChange={setEditNameVal}
            onEditNameCommit={() => commitName(palette.id)}
          />
        ))}
        <button
          onClick={addPalette}
          title="New palette"
          style={{
            height: 28, padding: '0 10px', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: `1px dashed ${color.borderStrong}`,
            borderRadius: radius.md, cursor: 'pointer',
            fontSize: font.sizeXs, color: color.textFaint, transition: transition.quick,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = color.textMuted; e.currentTarget.style.borderColor = color.textFaint; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = color.textFaint; e.currentTarget.style.borderColor = color.borderStrong; }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New Palette
        </button>
      </div>

      {expanded && (
        <ColorsRow
          palette={expanded}
          selectedHex={selectedHex}
          allowAddColor={allowAddColor}
          onColorSelect={onColorSelect}
          onAddColor={(hex) => addColor(expanded.id, hex)}
          onMoveColor={(from, to) => moveColor(expanded.id, from, to)}
          onColorContextMenu={(e, idx, hex) => {
            e.preventDefault(); e.stopPropagation();
            setColorCtx({ x: e.clientX, y: e.clientY, paletteId: expanded.id, colorIndex: idx, hex });
          }}
        />
      )}

      {editColorTarget && (
        <ColorEditOverlay
          hex={editColorTarget.hex}
          onCommit={(hex) => editColor(editColorTarget.paletteId, editColorTarget.idx, hex)}
          onCancel={() => setEditColorTarget(null)}
        />
      )}

      {colorCtx && (
        <ContextMenu
          x={colorCtx.x} y={colorCtx.y}
          items={[
            { label: 'Edit Color', onClick: () => setEditColorTarget({ paletteId: colorCtx.paletteId, idx: colorCtx.colorIndex, hex: colorCtx.hex }) },
            { label: 'Copy Hex',   onClick: () => navigator.clipboard.writeText(colorCtx.hex) },
            { separator: true } as ContextMenuItem,
            { label: 'Delete Color', danger: true, onClick: () => removeColor(colorCtx.paletteId, colorCtx.colorIndex) },
          ]}
          onClose={() => setColorCtx(null)}
        />
      )}

      {paletteCtx && (() => {
        const pIdx = palettes.findIndex(p => p.id === paletteCtx.paletteId);
        return (
          <ContextMenu
            x={paletteCtx.x} y={paletteCtx.y}
            items={[
              {
                label: 'Rename', onClick: () => {
                  const p = palettes.find(x => x.id === paletteCtx.paletteId);
                  if (p) { setEditingPaletteId(p.id); setEditNameVal(p.name); setExpandedId(p.id); }
                },
              },
              ...(pIdx > 0 ? [{ label: 'Move Left', onClick: () => movePalette(paletteCtx.paletteId, -1) }] : []),
              ...(pIdx < palettes.length - 1 ? [{ label: 'Move Right', onClick: () => movePalette(paletteCtx.paletteId, 1) }] : []),
              { separator: true } as ContextMenuItem,
              { label: 'Delete Palette', danger: true, onClick: () => deletePalette(paletteCtx.paletteId) },
            ]}
            onClose={() => setPaletteCtx(null)}
          />
        );
      })()}
    </div>
  );
};

const ColorsRow: React.FC<{
  palette: ColorPalette;
  selectedHex?: string | null;
  allowAddColor?: boolean;
  onColorSelect?: (hex: string) => void;
  onAddColor: (hex: string) => void;
  onMoveColor: (from: number, to: number) => void;
  onColorContextMenu: (e: React.MouseEvent, idx: number, hex: string) => void;
}> = ({
  palette, selectedHex, allowAddColor, onColorSelect, onAddColor,
  onMoveColor, onColorContextMenu,
}) => {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${color.border} transparent`,
      paddingBottom: 2, paddingTop: 2, minHeight: 34,
    }}>
      {palette.colors.length === 0 && !allowAddColor && (
        <span style={{ fontSize: font.sizeXs, color: color.textFaint }}>
          Right-click palette to manage
        </span>
      )}

      {palette.colors.map((hex, idx) => (
        <div
          key={`${hex}-${idx}`}
          draggable
          onDragStart={() => setDragFrom(idx)}
          onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null && dragFrom !== idx) onMoveColor(dragFrom, idx);
            setDragFrom(null); setDragOver(null);
          }}
          onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
          onContextMenu={(e) => onColorContextMenu(e, idx, hex)}
          style={{
            flexShrink: 0, cursor: 'grab',
            outline: dragOver === idx && dragFrom !== idx ? `2px dashed ${color.borderStrong}` : 'none',
            outlineOffset: 3, borderRadius: radius.md,
          }}
        >
          <Swatch
            hexColor={hex.toLowerCase()}
            swatchSize={size.swatchSm}
            selected={selectedHex?.toUpperCase() === hex.toUpperCase()}
            onClick={() => onColorSelect?.(hex)}
            title={hex}
          />
        </div>
      ))}

      {allowAddColor && (
        <PickerButton
          currentHex="#888888"
          onInput={(hex) => { if (/^#[0-9a-fA-F]{6}$/.test(hex)) onAddColor(hex); }}
          onCommit={() => {}}
          btnSize={size.swatchSm}
        />
      )}
    </div>
  );
};

const PaletteChip: React.FC<{
  palette: ColorPalette;
  isExpanded: boolean;
  isEditing: boolean;
  editNameVal: string;
  editNameRef: React.RefObject<HTMLInputElement>;
  selectedHex?: string | null;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onEditNameChange: (v: string) => void;
  onEditNameCommit: () => void;
}> = ({
  palette, isExpanded, isEditing, editNameVal, editNameRef,
  selectedHex, onToggle, onContextMenu, onEditNameChange, onEditNameCommit,
}) => {
  const [hovered, setHovered] = useState(false);
  const preview = palette.colors.slice(0, 4);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
      onClick={onToggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 28, padding: '0 9px', flexShrink: 0,
        background: isExpanded ? color.surfaceActive : hovered ? color.surfaceRaised : color.surface,
        border: `1px solid ${isExpanded ? color.borderStrong : color.border}`,
        borderRadius: radius.md, cursor: 'pointer', transition: transition.quick,
      }}
    >
      {isEditing ? (
        <input
          ref={editNameRef}
          value={editNameVal}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={onEditNameCommit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' || e.key === 'Escape') onEditNameCommit();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 90, height: 20, padding: '0 4px',
            background: color.surfaceHigh, border: `1px solid ${color.borderStrong}`,
            borderRadius: radius.sm, color: color.text, fontSize: font.sizeXs,
          }}
        />
      ) : (
        <span style={{
          fontSize: font.sizeXs,
          color: isExpanded ? color.text : color.textMuted,
          fontWeight: font.weightMedium, whiteSpace: 'nowrap',
          maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {palette.name}
        </span>
      )}

      {preview.length > 0 && (
        <div style={{ display: 'flex', gap: 3 }}>
          {preview.map((c, i) => (
            <div key={i} style={{
              width: 13, height: 13, borderRadius: 3,
              background: c.toLowerCase(), border: `1px solid ${color.border}`,
              boxShadow: selectedHex?.toUpperCase() === c.toUpperCase() ? `0 0 0 1.5px ${color.white}` : 'none',
            }} />
          ))}
          {palette.colors.length > 4 && (
            <span style={{ fontSize: 10, color: color.textFaint, lineHeight: '13px' }}>+{palette.colors.length - 4}</span>
          )}
        </div>
      )}
      {palette.colors.length === 0 && (
        <span style={{ fontSize: 10, color: color.textFaint }}>empty</span>
      )}
      <svg
        width="9" height="9" viewBox="0 0 10 10" fill="none"
        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.12s ease', flexShrink: 0, color: color.textFaint }}
      >
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

const ColorEditOverlay: React.FC<{
  hex: string;
  onCommit: (hex: string) => void;
  onCancel: () => void;
}> = ({ hex, onCommit, onCancel }) => {
  const [val, setVal] = useState(/^#/.test(hex) ? hex : '#' + hex);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(val)) onCommit(val);
    };
    document.addEventListener('mousedown', clickHandler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('mousedown', clickHandler); document.removeEventListener('keydown', keyHandler); };
  }, [onCancel, onCommit, val]);

  const safe = /^#[0-9a-fA-F]{6}$/.test(val) ? val : '#000000';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} style={{
        background: color.surfaceRaised, border: `1px solid ${color.borderStrong}`,
        borderRadius: radius.lg, padding: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
      }}>
        <div style={{ width: 220, height: 220, borderRadius: radius.md, overflow: 'hidden' }}>
          <input
            type="color" value={safe}
            onChange={(e) => setVal(e.target.value)}
            style={{ position: 'relative', inset: -8, width: 'calc(100% + 16px)', height: 'calc(100% + 16px)', border: 'none', padding: 0, cursor: 'crosshair' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <div style={{ width: 36, height: 36, borderRadius: radius.md, background: safe, border: `1px solid ${color.border}`, flexShrink: 0 }} />
          <input
            value={val}
            maxLength={7}
            onChange={(e) => setVal(e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommit(safe); }}
            style={{
              flex: 1, height: 36, padding: '0 10px',
              background: color.surface, border: `1px solid ${color.border}`,
              borderRadius: radius.md, color: color.text, fontSize: font.sizeSm, fontFamily: font.mono, outline: 'none',
            }}
          />
          <button
            onClick={() => onCommit(safe)}
            style={{
              height: 36, padding: '0 16px', background: color.white, border: 'none',
              borderRadius: radius.md, cursor: 'pointer', fontSize: font.sizeSm,
              fontWeight: font.weightMedium, color: '#000', flexShrink: 0,
            }}
          >Apply</button>
        </div>
      </div>
    </div>
  );
};
