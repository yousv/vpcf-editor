import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { color, font, radius, size, space, transition } from '../theme';
import { PickerButton, RgbFields, Swatch } from './Primitives';
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
  const colorDisplayMode   = useAppStore((s) => s.config.colorDisplayMode);
  const pushToast          = useAppStore((s) => s.pushToast);
  const addHistoryEntry    = useAppStore((s) => s.addHistoryEntry);

  const { originalRgb, hasAlpha, currentRgb, currentHex, currentAlpha, isModified, originalHex } = useMemo(() => {
    const origRgb  = originalColors?.[fieldIndex] ?? parseColorString(field.value);
    const parsed   = parseColorString(field.value);
    const alpha    = parsed.length === 4;
    const curRgb   = pendingChange?.newRgb ?? origRgb;
    const curHex   = rgbToHex(curRgb).toUpperCase();
    const curAlpha = alpha ? (pendingChange?.newRgb?.[3] ?? origRgb[3] ?? 255) : undefined;
    const origHex  = rgbToHex(origRgb.slice(0, 3));
    return {
      originalRgb: origRgb, hasAlpha: alpha,
      currentRgb: curRgb, currentHex: curHex, currentAlpha: curAlpha,
      isModified: pendingChange !== undefined, originalHex: origHex,
    };
  }, [pendingChange, originalColors, fieldIndex, field.value]);

  const isRgbMode = colorDisplayMode === 'rgb';
  const pickerHex = useMemo(() => {
    const raw = currentHex.startsWith('#') ? currentHex.toLowerCase() : '#' + currentHex.toLowerCase();
    return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#000000';
  }, [currentHex]);

  const [hexInputValue, setHexInputValue]     = useState(currentHex);
  const [alphaInputValue, setAlphaInputValue] = useState(String(currentAlpha ?? 255));
  const [isHovered, setIsHovered]             = useState(false);

  useEffect(() => { setHexInputValue(currentHex); }, [currentHex]);
  useEffect(() => { if (currentAlpha !== undefined) setAlphaInputValue(String(currentAlpha)); }, [currentAlpha]);

  // Track whether we've pushed to undo within the current RGB edit session.
  // Resets after a short delay on blur so tabbing between R/G/B doesn't double-push.
  const rgbUndoPushedRef  = useRef(false);
  const rgbResetTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyRgb = useCallback((newRgb: number[]) => {
    const withAlpha    = hasAlpha ? [...newRgb.slice(0, 3), currentAlpha ?? 255] : newRgb.slice(0, 3);
    const originalFull = hasAlpha ? [...originalRgb.slice(0, 3), originalRgb[3] ?? 255] : originalRgb.slice(0, 3);
    if (withAlpha.every((v, i) => v === originalFull[i])) resetPendingChange(filename, fieldIndex);
    else setPendingChange(filename, fieldIndex, withAlpha);
  }, [hasAlpha, currentAlpha, originalRgb, filename, fieldIndex, setPendingChange, resetPendingChange]);

  // Log to toast + history — does NOT push to undo (callers do that before applying)
  const commitEdit = useCallback((newHex: string) => {
    pushToast('info', `${field.fieldName}: ${originalHex.toUpperCase()} → ${newHex.toUpperCase()}`);
    addHistoryEntry({
      action: 'edit', filename, fieldName: field.fieldName,
      oldHex: originalHex.toUpperCase(), newHex: newHex.toUpperCase(),
      description: `Edit ${field.fieldName} in ${filename}`,
    });
  }, [filename, field.fieldName, originalHex, pushToast, addHistoryEntry]);

  const handleHexCommit = useCallback(() => {
    const c   = hexInputValue.startsWith('#') ? hexInputValue : '#' + hexInputValue;
    const rgb = isValidHex(c) ? hexToRgb(c) : null;
    if (rgb) {
      // Push BEFORE applying so the snapshot captures the old state
      pushToUndoStack(filename);
      applyRgb(rgb);
      commitEdit(c);
    } else {
      setHexInputValue(currentHex);
    }
  }, [hexInputValue, currentHex, applyRgb, commitEdit, pushToUndoStack, filename]);

  const handleRgbFocus = useCallback(() => {
    // Cancel any pending reset from a previous blur so tabbing R→G→B only pushes once
    if (rgbResetTimerRef.current) clearTimeout(rgbResetTimerRef.current);
    if (!rgbUndoPushedRef.current) {
      pushToUndoStack(filename);
      rgbUndoPushedRef.current = true;
    }
  }, [filename, pushToUndoStack]);

  const handleRgbCommit = useCallback(() => {
    commitEdit(currentHex);
    // Allow a short window so tabbing between R/G/B doesn't reset the flag prematurely
    rgbResetTimerRef.current = setTimeout(() => {
      rgbUndoPushedRef.current = false;
    }, 120);
  }, [currentHex, commitEdit]);

  const handleAlphaCommit = useCallback(() => {
    if (!hasAlpha) return;
    const parsed = parseInt(alphaInputValue, 10);
    if (!isNaN(parsed)) {
      const clamped  = Math.min(255, Math.max(0, parsed));
      setAlphaInputValue(String(clamped));
      const newRgb   = [...currentRgb.slice(0, 3), clamped];
      const origFull = [...originalRgb.slice(0, 3), originalRgb[3] ?? 255];
      // Push BEFORE applying
      pushToUndoStack(filename);
      if (newRgb.every((v, i) => v === origFull[i])) resetPendingChange(filename, fieldIndex);
      else setPendingChange(filename, fieldIndex, newRgb);
      commitEdit(currentHex);
    } else {
      setAlphaInputValue(String(currentAlpha ?? 255));
    }
  }, [alphaInputValue, currentAlpha, currentHex, currentRgb, originalRgb, hasAlpha, filename, fieldIndex, resetPendingChange, setPendingChange, commitEdit, pushToUndoStack]);

  const handlePickerApply = useCallback((hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    // Push BEFORE applying
    pushToUndoStack(filename);
    applyRgb(rgb);
    if (!isRgbMode) setHexInputValue(rgbToHex(rgb).toUpperCase());
    commitEdit(hex);
  }, [applyRgb, isRgbMode, commitEdit, pushToUndoStack, filename]);

  const handleRevert = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    pushToUndoStack(filename);
    resetPendingChange(filename, fieldIndex);
    pushToast('info', `Reverted ${field.fieldName}`);
    addHistoryEntry({
      action: 'revert', filename, fieldName: field.fieldName,
      oldHex: currentHex, newHex: originalHex.toUpperCase(),
      description: `Revert ${field.fieldName} in ${filename}`,
    });
  }, [filename, fieldIndex, field.fieldName, currentHex, originalHex, pushToUndoStack, resetPendingChange, pushToast, addHistoryEntry]);

  const inlineInputStyle: React.CSSProperties = {
    height: size.inputHeightSm, padding: '0 9px',
    background: color.surface, border: `1px solid ${color.border}`,
    borderRadius: radius.md, color: color.text,
    fontSize: font.sizeSm, fontFamily: font.mono,
    flexShrink: 0, outline: 'none', transition: transition.quick,
  };

  return (
    <div
      onClick={() => onActivate(fieldIndex)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: space.sm,
        padding: `0 ${space.md}px`, height: size.rowHeight,
        borderRadius: radius.lg, flexShrink: 0,
        background: isActive ? color.surfaceActive : isHovered ? color.surfaceRaised : 'transparent',
        border: `1px solid ${isModified ? color.unsaved : isActive ? color.borderStrong : 'transparent'}`,
        cursor: 'pointer', transition: transition.quick,
      }}
    >
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

      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexShrink: 0 }}>
        {isRgbMode ? (
          <RgbFields
            rgb={currentRgb}
            onChange={(rgb) => applyRgb(rgb)}
            onCommit={handleRgbCommit}
            onFocus={handleRgbFocus}
          />
        ) : (
          <input
            value={hexInputValue}
            maxLength={7}
            onChange={(e) => {
              setHexInputValue(e.target.value);
              const c = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
              if (isValidHex(c)) { const rgb = hexToRgb(c); if (rgb) applyRgb(rgb); }
            }}
            onBlur={handleHexCommit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleHexCommit(); }}
            onClick={(e) => e.stopPropagation()}
            style={{ ...inlineInputStyle, width: 96 }}
          />
        )}

        {hasAlpha && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
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
            title={`Revert to ${originalHex.toUpperCase()}`}
            onClick={handleRevert}
            style={{
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: `1px solid ${color.border}`, borderRadius: radius.md,
              cursor: 'pointer', flexShrink: 0, padding: 0, color: color.textMuted, transition: transition.quick,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.borderStrong; e.currentTarget.style.color = color.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.color = color.textMuted; }}
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.5 1.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10.5 1v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <PickerButton
          currentHex={pickerHex}
          onInput={handlePickerApply}
          onCommit={() => {}}
          btnSize={30}
        />
      </div>
    </div>
  );
});
