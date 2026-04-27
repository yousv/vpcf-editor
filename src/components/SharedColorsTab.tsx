import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, size, space, transition } from '../theme';
import { Badge, Button, PickerButton, RgbFields, Swatch, UnsavedBar } from './Primitives';
import { HistoryPanel } from './HistoryPanel';
import { hexToRgb, isValidHex, rgbToHex } from '../utils/colorUtils';
import type { SharedColorGroup } from '../types';

function buildRangeGradient(rgb: number[], threshold: number): string {
  const d = Math.round(threshold / Math.sqrt(3));
  return `linear-gradient(to right, ${rgbToHex(rgb.map(v => Math.max(0, v - d)))}, ${rgbToHex(rgb)}, ${rgbToHex(rgb.map(v => Math.min(255, v + d)))})`;
}

function groupKey(group: SharedColorGroup, idx: number) { return `${group.hex}-${idx}`; }

export const SharedColorsTab: React.FC = () => {
  const {
    config, persistConfig, loadedFiles, updateFileFields, pushToast, addHistoryEntry,
    navigateToFileInEditor, sharedPendingEdits, setSharedPendingEdit,
    clearSharedPendingEdit, clearAllSharedPendingEdits,
    pushSharedUndo, undoSharedEdit, redoSharedEdit, setPaletteSelectHandler,
  } = useAppStore();

  const [sharedGroups, setSharedGroups]     = useState<SharedColorGroup[]>([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [isApplyingAll, setIsApplyingAll]   = useState(false);
  const [localThreshold, setLocalThreshold] = useState(config.colorMatchThreshold);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen]       = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeGroupIndexRef = useRef(activeGroupIndex);
  activeGroupIndexRef.current = activeGroupIndex;
  const sharedGroupsRef = useRef(sharedGroups);
  sharedGroupsRef.current = sharedGroups;

  const pendingCount = Object.keys(sharedPendingEdits).length;

  const fetchSharedColors = useCallback(async (threshold: number) => {
    if (!loadedFiles.length) return;
    setIsLoading(true);
    try {
      const groups = await tauriCommands.computeSharedColors(threshold);
      setSharedGroups(groups);
      setActiveGroupIndex(null);
    } catch (err) {
      pushToast('error', `Failed to compute shared colors: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadedFiles.length, pushToast]);

  useEffect(() => { fetchSharedColors(config.colorMatchThreshold); }, [loadedFiles.length]);

  const handlePaletteColorSelect = useCallback((hex: string) => {
    const idx    = activeGroupIndexRef.current;
    const groups = sharedGroupsRef.current;
    if (idx === null || !groups[idx]) return;
    const group = groups[idx];
    pushSharedUndo();
    setSharedPendingEdit(groupKey(group, idx), { newHex: hex.toLowerCase(), oldRgb: group.rgb });
  }, [setSharedPendingEdit, pushSharedUndo]);

  useEffect(() => {
    setPaletteSelectHandler(handlePaletteColorSelect);
    return () => setPaletteSelectHandler(null);
  }, [handlePaletteColorSelect, setPaletteSelectHandler]);

  const activeTab = useAppStore((s) => s.activeTab);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeTab !== 'sharedColors') return;
      const inInput = (e.target as HTMLElement).tagName === 'INPUT';
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (inInput) (e.target as HTMLInputElement).blur();
        undoSharedEdit();
      }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redoSharedEdit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoSharedEdit, redoSharedEdit, activeTab]);

  const handleThresholdChange = useCallback((val: number) => {
    setLocalThreshold(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      await persistConfig({ ...config, colorMatchThreshold: val });
      fetchSharedColors(val);
    }, 180);
  }, [config, fetchSharedColors, persistConfig]);

  const handleGroupApplied = useCallback((key: string, results: any[]) => {
    results.forEach((r) => updateFileFields(r.filename, r.fields));
    clearSharedPendingEdit(key);
    fetchSharedColors(localThreshold);
    results.forEach((r) => addHistoryEntry({ action: 'apply_shared', filename: r.filename, description: `Apply shared color → ${r.filename}` }));
    pushToast('success', `Updated ${results.length} file${results.length !== 1 ? 's' : ''}`);
  }, [localThreshold, updateFileFields, clearSharedPendingEdit, fetchSharedColors, addHistoryEntry, pushToast]);

  const handleApplyAll = useCallback(async () => {
    if (!pendingCount) return;
    setIsApplyingAll(true);
    let totalFiles = 0, failed = 0;
    for (const [key, edit] of Object.entries(sharedPendingEdits)) {
      const newRgb = hexToRgb(edit.newHex);
      if (!newRgb) continue;
      try {
        const results = await tauriCommands.applySharedColor(edit.oldRgb, newRgb, localThreshold);
        results.forEach((r) => { updateFileFields(r.filename, r.fields); totalFiles++; addHistoryEntry({ action: 'apply_shared', filename: r.filename, description: `Apply all shared → ${r.filename}` }); });
        clearSharedPendingEdit(key);
      } catch { failed++; }
    }
    await fetchSharedColors(localThreshold);
    setIsApplyingAll(false);
    if (failed) pushToast('error', `${failed} group(s) failed`);
    else        pushToast('success', `Applied across ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`);
  }, [sharedPendingEdits, localThreshold, pendingCount, updateFileFields, clearSharedPendingEdit, fetchSharedColors, addHistoryEntry, pushToast]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        padding: `${space.md}px ${space.xl}px`,
        display: 'flex', alignItems: 'center', gap: space.xl,
        flexShrink: 0, borderBottom: `1px solid ${color.border}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Match Threshold</span>
            <span style={{ fontSize: font.sizeSm, fontFamily: font.mono, color: color.text }}>{Math.round(localThreshold)}</span>
          </div>
          <input
            type="range" min={5} max={120} step={1} value={localThreshold}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: color.text }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: font.sizeXs, color: color.textFaint }}>Stricter</span>
            <span style={{ fontSize: font.sizeXs, color: color.textFaint }}>Looser</span>
          </div>
        </div>
        {sharedGroups.length > 0 && (
          <span style={{ fontSize: font.sizeSm, color: color.textFaint, flexShrink: 0 }}>
            {sharedGroups.length} group{sharedGroups.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <UnsavedBar count={pendingCount} noun="group" onDiscard={clearAllSharedPendingEdits} />

      <div style={{ flex: 1, overflowY: 'auto', padding: `${space.sm}px ${space.md}px` }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: color.textMuted }}>Computing…</div>
        ) : !sharedGroups.length ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: color.textMuted }}>
            {!loadedFiles.length ? 'Load a folder first' : 'No shared colors found'}
          </div>
        ) : sharedGroups.map((group, idx) => {
          const key = groupKey(group, idx);
          return (
            <SharedColorCard
              key={key} group={group} cardKey={key} threshold={localThreshold}
              isActive={activeGroupIndex === idx}
              onActivate={() => setActiveGroupIndex(prev => prev === idx ? null : idx)}
              pendingEdit={sharedPendingEdits[key]}
              onHexChange={(k, edit) => { pushSharedUndo(); setSharedPendingEdit(k, edit); }}
              onNavigateToFile={navigateToFileInEditor}
              onApplied={(results) => handleGroupApplied(key, results)}
              pushToast={pushToast}
              colorDisplayMode={config.colorDisplayMode}
            />
          );
        })}
      </div>

      <div style={{
        flexShrink: 0, background: color.surface, borderTop: `1px solid ${color.border}`,
        padding: `0 ${space.xl}px`, display: 'flex', alignItems: 'center',
        gap: space.md, height: size.bottomBarHeight,
      }}>
        <Button variant="primary" height={size.buttonMd} width={160} onClick={handleApplyAll} disabled={!pendingCount || isApplyingAll}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h8l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4 2v3h6V2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {isApplyingAll ? 'Applying…' : 'Apply All'}
        </Button>
        <span style={{ fontSize: font.sizeSm, color: color.textFaint, flex: 1 }}>
          {pendingCount ? `${pendingCount} group${pendingCount !== 1 ? 's' : ''} pending` : 'No pending changes'}
        </span>
        {pendingCount > 0 && (
          <button
            onClick={clearAllSharedPendingEdits}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: font.sizeXs, color: color.textFaint, padding: '4px 8px',
              borderRadius: radius.md, transition: transition.quick,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = color.textMuted)}
            onMouseLeave={(e) => (e.currentTarget.style.color = color.textFaint)}
          >
            Discard all
          </button>
        )}
        <button
          onClick={() => setHistoryOpen(v => !v)}
          title="Edit History"
          style={{
            height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
            background: historyOpen ? color.surfaceActive : 'transparent',
            border: `1px solid ${historyOpen ? color.borderStrong : 'transparent'}`,
            borderRadius: 6, cursor: 'pointer', color: color.textMuted,
            fontSize: font.sizeXs, transition: 'all 0.08s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.color = color.text; }}
          onMouseLeave={(e) => {
            if (!historyOpen) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = color.textMuted; }
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          History
        </button>
      </div>

      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
};

const SharedColorCard: React.FC<{
  group: SharedColorGroup; cardKey: string; threshold: number;
  isActive: boolean; onActivate: () => void;
  pendingEdit: { newHex: string; oldRgb: number[] } | undefined;
  onHexChange: (key: string, edit: { newHex: string; oldRgb: number[] }) => void;
  onNavigateToFile: (filename: string) => void;
  onApplied: (results: any[]) => void;
  pushToast: (type: any, message: string) => void;
  colorDisplayMode: 'hex' | 'rgb';
}> = ({
  group, cardKey, threshold, isActive, onActivate, pendingEdit,
  onHexChange, onNavigateToFile, onApplied, pushToast, colorDisplayMode,
}) => {
  const [newHexInput, setNewHexInput] = useState(pendingEdit?.newHex?.toUpperCase() ?? group.hex.toUpperCase());
  const [previewHex, setPreviewHex]   = useState(pendingEdit?.newHex ?? group.hex.toLowerCase());
  const [isExpanded, setIsExpanded]   = useState(false);
  const [isApplying, setIsApplying]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isHovered, setIsHovered]     = useState(false);

  useEffect(() => {
    if (pendingEdit?.newHex) { setNewHexInput(pendingEdit.newHex.toUpperCase()); setPreviewHex(pendingEdit.newHex.toLowerCase()); }
    else { setNewHexInput(group.hex.toUpperCase()); setPreviewHex(group.hex.toLowerCase()); }
  }, [pendingEdit?.newHex, group.hex]);

  const isModified = previewHex.replace('#', '').toLowerCase() !== group.hex.replace('#', '').toLowerCase();
  const originalHex = group.hex.toLowerCase();
  const currentHex  = previewHex.startsWith('#') ? previewHex : '#' + previewHex;

  const notify = useCallback((hex: string) => {
    const c = hex.startsWith('#') ? hex : '#' + hex;
    if (isValidHex(c)) onHexChange(cardKey, { newHex: c.toLowerCase(), oldRgb: group.rgb });
  }, [cardKey, group.rgb, onHexChange]);

  const updateHex = useCallback((hex: string) => {
    const c = hex.startsWith('#') ? hex : '#' + hex;
    if (isValidHex(c)) {
      setPreviewHex(c.toLowerCase());
      setNewHexInput(c.replace('#', '').toUpperCase());
      notify(c);
    }
  }, [notify]);

  const currentRgb = hexToRgb(currentHex) ?? group.rgb.slice(0, 3);
  const pickerHex  = /^#[0-9a-fA-F]{6}$/.test(currentHex) ? currentHex : '#000000';
  const rangeGradient = buildRangeGradient(group.rgb, threshold);

  const doApply = useCallback(async () => {
    const newRgb = hexToRgb(currentHex);
    if (!newRgb) { pushToast('error', 'Invalid color'); return; }
    if (newRgb.every((v, i) => v === group.rgb[i])) { pushToast('info', 'No change'); return; }
    setIsApplying(true); setShowConfirm(false);
    try {
      const results = await tauriCommands.applySharedColor(group.rgb, newRgb, threshold);
      onApplied(results);
    } catch (err) {
      pushToast('error', `Apply failed: ${err}`);
    } finally {
      setIsApplying(false);
    }
  }, [currentHex, group.rgb, threshold, onApplied, pushToast]);

  const handleRevert = useCallback(() => {
    onHexChange(cardKey, { newHex: group.hex.toLowerCase(), oldRgb: group.rgb });
    setPreviewHex(group.hex.toLowerCase());
    setNewHexInput(group.hex.toUpperCase());
    pushToast('info', `Reverted ${group.hex.toUpperCase()}`);
  }, [cardKey, group.hex, group.rgb, onHexChange, pushToast]);

  const inlineInputStyle: React.CSSProperties = {
    height: size.inputHeightSm, padding: '0 9px',
    background: color.surface, border: `1px solid ${color.border}`,
    borderRadius: radius.md, color: color.text,
    fontSize: font.sizeSm, fontFamily: font.mono, outline: 'none', transition: transition.quick,
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: radius.lg,
        background: isActive ? color.surfaceActive : isHovered ? color.surfaceRaised : 'transparent',
        border: `1px solid ${isModified ? color.unsaved : isActive ? color.borderStrong : 'transparent'}`,
        overflow: 'hidden', transition: transition.quick, cursor: 'pointer',
        marginBottom: 4,
      }}
    >
      <div onClick={onActivate} style={{ display: 'flex', alignItems: 'center', gap: space.md, padding: `${space.md}px ${space.lg}px` }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Swatch hexColor={currentHex} swatchSize={size.swatchMd} />
            {isModified && (
              <Swatch
                hexColor={originalHex}
                swatchSize={14}
                title={`Original: ${group.hex.toUpperCase()}`}
                style={{
                  position: 'absolute', bottom: -3, right: -3,
                  border: `2px solid ${isActive ? color.surfaceActive : color.surfaceRaised}`, borderRadius: radius.sm,
                }}
              />
            )}
          </div>
          <div style={{
            width: size.swatchMd, height: 4, borderRadius: 3,
            background: rangeGradient, marginTop: 4, border: `1px solid ${color.border}`,
          }} />
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
              }}>unsaved</span>
            )}
            {group.fieldNames.map((fn) => (
              <Badge key={fn} badgeColor={color.textMuted}>{fn || 'gradient'}</Badge>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginTop: 5, flexWrap: 'wrap' }}>
            <Badge badgeColor={color.warning}>{group.count} file{group.count !== 1 ? 's' : ''}</Badge>
            <Badge badgeColor={color.textFaint}>{group.total} instance{group.total !== 1 ? 's' : ''}</Badge>
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: color.textMuted, fontSize: font.sizeXs, padding: '2px 4px',
                borderRadius: radius.sm, transition: transition.quick,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = color.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = color.textMuted)}
            >
              {isExpanded ? 'hide files' : 'show files'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {colorDisplayMode === 'rgb' ? (
            <RgbFields
              rgb={currentRgb}
              onChange={(rgb) => { const hex = rgbToHex(rgb); setPreviewHex(hex.toLowerCase()); setNewHexInput(hex.replace('#','').toUpperCase()); notify(hex); }}
              onCommit={() => {}}
            />
          ) : (
            <input
              value={newHexInput}
              maxLength={7}
              onChange={(e) => {
                setNewHexInput(e.target.value);
                const c = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                if (isValidHex(c)) { setPreviewHex(c.toLowerCase()); notify(c); }
              }}
              onBlur={() => {
                const c = newHexInput.startsWith('#') ? newHexInput : '#' + newHexInput;
                if (isValidHex(c)) { setPreviewHex(c.toLowerCase()); notify(c); }
                else { setNewHexInput(group.hex.toUpperCase()); setPreviewHex(group.hex.toLowerCase()); }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              style={{ ...inlineInputStyle, width: 96 }}
            />
          )}

          <PickerButton currentHex={pickerHex} onInput={updateHex} onCommit={() => {}} btnSize={size.buttonSm} />

          {isModified && (
            <button
              title={`Revert to ${group.hex.toUpperCase()}`}
              onClick={(e) => { e.stopPropagation(); handleRevert(); }}
              style={{
                width: size.buttonSm, height: size.buttonSm, display: 'flex', alignItems: 'center', justifyContent: 'center',
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

          {showConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: font.sizeXs, color: color.textMuted, whiteSpace: 'nowrap' }}>{group.count} files?</span>
              <Button variant="danger" height={size.buttonSm} width={52} onClick={doApply}>Yes</Button>
              <Button height={size.buttonSm} width={46} onClick={() => setShowConfirm(false)}>No</Button>
            </div>
          ) : (
            <Button
              variant="primary" height={size.buttonSm} width={68}
              onClick={() => group.count > 1 ? setShowConfirm(true) : doApply()}
              disabled={isApplying}
            >
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
              onClick={(e) => { e.stopPropagation(); onNavigateToFile(filename); }}
              style={{ fontSize: font.sizeSm, fontFamily: font.mono, color: color.textMuted, padding: '4px 0', cursor: 'pointer', transition: transition.quick }}
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
