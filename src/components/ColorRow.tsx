import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { color, font, radius, size, space, transition } from '../theme';
import { Swatch } from './Primitives';
import type { ColorField } from '../types';
import { hexToRgb, isValidHex, parseColorString, rgbToHex } from '../utils/colorUtils';

interface ColorRowProps {
  field: ColorField;
  fieldIndex: number;
  filename: string;
  isActive: boolean;
  onActivate: (index: number) => void;
}

export const ColorRow: React.FC<ColorRowProps> = memo(({
  field, fieldIndex, filename, isActive, onActivate,
}) => {
  const pendingChange      = useAppStore((s) => s.fileEditorStates[filename]?.pendingChanges[fieldIndex]);
  const originalColors     = useAppStore((s) => s.fileEditorStates[filename]?.originalColors);
  const setPendingChange   = useAppStore((s) => s.setPendingChange);
  const resetPendingChange = useAppStore((s) => s.resetPendingChange);
  const pushToUndoStack    = useAppStore((s) => s.pushToUndoStack);

  const { originalRgb, hasAlpha, currentRgb, currentHex, currentAlpha, isModified, originalHex } = useMemo(() => {
    const origRgb  = originalColors?.[fieldIndex] ?? parseColorString(field.value);
    const parsed   = parseColorString(field.value);
    const alpha    = parsed.length === 4;
    const curRgb   = pendingChange?.newRgb ?? origRgb;
    const curHex   = rgbToHex(curRgb).toUpperCase();
    const curAlpha = alpha ? (pendingChange?.newRgb?.[3] ?? origRgb[3] ?? 255) : undefined;
    const modified = pendingChange !== undefined;
    const origHex  = rgbToHex(origRgb.slice(0, 3));
    return { originalRgb: origRgb, hasAlpha: alpha, currentRgb: curRgb, currentHex: curHex, currentAlpha: curAlpha, isModified: modified, originalHex: origHex };
  }, [pendingChange, originalColors, fieldIndex, field.value]);

  const [hexInputValue, setHexInputValue]     = useState(currentHex);
  const [alphaInputValue, setAlphaInputValue] = useState(String(currentAlpha ?? 255));
  const [isHovered, setIsHovered]             = useState(false);
  const hexDebounceTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerInputRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => { setHexInputValue(currentHex); }, [currentHex]);
  useEffect(() => { if (currentAlpha !== undefined) setAlphaInputValue(String(currentAlpha)); }, [currentAlpha]);

  const applyRgb = useCallback((newRgb: number[]) => {
    const withAlpha    = hasAlpha ? [...newRgb.slice(0, 3), currentAlpha ?? 255] : newRgb.slice(0, 3);
    const originalFull = hasAlpha ? [...originalRgb.slice(0, 3), originalRgb[3] ?? 255] : originalRgb.slice(0, 3);
    if (withAlpha.every((v, i) => v === originalFull[i])) resetPendingChange(filename, fieldIndex);
    else setPendingChange(filename, fieldIndex, withAlpha);
  }, [hasAlpha, currentAlpha, originalRgb, filename, fieldIndex, setPendingChange, resetPendingChange]);

  const handleHexChange = useCallback((value: string) => {
    setHexInputValue(value);
    if (hexDebounceTimer.current) clearTimeout(hexDebounceTimer.current);
    hexDebounceTimer.current = setTimeout(() => {
      const c = value.startsWith('#') ? value : '#' + value;
      if (isValidHex(c)) { const rgb = hexToRgb(c); if (rgb) applyRgb(rgb); }
    }, 80);
  }, [applyRgb]);

  const handleHexCommit = useCallback(() => {
    pushToUndoStack(filename);
    const c = hexInputValue.startsWith('#') ? hexInputValue : '#' + hexInputValue;
    if (isValidHex(c)) { const rgb = hexToRgb(c); if (rgb) applyRgb(rgb); }
    else setHexInputValue(currentHex);
  }, [hexInputValue, currentHex, applyRgb, filename, pushToUndoStack]);

  const handleAlphaCommit = useCallback(() => {
    if (!hasAlpha) return;
    pushToUndoStack(filename);
    const parsed = parseInt(alphaInputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(255, Math.max(0, parsed));
      setAlphaInputValue(String(clamped));
      const newRgb   = [...currentRgb.slice(0, 3), clamped];
      const origFull = [...originalRgb.slice(0, 3), originalRgb[3] ?? 255];
      if (newRgb.every((v, i) => v === origFull[i])) resetPendingChange(filename, fieldIndex);
      else setPendingChange(filename, fieldIndex, newRgb);
    } else {
      setAlphaInputValue(String(currentAlpha ?? 255));
    }
  }, [alphaInputValue, currentAlpha, currentRgb, originalRgb, hasAlpha, filename, fieldIndex, pushToUndoStack, setPendingChange, resetPendingChange]);

  const handleNativePicker = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rgb = hexToRgb(e.target.value);
    if (rgb) { applyRgb(rgb); setHexInputValue(rgbToHex(rgb).toUpperCase()); }
  }, [applyRgb]);

  const handleActivate = useCallback(() => onActivate(fieldIndex), [onActivate, fieldIndex]);

  const inlineInputStyle: React.CSSProperties = {
    height: size.inputHeightSm,
    padding: '0 9px',
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.md,
    color: color.text,
    fontSize: font.sizeSm,
    fontFamily: font.mono,
    flexShrink: 0,
    outline: 'none',
    transition: transition.quick,
  };

  const pickerHex = currentHex.startsWith('#') ? currentHex.toLowerCase() : '#' + currentHex.toLowerCase();

  return (
    <div
      onClick={handleActivate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.sm,
        padding: `0 ${space.md}px`,
        height: size.rowHeight,
        borderRadius: radius.lg,
        background: isActive ? color.surfaceActive : isHovered ? color.surfaceRaised : 'transparent',
        border: `1px solid ${isActive ? color.borderStrong : 'transparent'}`,
        cursor: 'pointer',
        flexShrink: 0,
        transition: transition.quick,
        position: 'relative',
      }}
    >
      {isModified && (
        <div style={{
          position: 'absolute', top: 9, left: 9,
          width: 5, height: 5, borderRadius: '50%', background: color.unsaved,
        }} />
      )}

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Swatch hexColor={currentHex.toLowerCase()} swatchSize={size.swatchMd} />
        {isModified && (
          <Swatch
            hexColor={originalHex}
            swatchSize={14}
            title={`Original: ${originalHex.toUpperCase()}`}
            style={{
              position: 'absolute', bottom: -3, right: -3,
              border: `2px solid ${color.surfaceRaised}`, borderRadius: radius.sm,
            }}
          />
        )}
      </div>

      <span style={{
        flex: 1, fontSize: font.sizeSm,
        color: isActive ? color.text : isHovered ? '#aaaaaa' : color.textMuted,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: transition.quick,
      }}>
        {field.fieldName}
      </span>

      <input
        value={hexInputValue}
        maxLength={7}
        onChange={(e) => handleHexChange(e.target.value)}
        onBlur={handleHexCommit}
        onKeyDown={(e) => { if (e.key === 'Enter') handleHexCommit(); }}
        onClick={(e) => e.stopPropagation()}
        style={{ ...inlineInputStyle, width: 96 }}
      />

      {hasAlpha && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: font.sizeXs, color: color.textFaint, fontFamily: font.mono }}>α</span>
          <input
            value={alphaInputValue}
            maxLength={3}
            onChange={(e) => setAlphaInputValue(e.target.value)}
            onBlur={handleAlphaCommit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAlphaCommit(); }}
            style={{ ...inlineInputStyle, width: 52 }}
          />
        </div>
      )}

      {isModified && (
        <button
          title={`Reset to ${originalHex.toUpperCase()}`}
          onClick={(e) => {
            e.stopPropagation();
            resetPendingChange(filename, fieldIndex);
            setHexInputValue(originalHex.toUpperCase());
          }}
          style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: `1px solid ${color.border}`, borderRadius: radius.md,
            cursor: 'pointer', flexShrink: 0, padding: 0, color: color.textMuted,
            transition: transition.quick,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = color.borderStrong; (e.currentTarget as HTMLButtonElement).style.color = color.text; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = color.border; (e.currentTarget as HTMLButtonElement).style.color = color.textMuted; }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.5 1.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M10.5 1v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <div
        style={{ position: 'relative', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
        title="Open color picker"
      >
        <input
          ref={pickerInputRef}
          type="color"
          value={pickerHex}
          onChange={handleNativePicker}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
        <button
          onClick={() => pickerInputRef.current?.click()}
          style={{
            width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pickerHex,
            border: `1px solid ${color.border}`,
            borderRadius: radius.md,
            cursor: 'pointer', flexShrink: 0, padding: 0,
            transition: transition.quick,
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = color.borderStrong)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = color.border)}
        >
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M10 2L12 4L5 11H3V9L10 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M8.5 3.5L10.5 5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="2.5" cy="12" r="1" fill="white"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
});
