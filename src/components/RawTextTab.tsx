import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useFilteredFiles } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, size, space } from '../theme';
import { Button, IconButton, Input } from './Primitives';

type BatchMode = 'none' | 'findReplace' | 'firstLine';

export const RawTextTab: React.FC = () => {
  const { selectedFilename, loadedFiles, updateFileFields, pushToast, navigateFile } = useAppStore();
  const filteredFiles = useFilteredFiles();

  const [editorContent, setEditorContent]   = useState('');
  const [isDirty, setIsDirty]               = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [isLoading, setIsLoading]           = useState(false);

  const [searchQuery, setSearchQuery]       = useState('');
  const [replaceValue, setReplaceValue]     = useState('');
  const [matchCount, setMatchCount]         = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [matchPositions, setMatchPositions] = useState<number[]>([]);

  const [batchMode, setBatchMode]           = useState<BatchMode>('none');
  const [batchSearch, setBatchSearch]       = useState('');
  const [batchReplace, setBatchReplace]     = useState('');
  const [batchNewFirstLine, setBatchNewFirstLine] = useState('');
  const [batchTargetAll, setBatchTargetAll] = useState(true);
  const [batchSelectedFiles, setBatchSelectedFiles] = useState<Set<string>>(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentIndex = filteredFiles.findIndex(f => f.filename === selectedFilename);
  const totalCount   = filteredFiles.length;

  useEffect(() => {
    if (!selectedFilename) return;
    setIsLoading(true);
    setIsDirty(false);
    setSearchQuery('');
    setMatchPositions([]);
    setMatchCount(0);
    tauriCommands.readFileContent(selectedFilename)
      .then((content) => { setEditorContent(content); })
      .catch(() => pushToast('error', 'Failed to load file content'))
      .finally(() => setIsLoading(false));
  }, [selectedFilename]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchPositions([]);
      setMatchCount(0);
      return;
    }
    const positions: number[] = [];
    const lower   = editorContent.toLowerCase();
    const pattern = searchQuery.toLowerCase();
    let idx = 0;
    while (true) {
      const found = lower.indexOf(pattern, idx);
      if (found === -1) break;
      positions.push(found);
      idx = found + 1;
    }
    setMatchPositions(positions);
    setMatchCount(positions.length);
    setActiveMatchIndex(0);
  }, [searchQuery, editorContent]);

  const scrollToMatch = useCallback((index: number, positions: number[]) => {
    const ta = textareaRef.current;
    if (!ta || positions.length === 0) return;
    const pos = positions[index];
    if (pos === undefined) return;
    ta.focus();
    ta.setSelectionRange(pos, pos + searchQuery.length);
    const linesBefore = editorContent.slice(0, pos).split('\n').length - 1;
    const lineHeight  = parseInt(getComputedStyle(ta).lineHeight || '22', 10);
    ta.scrollTop = Math.max(0, linesBefore * lineHeight - ta.clientHeight / 2);
  }, [searchQuery, editorContent]);

  useEffect(() => {
    if (matchPositions.length > 0) scrollToMatch(0, matchPositions);
  }, [matchPositions]);

  const handleNavigateMatch = useCallback((direction: 1 | -1) => {
    if (matchCount === 0) return;
    const nextIndex = (activeMatchIndex + direction + matchCount) % matchCount;
    setActiveMatchIndex(nextIndex);
    scrollToMatch(nextIndex, matchPositions);
  }, [activeMatchIndex, matchCount, scrollToMatch, matchPositions]);

  const handleReplace = useCallback(() => {
    if (!searchQuery.trim() || matchPositions.length === 0) return;
    const pos     = matchPositions[activeMatchIndex];
    if (pos === undefined) return;
    const updated = editorContent.slice(0, pos) + replaceValue + editorContent.slice(pos + searchQuery.length);
    setEditorContent(updated);
    setIsDirty(true);
  }, [searchQuery, replaceValue, matchPositions, activeMatchIndex, editorContent]);

  const handleReplaceAll = useCallback(() => {
    if (!searchQuery.trim()) return;
    const updated = editorContent.split(searchQuery).join(replaceValue);
    setEditorContent(updated);
    setIsDirty(true);
  }, [searchQuery, replaceValue, editorContent]);

  const handleSave = useCallback(async () => {
    if (!selectedFilename || !isDirty) return;
    setIsSaving(true);
    try {
      const result = await tauriCommands.saveRawText(selectedFilename, editorContent);
      updateFileFields(selectedFilename, result.fields);
      setIsDirty(false);
      pushToast('success', `Saved ${selectedFilename}`);
    } catch (err) {
      pushToast('error', `Save failed: ${err}`);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFilename, editorContent, isDirty]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveRef.current(); }
      if (!inInput && e.key === 'ArrowDown') { e.preventDefault(); navigateFile(1); }
      if (!inInput && e.key === 'ArrowUp')   { e.preventDefault(); navigateFile(-1); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateFile]);

  const getTargetFilenames = useCallback((): string[] => {
    if (batchTargetAll) return loadedFiles.map(f => f.filename);
    return Array.from(batchSelectedFiles);
  }, [batchTargetAll, batchSelectedFiles, loadedFiles]);

  const handleBatchFindReplace = useCallback(async () => {
    if (!batchSearch.trim()) { pushToast('warning', 'Search term is empty'); return; }
    const targets = getTargetFilenames();
    if (targets.length === 0) { pushToast('warning', 'No files selected'); return; }
    setIsBatchRunning(true);
    let updatedCount = 0;
    try {
      for (const filename of targets) {
        const rawContent = await tauriCommands.readFileContent(filename);
        if (!rawContent.includes(batchSearch)) continue;
        const newContent = rawContent.split(batchSearch).join(batchReplace);
        const result     = await tauriCommands.saveRawText(filename, newContent);
        updateFileFields(filename, result.fields);
        if (filename === selectedFilename) {
          setEditorContent(newContent);
          setIsDirty(false);
          setMatchPositions([]);
          setMatchCount(0);
        }
        updatedCount++;
      }
      pushToast('success', `Replaced in ${updatedCount} file${updatedCount !== 1 ? 's' : ''}`);
    } catch (err) {
      pushToast('error', `Batch replace failed: ${err}`);
    } finally {
      setIsBatchRunning(false);
    }
  }, [batchSearch, batchReplace, getTargetFilenames, selectedFilename]);

  const handleBatchFirstLine = useCallback(async () => {
    if (!batchNewFirstLine.trim()) { pushToast('warning', 'New first line is empty'); return; }
    const targets = getTargetFilenames();
    if (targets.length === 0) { pushToast('warning', 'No files selected'); return; }
    setIsBatchRunning(true);
    let updatedCount = 0;
    try {
      for (const filename of targets) {
        const rawContent = await tauriCommands.readFileContent(filename);
        const lines      = rawContent.split('\n');
        lines[0]         = batchNewFirstLine;
        const newContent = lines.join('\n');
        const result     = await tauriCommands.saveRawText(filename, newContent);
        updateFileFields(filename, result.fields);
        if (filename === selectedFilename) { setEditorContent(newContent); setIsDirty(false); }
        updatedCount++;
      }
      pushToast('success', `Updated first line in ${updatedCount} file${updatedCount !== 1 ? 's' : ''}`);
    } catch (err) {
      pushToast('error', `Batch edit failed: ${err}`);
    } finally {
      setIsBatchRunning(false);
    }
  }, [batchNewFirstLine, getTargetFilenames, selectedFilename]);

  const toggleBatchFile = useCallback((filename: string) => {
    setBatchSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename); else next.add(filename);
      return next;
    });
  }, []);

  const labelStyle: React.CSSProperties = {
    fontSize: font.sizeXs, color: color.textMuted, fontWeight: font.weightMedium,
    letterSpacing: '0.08em', textTransform: 'uppercase' as const, flexShrink: 0,
  };

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
        padding: `${space.sm}px ${space.xl}px`,
        display: 'flex', alignItems: 'center', gap: space.md,
        flexShrink: 0, borderBottom: `1px solid ${color.border}`,
        minHeight: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flex: 1, minWidth: 0 }}>
          <Input
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search in file…"
            height={size.inputHeightSm}
            style={{ width: 200 }}
          />
          {searchQuery.trim() && (
            <>
              <input
                value={replaceValue}
                onChange={(e) => setReplaceValue(e.target.value)}
                placeholder="Replace with…"
                style={{
                  height: size.inputHeightSm, width: 200, padding: '0 12px',
                  background: color.surfaceActive, border: `1px solid ${color.border}`,
                  borderRadius: radius.md, color: color.text, fontSize: font.sizeSm,
                  fontFamily: font.sans,
                }}
              />
              <span style={{ fontSize: font.sizeSm, color: color.textFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {matchCount > 0 ? `${activeMatchIndex + 1} / ${matchCount}` : '0 matches'}
              </span>
              {matchCount > 0 && (
                <>
                  <IconButton onClick={() => handleNavigateMatch(-1)} title="Previous match" size={30}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 6.5L5 3.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </IconButton>
                  <IconButton onClick={() => handleNavigateMatch(1)} title="Next match" size={30}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 3.5L5 6.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </IconButton>
                  <Button height={size.buttonSm} onClick={handleReplace}>Replace</Button>
                  <Button height={size.buttonSm} onClick={handleReplaceAll}>Replace All</Button>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, flexShrink: 0 }}>
          <Button
            height={size.buttonSm}
            onClick={() => setBatchMode(batchMode === 'findReplace' ? 'none' : 'findReplace')}
            style={batchMode === 'findReplace' ? { borderColor: color.borderStrong, color: color.text } : {}}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 3h10M1 6h7M1 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Batch Replace
          </Button>
          <Button
            height={size.buttonSm}
            onClick={() => setBatchMode(batchMode === 'firstLine' ? 'none' : 'firstLine')}
            style={batchMode === 'firstLine' ? { borderColor: color.borderStrong, color: color.text } : {}}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 2h10M1 5h7M1 8h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Batch First Line
          </Button>
        </div>

        {totalCount > 1 && (
          <span style={{ fontSize: font.sizeXs, color: color.textFaint, flexShrink: 0 }}>
            {currentIndex === -1 ? '—' : currentIndex + 1} / {totalCount}
          </span>
        )}
      </div>

      {batchMode !== 'none' && (
        <div style={{
          padding: `${space.md}px ${space.xl}px`,
          borderBottom: `1px solid ${color.border}`,
          background: color.surfaceRaised,
          display: 'flex', flexDirection: 'column', gap: space.md,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: space.xl }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm, flex: 1 }}>
              {batchMode === 'findReplace' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
                    <span style={labelStyle}>Find</span>
                    <Input value={batchSearch} onChange={setBatchSearch} placeholder="Text to find…" height={size.inputHeightSm} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
                    <span style={labelStyle}>With</span>
                    <Input value={batchReplace} onChange={setBatchReplace} placeholder="Replace with…" height={size.inputHeightSm} style={{ flex: 1 }} />
                  </div>
                </>
              )}
              {batchMode === 'firstLine' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
                  <span style={labelStyle}>Line 1</span>
                  <Input value={batchNewFirstLine} onChange={setBatchNewFirstLine} placeholder="New first line content…" height={size.inputHeightSm} style={{ flex: 1 }} mono />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
                <span style={labelStyle}>Apply to</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={batchTargetAll}
                    onChange={() => setBatchTargetAll(v => !v)}
                    style={{ accentColor: color.text, width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: font.sizeSm, color: color.text }}>All files</span>
                </label>
              </div>
              {!batchTargetAll && (
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {loadedFiles.map(f => (
                    <label key={f.filename} style={{ display: 'flex', alignItems: 'center', gap: space.sm, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={batchSelectedFiles.has(f.filename)}
                        onChange={() => toggleBatchFile(f.filename)}
                        style={{ accentColor: color.text, width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: font.sizeXs, fontFamily: font.mono, color: color.textMuted }}>
                        {f.filename}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              height={size.buttonMd}
              width={110}
              onClick={batchMode === 'findReplace' ? handleBatchFindReplace : handleBatchFirstLine}
              disabled={isBatchRunning}
            >
              {isBatchRunning ? 'Running…' : 'Run'}
            </Button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: color.textMuted, fontSize: font.sizeMd }}>
            Loading…
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={editorContent}
            onChange={(e) => { setEditorContent(e.target.value); setIsDirty(true); }}
            spellCheck={false}
            style={{
              width: '100%', height: '100%',
              padding: `${space.lg}px ${space.xl}px`,
              background: color.background, border: 'none',
              color: color.text, fontFamily: font.mono,
              fontSize: font.sizeSm, lineHeight: 1.7, overflowY: 'auto',
            }}
          />
        )}
      </div>

      <div style={{
        flexShrink: 0, background: color.surface, borderTop: `1px solid ${color.border}`,
        padding: `0 ${space.xl}px`, display: 'flex', alignItems: 'center',
        gap: space.md, height: size.bottomBarHeight,
      }}>
        <Button variant="primary" height={size.buttonMd} width={172} onClick={handleSave} disabled={!isDirty || isSaving}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h8l2 2v8H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4 2v3h6V2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {isSaving ? 'Saving…' : 'Save  (Ctrl+S)'}
        </Button>
        <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>
          {isDirty ? 'Unsaved changes' : 'No unsaved changes'}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: font.sizeXs, color: color.textFaint, fontFamily: font.mono }}>
          {selectedFilename}
        </span>
      </div>
    </div>
  );
};
