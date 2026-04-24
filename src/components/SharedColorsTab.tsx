import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import type { SharedPendingEdit } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, size, space } from '../theme';
import { Badge, Button, Swatch } from './Primitives';
import { SavedColorsPalette } from './SavedColorsPalette';
import { hexToRgb, isValidHex, rgbToHex } from '../utils/colorUtils';
import type { SharedColorGroup } from '../types';

function buildRangeGradient(rgb: number[], threshold: number): string {
  const channelDelta = Math.round(threshold / Math.sqrt(3));
  const lowerBound   = rgb.map(v => Math.max(0, v - channelDelta));
  const upperBound   = rgb.map(v => Math.min(255, v + channelDelta));
  return `linear-gradient(to right, ${rgbToHex(lowerBound)}, ${rgbToHex(rgb)}, ${rgbToHex(upperBound)})`;
}

function groupKey(group: SharedColorGroup, idx: number): string {
  return `${group.hex}-${idx}`;
}

export const SharedColorsTab: React.FC = () => {
  const {
    config, persistConfig, loadedFiles, updateFileFields, pushToast,
    navigateToFileInEditor, sharedPendingEdits, setSharedPendingEdit,
    clearSharedPendingEdit, clearAllSharedPendingEdits,
  } = useAppStore();

  const [sharedGroups, setSharedGroups]             = useState<SharedColorGroup[]>([]);
  const [isLoading, setIsLoading]                   = useState(false);
  const [isApplyingAll, setIsApplyingAll]           = useState(false);
  const [selectedPaletteHex, setSelectedPaletteHex] = useState<string | null>(null);
  const [localThreshold, setLocalThreshold]         = useState(config.colorMatchThreshold);
  const debounceTimer                               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingCount = Object.keys(sharedPendingEdits).length;
  const hasUnsaved   = pendingCount > 0;

  const fetchSharedColors = useCallback(async (threshold: number) => {
    if (loadedFiles.length === 0) return;
    setIsLoading(true);
    try {
      const groups = await tauriCommands.computeSharedColors(threshold);
      setSharedGroups(groups);
    } catch (err) {
      pushToast('error', `Failed to compute shared colors: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadedFiles.length]);

  useEffect(() => {
    fetchSharedColors(config.colorMatchThreshold);
  }, [loadedFiles.length]);

  const handleThresholdChange = useCallback((newValue: number) => {
    setLocalThreshold(newValue);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      await persistConfig({ ...config, colorMatchThreshold: newValue });
      fetchSharedColors(newValue);
    }, 180);
  }, [config, fetchSharedColors, persistConfig]);

  const handleGroupApplied = useCallback((key: string, results: any[]) => {
    results.forEach((r) => updateFileFields(r.filename, r.fields));
    clearSharedPendingEdit(key);
    fetchSharedColors(localThreshold);
    pushToast('success', `Updated ${results.length} file${results.length !== 1 ? 's' : ''}`);
  }, [localThreshold, updateFileFields, clearSharedPendingEdit, fetchSharedColors, pushToast]);

  const handleApplyAll = useCallback(async () => {
    if (!hasUnsaved) return;
    setIsApplyingAll(true);
    let totalFiles = 0;
    let failed = 0;
    for (const [key, edit] of Object.entries(sharedPendingEdits)) {
      const newRgb = hexToRgb(edit.newHex);
      if (!newRgb) continue;
      try {
        const results = await tauriCommands.applySharedColor(edit.oldRgb, newRgb, localThreshold);
        results.forEach((r) => updateFileFields(r.filename, r.fields));
        totalFiles += results.length;
        clearSharedPendingEdit(key);
      } catch {
        failed++;
      }
    }
    await fetchSharedColors(localThreshold);
    setIsApplyingAll(false);
    if (failed > 0) pushToast('error', `${failed} group(s) failed to apply`);
    else pushToast('success', `Applied all changes across ${totalFiles} file(s)`);
  }, [sharedPendingEdits, localThreshold, hasUnsaved]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: `${space.md}px ${space.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: space.md, flexShrink: 0, borderBottom: `1px solid ${color.border}`, minHeight: 58,
      }}>
        <SavedColorsPalette onColorSelect={setSelectedPaletteHex} selectedHex={selectedPaletteHex} />
      </div>

      <div style={{
        padding: `${space.md}px ${space.xl}px`,
        display: 'flex', alignItems: 'center', gap: space.xl,
        flexShrink: 0, borderBottom: `1px solid ${color.border}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Match Threshold</span>
            <span style={{ fontSize: font.sizeSm, fontFamily: font.mono, color: color.text }}>
              {Math.round(localThreshold)}
            </span>
          </div>
          <input
            type="range" min={5} max={120} step={1}
            value={localThreshold}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: color.text }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: font.sizeXs, color: color.textFaint }}>Lower — more strict grouping</span>
            <span style={{ fontSize: font.sizeXs, color: color.textFaint }}>Higher — less strict grouping</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space.md, flexShrink: 0 }}>
          {sharedGroups.length > 0 && (
            <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>
              {sharedGroups.length} group{sharedGroups.length !== 1 ? 's' : ''}
            </span>
          )}
          <Button height={size.buttonSm} onClick={() => fetchSharedColors(localThreshold)} disabled={isLoading}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.5 1.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10.5 1v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: `${space.sm}px ${space.md}px` }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: color.textMuted, fontSize: font.sizeMd }}>
            Computing…
          </div>
        ) : sharedGroups.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: color.textMuted, fontSize: font.sizeMd }}>
            {loadedFiles.length === 0 ? 'Load a folder first' : 'No shared colors found'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sharedGroups.map((group, idx) => {
              const key = groupKey(group, idx);
              return (
                <SharedColorCard
                  key={key}
                  group={group}
                  cardKey={key}
                  selectedPaletteHex={selectedPaletteHex}
                  threshold={localThreshold}
                  pendingEdit={sharedPendingEdits[key]}
                  onHexChange={(k, edit) => setSharedPendingEdit(k, edit)}
                  onNavigateToFile={navigateToFileInEditor}
                  onApplied={(results) => handleGroupApplied(key, results)}
                  pushToast={pushToast}
                />
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        flexShrink: 0, background: color.surface, borderTop: `1px solid ${color.border}`,
        padding: `0 ${space.xl}px`, display: 'flex', alignItems: 'center',
        gap: space.md, height: size.bottomBarHeight,
      }}>
        <Button
          variant="primary"
          height={size.buttonMd}
          width={172}
          onClick={handleApplyAll}
          disabled={!hasUnsaved || isApplyingAll}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h8l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4 2v3h6V2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {isApplyingAll ? 'Applying…' : 'Apply All'}
        </Button>
        <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>
          {hasUnsaved
            ? `${pendingCount} group${pendingCount !== 1 ? 's' : ''} with pending changes`
            : 'No pending changes'}
        </span>
        {hasUnsaved && (
          <button
            onClick={clearAllSharedPendingEdits}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: font.sizeXs, color: color.textFaint, padding: '4px 8px',
            }}
          >
            Discard all
          </button>
        )}
      </div>
    </div>
  );
};

interface SharedColorCardProps {
  group: SharedColorGroup;
  cardKey: string;
  selectedPaletteHex: string | null;
  threshold: number;
  pendingEdit: SharedPendingEdit | undefined;
  onHexChange: (key: string, edit: SharedPendingEdit) => void;
  onNavigateToFile: (filename: string) => void;
  onApplied: (results: any[]) => void;
  pushToast: (type: any, message: string) => void;
}

const SharedColorCard: React.FC<SharedColorCardProps> = ({
  group, cardKey, selectedPaletteHex, threshold, pendingEdit,
  onHexChange, onNavigateToFile, onApplied, pushToast,
}) => {
  const initialHex = pendingEdit?.newHex ?? group.hex.toUpperCase();

  const [newHexInputValue, setNewHexInputValue] = useState(initialHex);
  const [previewHexColor, setPreviewHexColor]   = useState(pendingEdit?.newHex ?? group.hex.toLowerCase());
  const [isExpanded, setIsExpanded]             = useState(false);
  const [isApplying, setIsApplying]             = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const pickerInputRef                          = useRef<HTMLInputElement>(null);

  const isModified = previewHexColor.replace('#', '').toLowerCase() !== group.hex.replace('#', '').toLowerCase();

  const notifyHexChange = useCallback((hex: string) => {
    const candidate = hex.startsWith('#') ? hex : '#' + hex;
    if (isValidHex(candidate)) {
      onHexChange(cardKey, { newHex: candidate.toLowerCase(), oldRgb: group.rgb });
    }
  }, [cardKey, group.rgb, onHexChange]);

  const handleHexInputChange = useCallback((value: string) => {
    setNewHexInputValue(value);
    const candidate = value.startsWith('#') ? value : '#' + value;
    if (isValidHex(candidate)) {
      setPreviewHexColor(candidate.toLowerCase());
      notifyHexChange(candidate);
    }
  }, [notifyHexChange]);

  const handleHexInputCommit = useCallback(() => {
    const candidate = newHexInputValue.startsWith('#') ? newHexInputValue : '#' + newHexInputValue;
    if (isValidHex(candidate)) {
      setPreviewHexColor(candidate.toLowerCase());
      notifyHexChange(candidate);
    } else {
      setNewHexInputValue(group.hex.toUpperCase());
      setPreviewHexColor(group.hex.toLowerCase());
    }
  }, [newHexInputValue, group.hex, notifyHexChange]);

  const handleUseSavedPaletteColor = useCallback(() => {
    if (!selectedPaletteHex) { pushToast('warning', 'Select a saved color from the palette first'); return; }
    setNewHexInputValue(selectedPaletteHex.toUpperCase());
    setPreviewHexColor(selectedPaletteHex.toLowerCase());
    notifyHexChange(selectedPaletteHex);
  }, [selectedPaletteHex, notifyHexChange]);

  const doApply = useCallback(async () => {
    const candidate = previewHexColor.startsWith('#') ? previewHexColor : '#' + previewHexColor;
    const newRgb    = hexToRgb(candidate);
    if (!newRgb) { pushToast('error', 'Invalid color value'); return; }
    if (newRgb[0] === group.rgb[0] && newRgb[1] === group.rgb[1] && newRgb[2] === group.rgb[2]) {
      pushToast('info', 'New color is the same as current'); return;
    }
    setIsApplying(true);
    setShowConfirm(false);
    try {
      const results = await tauriCommands.applySharedColor(group.rgb, newRgb, threshold);
      onApplied(results);
    } catch (err) {
      pushToast('error', `Apply failed: ${err}`);
    } finally {
      setIsApplying(false);
    }
  }, [previewHexColor, group.rgb, threshold]);

  const handleApplyClick = useCallback(() => {
    if (group.count > 1) { setShowConfirm(true); return; }
    doApply();
  }, [group.count, doApply]);

  const rangeGradient = buildRangeGradient(group.rgb, threshold);

  const inlineInputStyle: React.CSSProperties = {
    height: size.inputHeightSm, padding: '0 9px',
    background: color.surface, border: `1px solid ${color.border}`,
    borderRadius: radius.md, color: color.text,
    fontSize: font.sizeSm, fontFamily: font.mono,
  };

  return (
    <div style={{
      borderRadius: radius.lg, background: color.surfaceRaised,
      border: `1px solid ${isModified ? `${color.unsaved}50` : color.border}`,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.md, padding: `${space.md}px ${space.lg}px` }}>
        <div style={{ flexShrink: 0 }}>
          <Swatch hexColor={group.hex.toLowerCase()} swatchSize={size.swatchLg} />
          <div
            title={`Match range ±${Math.round(threshold / Math.sqrt(3))} per channel`}
            style={{
              width: size.swatchLg, height: 5, borderRadius: 3,
              background: rangeGradient, marginTop: 4, border: `1px solid ${color.border}`,
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <span style={{ fontSize: font.sizeSm, fontWeight: font.weightSemiBold, fontFamily: font.mono, color: color.text }}>
              {group.hex.toUpperCase()}
            </span>
            {isModified && (
              <span style={{
                fontSize: font.sizeXs, color: color.unsaved, fontWeight: font.weightMedium,
                background: `${color.unsaved}18`, border: `1px solid ${color.unsaved}40`,
                borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap',
              }}>
                unsaved
              </span>
            )}
            {group.fieldNames.map((fieldName) => (
              <Badge key={fieldName} badgeColor={color.textMuted}>{fieldName || 'gradient'}</Badge>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginTop: 6, flexWrap: 'wrap' }}>
            <Badge badgeColor={color.warning}>{group.count} file{group.count !== 1 ? 's' : ''}</Badge>
            <Badge badgeColor={color.textFaint}>{group.total} instance{group.total !== 1 ? 's' : ''}</Badge>
            <button
              onClick={() => setIsExpanded((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: color.textMuted, fontSize: font.sizeXs, padding: '2px 4px' }}
            >
              {isExpanded ? 'hide files' : 'show files'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexShrink: 0 }}>
          <Swatch
            hexColor={previewHexColor.startsWith('#') ? previewHexColor : '#' + previewHexColor}
            swatchSize={size.swatchMd}
            title="New color preview"
          />
          <input
            value={newHexInputValue}
            maxLength={7}
            onChange={(e) => handleHexInputChange(e.target.value)}
            onBlur={handleHexInputCommit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleHexInputCommit(); }}
            style={{ ...inlineInputStyle, width: 96 }}
          />
          <div style={{ position: 'relative' }}>
            <input
              ref={pickerInputRef}
              type="color"
              value={previewHexColor.startsWith('#') ? previewHexColor : '#' + previewHexColor}
              onChange={(e) => {
                setPreviewHexColor(e.target.value);
                setNewHexInputValue(e.target.value.toUpperCase());
                notifyHexChange(e.target.value);
              }}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            />
            <Button height={size.buttonSm} width={46} onClick={() => pickerInputRef.current?.click()}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
          <Button height={size.buttonSm} width={90} onClick={handleUseSavedPaletteColor} disabled={!selectedPaletteHex}>
            Use Saved
          </Button>
          {showConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: font.sizeXs, color: color.textMuted, whiteSpace: 'nowrap' }}>
                {group.count} files?
              </span>
              <Button variant="danger" height={size.buttonSm} width={52} onClick={doApply}>Yes</Button>
              <Button height={size.buttonSm} width={46} onClick={() => setShowConfirm(false)}>No</Button>
            </div>
          ) : (
            <Button variant="primary" height={size.buttonSm} width={62} onClick={handleApplyClick} disabled={isApplying}>
              {isApplying ? '…' : 'Apply'}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: `1px solid ${color.border}`, padding: `${space.sm}px ${space.xl}px`, background: color.surface }}>
          {group.files.map((filename) => (
            <div
              key={filename}
              onClick={() => onNavigateToFile(filename)}
              style={{
                fontSize: font.sizeSm, fontFamily: font.mono, color: color.textMuted,
                padding: '3px 0', lineHeight: 1.6, cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: color.textFaint,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = color.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = color.textMuted)}
            >
              {filename}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
