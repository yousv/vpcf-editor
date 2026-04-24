import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useFilteredFiles } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, size, space } from '../theme';
import { Button } from './Primitives';
import { SavedColorsPalette } from './SavedColorsPalette';
import { ColorRow } from './ColorRow';
import { hexToRgb, parseColorString, rgbToHex } from '../utils/colorUtils';
import type { ColorChange } from '../types';

export const ColorEditorTab: React.FC = () => {
  const {
    selectedFilename, loadedFiles, fileEditorStates,
    updateFileFields, clearFilePendingChanges,
    setPendingChange, resetPendingChange,
    pushToUndoStack, undoChange,
    config, persistConfig, pushToast,
    navigateFile,
  } = useAppStore();

  const filteredFiles = useFilteredFiles();

  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [selectedPaletteHex, setSelectedPaletteHex] = useState<string | null>(null);

  const selectedFile  = loadedFiles.find((f) => f.filename === selectedFilename);
  const editorState   = selectedFilename ? fileEditorStates[selectedFilename] : undefined;
  const fields        = editorState?.fields ?? selectedFile?.fields ?? [];
  const pendingChanges = editorState?.pendingChanges;
  const pendingCount   = pendingChanges ? Object.keys(pendingChanges).length : 0;
  const hasUnsaved    = pendingCount > 0;

  const currentFileIndex = selectedFilename
    ? filteredFiles.findIndex(f => f.filename === selectedFilename)
    : -1;
  const totalFileCount = filteredFiles.length;

  useEffect(() => { setActiveFieldIndex(null); }, [selectedFilename]);

  const handleSaveAllRef = useRef<() => Promise<void>>(async () => {});
  const navigateFileRef  = useRef(navigateFile);
  const undoChangeRef    = useRef(undoChange);
  navigateFileRef.current  = navigateFile;
  undoChangeRef.current    = undoChange;

  const handleSaveAll = useCallback(async () => {
    if (!selectedFilename || !editorState || pendingCount === 0) return;
    const colorChanges: ColorChange[] = Object.values(editorState.pendingChanges).map((c) => ({
      fieldIndex: c.fieldIndex,
      newRgb: c.newRgb,
    }));
    try {
      const result = await tauriCommands.saveFileColors(selectedFilename, colorChanges);
      updateFileFields(selectedFilename, result.fields);
      clearFilePendingChanges(selectedFilename);
      pushToast('success', `Saved ${selectedFilename}`);
    } catch (err) {
      pushToast('error', `Save failed: ${err}`);
    }
  }, [selectedFilename, editorState, pendingCount]);

  handleSaveAllRef.current = handleSaveAll;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.ctrlKey && e.key === 's')   { e.preventDefault(); handleSaveAllRef.current(); }
      if (e.ctrlKey && e.key === 'z' && !inInput && selectedFilename) {
        e.preventDefault();
        undoChangeRef.current(selectedFilename);
      }
      if (!inInput && e.key === 'ArrowDown') { e.preventDefault(); navigateFileRef.current(1); }
      if (!inInput && e.key === 'ArrowUp')   { e.preventDefault(); navigateFileRef.current(-1); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFilename]);

  const handleApplyPaletteColor = useCallback((hexColor: string) => {
    setSelectedPaletteHex(hexColor);
    if (!selectedFilename || fields.length === 0) return;
    const targetIndex = activeFieldIndex ?? 0;
    const rgb = hexToRgb(hexColor);
    if (!rgb) return;
    pushToUndoStack(selectedFilename);
    const origRgb  = editorState?.originalColors[targetIndex] ?? parseColorString(fields[targetIndex]?.value ?? '');
    const withAlpha = origRgb.length === 4 ? [...rgb.slice(0, 3), origRgb[3]] : rgb.slice(0, 3);
    const isSame    = withAlpha.every((v, i) => v === origRgb[i]);
    if (isSame) resetPendingChange(selectedFilename, targetIndex);
    else         setPendingChange(selectedFilename, targetIndex, withAlpha);
    const fieldName = fields[targetIndex]?.fieldName;
    pushToast('info', `Applied ${hexColor} to ${fieldName ?? `field ${targetIndex}`}`);
  }, [activeFieldIndex, fields, editorState, selectedFilename]);

  const handleSaveActiveToPalette = useCallback(() => {
    if (fields.length === 0) return;
    const targetIndex = activeFieldIndex ?? 0;
    const field       = fields[targetIndex];
    if (!field) return;
    const currentRgb = editorState?.pendingChanges[targetIndex]?.newRgb ?? parseColorString(field.value);
    const hexColor   = rgbToHex(currentRgb).toUpperCase();
    const deduped    = [hexColor, ...config.savedColors.filter((c) => c.toUpperCase() !== hexColor)].slice(0, 32);
    persistConfig({ ...config, savedColors: deduped });
    pushToast('success', `Saved ${hexColor} to palette`);
  }, [activeFieldIndex, fields, editorState, config]);

  if (!selectedFilename) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color.textMuted, fontSize: font.sizeMd }}>
        Select a file from the sidebar
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: `${space.md}px ${space.xl}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.md,
        flexShrink: 0,
        borderBottom: `1px solid ${color.border}`,
        minHeight: 58,
      }}>
        <SavedColorsPalette onColorSelect={handleApplyPaletteColor} selectedHex={selectedPaletteHex} />
        <Button height={size.buttonSm} onClick={handleSaveActiveToPalette} style={{ flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Save Color
        </Button>
      </div>

      <div style={{
        padding: `0 ${space.xl}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        flexShrink: 0,
        borderBottom: `1px solid ${color.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.md, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: font.sizeSm, fontFamily: font.mono, color: color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedFilename}
          </span>
          {hasUnsaved && (
            <span style={{
              fontSize: font.sizeXs, color: color.unsaved, fontWeight: font.weightMedium,
              background: `${color.unsaved}18`, border: `1px solid ${color.unsaved}40`,
              borderRadius: 99, padding: '2px 9px', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {pendingCount} unsaved
            </span>
          )}
        </div>
        {totalFileCount > 1 && (
          <span style={{ fontSize: font.sizeXs, color: color.textFaint, flexShrink: 0 }}>
            {currentFileIndex === -1 ? '—' : currentFileIndex + 1} / {totalFileCount}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: `${space.sm}px ${space.md}px` }}>
        {fields.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: color.textMuted, fontSize: font.sizeMd }}>
            No color fields in this file
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fields.map((field, idx) => (
              <ColorRow
                key={`${field.fieldName}-${idx}`}
                field={field}
                fieldIndex={idx}
                filename={selectedFilename}
                isActive={activeFieldIndex === idx}
                onActivate={setActiveFieldIndex}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{
        flexShrink: 0, background: color.surface, borderTop: `1px solid ${color.border}`,
        padding: `0 ${space.xl}px`, display: 'flex', alignItems: 'center',
        gap: space.md, height: size.bottomBarHeight,
      }}>
        <Button variant="primary" height={size.buttonMd} width={172} onClick={handleSaveAll} disabled={!hasUnsaved}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h8l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4 2v3h6V2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Save  (Ctrl+S)
        </Button>
        <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>
          {hasUnsaved ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending` : 'No unsaved changes'}
        </span>
      </div>
    </div>
  );
};
