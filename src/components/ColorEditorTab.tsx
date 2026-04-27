import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useFilteredFiles } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, size, space } from '../theme';
import { Button, UnsavedBar } from './Primitives';
import { ColorRow } from './ColorRow';
import { HistoryPanel } from './HistoryPanel';
import { hexToRgb, parseColorString } from '../utils/colorUtils';
import type { ColorChange } from '../types';

export const ColorEditorTab: React.FC = () => {
  const {
    selectedFilename, loadedFiles, fileEditorStates,
    updateFileFields, clearFilePendingChanges,
    setPendingChange, resetPendingChange,
    pushToUndoStack, undoChange, redoChange,
    pushToast, navigateFile, addHistoryEntry,
    setPaletteSelectHandler,
  } = useAppStore();

  const filteredFiles = useFilteredFiles();
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen]           = useState(false);

  const selectedFile   = loadedFiles.find((f) => f.filename === selectedFilename);
  const editorState    = selectedFilename ? fileEditorStates[selectedFilename] : undefined;
  const fields         = editorState?.fields ?? selectedFile?.fields ?? [];
  const pendingCount   = editorState ? Object.keys(editorState.pendingChanges).length : 0;
  const hasUnsaved     = pendingCount > 0;

  const allUnsavedFiles = Object.entries(fileEditorStates)
    .filter(([, es]) => Object.keys(es.pendingChanges).length > 0);
  const totalUnsaved = allUnsavedFiles.length;

  const currentFileIndex = selectedFilename
    ? filteredFiles.findIndex(f => f.filename === selectedFilename)
    : -1;

  useEffect(() => { setActiveFieldIndex(null); }, [selectedFilename]);

  const activeFieldIndexRef = useRef(activeFieldIndex);
  activeFieldIndexRef.current = activeFieldIndex;
  const editorStateRef = useRef(editorState);
  editorStateRef.current = editorState;
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const handleApplyPaletteColor = useCallback((hexColor: string) => {
    const filename = useAppStore.getState().selectedFilename;
    if (!filename) return;
    const curFields = fieldsRef.current;
    const curState  = editorStateRef.current;
    if (!curFields.length) return;
    const idx = activeFieldIndexRef.current ?? 0;
    const rgb = hexToRgb(hexColor);
    if (!rgb) return;
    pushToUndoStack(filename);
    const origRgb   = curState?.originalColors[idx] ?? parseColorString(curFields[idx]?.value ?? '');
    const withAlpha = origRgb.length === 4 ? [...rgb.slice(0, 3), origRgb[3]] : rgb.slice(0, 3);
    if (withAlpha.every((v, i) => v === origRgb[i])) resetPendingChange(filename, idx);
    else setPendingChange(filename, idx, withAlpha);
    addHistoryEntry({
      action: 'edit', filename, fieldName: curFields[idx]?.fieldName,
      newHex: hexColor.toUpperCase(),
      description: `Apply palette color ${hexColor} → ${curFields[idx]?.fieldName ?? `field ${idx}`}`,
    });
  }, [pushToUndoStack, resetPendingChange, setPendingChange, addHistoryEntry]);

  useEffect(() => {
    setPaletteSelectHandler(handleApplyPaletteColor);
    return () => setPaletteSelectHandler(null);
  }, [handleApplyPaletteColor, setPaletteSelectHandler]);

  const saveFile = useCallback(async (filename: string, es: typeof editorState) => {
    if (!es || !Object.keys(es.pendingChanges).length) return;
    const changes: ColorChange[] = Object.values(es.pendingChanges).map((c) => ({
      fieldIndex: c.fieldIndex, newRgb: c.newRgb,
    }));
    const result = await tauriCommands.saveFileColors(filename, changes);
    updateFileFields(filename, result.fields);
    clearFilePendingChanges(filename);
    return result;
  }, [updateFileFields, clearFilePendingChanges]);

  const handleSaveAllRef = useRef<() => Promise<void>>(async () => {});

  const handleSave = useCallback(async () => {
    if (!selectedFilename || !editorState || !pendingCount) return;
    try {
      await saveFile(selectedFilename, editorState);
      addHistoryEntry({ action: 'save', filename: selectedFilename, description: `Save ${selectedFilename}` });
      pushToast('success', `Saved ${selectedFilename}`);
    } catch (err) {
      pushToast('error', `Save failed: ${err}`);
    }
  }, [selectedFilename, editorState, pendingCount, saveFile, addHistoryEntry, pushToast]);

  const handleSaveAll = useCallback(async () => {
    if (!allUnsavedFiles.length) return;
    let saved = 0, failed = 0;
    for (const [filename, es] of allUnsavedFiles) {
      try {
        await saveFile(filename, es);
        addHistoryEntry({ action: 'save_all', filename, description: `Save all — ${filename}` });
        saved++;
      } catch { failed++; }
    }
    if (failed) pushToast('error', `${saved} saved, ${failed} failed`);
    else        pushToast('success', `Saved ${saved} file${saved !== 1 ? 's' : ''}`);
  }, [allUnsavedFiles, saveFile, addHistoryEntry, pushToast]);

  handleSaveAllRef.current = handleSaveAll;

  const navigateFileRef = useRef(navigateFile);
  const undoChangeRef   = useRef(undoChange);
  const redoChangeRef   = useRef(redoChange);
  navigateFileRef.current = navigateFile;
  undoChangeRef.current   = undoChange;
  redoChangeRef.current   = redoChange;

  const activeTab = useAppStore((s) => s.activeTab);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeTab !== 'colorEditor') return;
      const inInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
      if (e.ctrlKey && !e.shiftKey && e.key === 's') { e.preventDefault(); handleSave(); }
      if (e.ctrlKey && e.shiftKey  && e.key === 'S') { e.preventDefault(); handleSaveAllRef.current(); }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z' && selectedFilename) {
        e.preventDefault();
        if (inInput) (e.target as HTMLInputElement).blur();
        undoChangeRef.current(selectedFilename);
      }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z')) && selectedFilename) {
        e.preventDefault();
        redoChangeRef.current(selectedFilename);
      }
      if (!inInput && e.key === 'ArrowDown') { e.preventDefault(); navigateFileRef.current(1); }
      if (!inInput && e.key === 'ArrowUp')   { e.preventDefault(); navigateFileRef.current(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedFilename, handleSave, activeTab]);

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
        padding: `0 ${space.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 46, flexShrink: 0, borderBottom: `1px solid ${color.border}`,
      }}>
        <span style={{
          fontSize: font.sizeSm, fontFamily: font.mono, color: color.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {selectedFilename}
        </span>
        {filteredFiles.length > 1 && (
          <span style={{ fontSize: font.sizeXs, color: color.textFaint, flexShrink: 0 }}>
            {currentFileIndex === -1 ? '—' : currentFileIndex + 1} / {filteredFiles.length}
          </span>
        )}
      </div>

      <UnsavedBar count={pendingCount} noun="change" />

      <div style={{ flex: 1, overflowY: 'auto', padding: `${space.sm}px ${space.md}px` }}>
        {fields.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: color.textMuted }}>
            No color fields in this file
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fields.map((field, idx) => (
              <ColorRow
                key={`${field.fieldName}-${idx}`}
                field={field} fieldIndex={idx}
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
        <Button variant="primary" height={size.buttonMd} width={130} onClick={handleSave} disabled={!hasUnsaved}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h8l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4 2v3h6V2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Save
        </Button>
        <Button variant="default" height={size.buttonMd} width={140} onClick={handleSaveAll} disabled={totalUnsaved === 0}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h8l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4 2v3h6V2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M1 5h2M1 8h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Save All {totalUnsaved > 0 ? `(${totalUnsaved})` : ''}
        </Button>
        <span style={{ fontSize: font.sizeSm, color: color.textFaint, flex: 1 }}>
          {hasUnsaved ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending` : 'No unsaved changes'}
        </span>
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
