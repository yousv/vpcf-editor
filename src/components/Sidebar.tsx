import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useFilteredFiles } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, size, space, transition } from '../theme';
import { Button, Divider, IconButton, Input } from './Primitives';

interface SidebarProps {
  onSettingsOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSettingsOpen }) => {
  const {
    loadedFiles, selectedFilename, setSelectedFilename,
    sidebarWidth, setSidebarWidth,
    fileSearchQuery, setFileSearchQuery,
    isLoadingFolder, setIsLoadingFolder,
    setLoadedFiles, initFileEditorState,
    fileEditorStates, pushToast,
    config, persistConfig, navigateFile,
    closeFolder, colorlessFiles, setColorlessFiles,
    loadHistory,
  } = useAppStore();

  const filteredFiles   = useFilteredFiles();
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartWidth  = useRef(sidebarWidth);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const listRef         = useRef<HTMLDivElement>(null);

  const [showColorlessPopup, setShowColorlessPopup] = useState(false);
  const popupRef     = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  const folderDisplayName = config.folderPath
    ? config.folderPath.split(/[\\\/]/).filter(Boolean).pop() ?? 'Files'
    : null;

  useEffect(() => { selectedItemRef.current?.scrollIntoView({ block: 'nearest' }); }, [selectedFilename]);

  useEffect(() => {
    if (!showColorlessPopup) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setShowColorlessPopup(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorlessPopup]);

  const openPopup = useCallback(() => {
    if (!triggerRef.current) return;
    const rect       = triggerRef.current.getBoundingClientRect();
    const popupW     = 280;
    const popupH     = Math.min(280, colorlessFiles.length * 28 + 80);
    const viewportW  = window.innerWidth;
    const viewportH  = window.innerHeight;
    let left = rect.right - popupW;
    let top  = rect.bottom + 6;
    if (left < 8) left = 8;
    if (left + popupW > viewportW - 8) left = viewportW - popupW - 8;
    if (top + popupH > viewportH - 8) top = rect.top - popupH - 6;
    setPopupPos({ top, left });
    setShowColorlessPopup(v => !v);
  }, [colorlessFiles.length]);

  const handleLoadFolder = useCallback(async () => {
    const chosenPath = await tauriCommands.openFolderDialog();
    if (!chosenPath) return;
    setIsLoadingFolder(true);
    try {
      const files = await tauriCommands.loadFolder(chosenPath);
      setLoadedFiles(files);
      files.forEach((f) => initFileEditorState(f.filename, f.fields));
      await persistConfig({ ...config, folderPath: chosenPath });
      if (files.length > 0) setSelectedFilename(files[0].filename);
      try {
        const colorless = await tauriCommands.getColorlessFiles();
        setColorlessFiles(colorless);
      } catch {}
      await loadHistory(chosenPath);
      pushToast('success', `Loaded ${files.length} file${files.length !== 1 ? 's' : ''}`);
    } catch (err) {
      pushToast('error', String(err));
    } finally {
      setIsLoadingFolder(false);
    }
  }, [config, initFileEditorState, persistConfig, pushToast, setIsLoadingFolder, setLoadedFiles, setSelectedFilename, setColorlessFiles]);

  const handleCloseFolder = useCallback(async () => {
    await closeFolder();
    setColorlessFiles([]);
    pushToast('info', 'Folder closed');
  }, [closeFolder, pushToast, setColorlessFiles]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateFile(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); navigateFile(-1); }
  }, [navigateFile]);

  const onResizeDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current     = true;
    dragStartX.current     = e.clientX;
    dragStartWidth.current = sidebarWidth;
    e.preventDefault();
  }, [sidebarWidth]);

  const onResizeDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = Math.max(
      size.sidebarMinWidth,
      Math.min(dragStartWidth.current + e.clientX - dragStartX.current, size.sidebarMaxWidth)
    );
    setSidebarWidth(newWidth);
  }, [setSidebarWidth]);

  const onResizeDragEnd = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onResizeDragMove);
    window.addEventListener('mouseup', onResizeDragEnd);
    return () => {
      window.removeEventListener('mousemove', onResizeDragMove);
      window.removeEventListener('mouseup', onResizeDragEnd);
    };
  }, [onResizeDragMove, onResizeDragEnd]);

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      <div style={{
        width: sidebarWidth, display: 'flex', flexDirection: 'column',
        background: color.surface, height: '100%',
        overflow: 'hidden', flexShrink: 0,
        borderRight: `1px solid ${color.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${space.lg}px ${space.lg}px ${space.md}px`, flexShrink: 0,
        }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              minWidth: 0, flex: 1,
              cursor: folderDisplayName ? 'pointer' : 'default',
            }}
            title={config.folderPath ?? undefined}
            onClick={folderDisplayName ? handleLoadFolder : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2 4h5l2 2h5v8H2V4z" stroke={color.textFaint} strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            <span style={{
              fontSize: font.sizeXs, fontWeight: font.weightSemiBold,
              color: folderDisplayName ? color.textMuted : color.textFaint,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {folderDisplayName ?? 'No Folder'}
            </span>
            {filteredFiles.length > 0 && (
              <span style={{ fontSize: font.sizeXs, color: color.textFaint, flexShrink: 0 }}>
                {filteredFiles.length}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, position: 'relative' }}>
            {colorlessFiles.length > 0 && (
              <button
                ref={triggerRef}
                onClick={openPopup}
                title={`${colorlessFiles.length} file${colorlessFiles.length !== 1 ? 's' : ''} with no color fields`}
                style={{
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: showColorlessPopup ? color.surfaceActive : 'transparent',
                  border: `1px solid ${showColorlessPopup ? color.border : 'transparent'}`,
                  borderRadius: radius.md, cursor: 'pointer',
                  transition: transition.quick, padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = color.surfaceRaised; e.currentTarget.style.borderColor = color.border; }}
                onMouseLeave={(e) => {
                  if (!showColorlessPopup) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }
                }}
              >
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke={color.warning} strokeWidth="1.3"/>
                  <path d="M7 4.5v3M7 9v.5" stroke={color.warning} strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            <IconButton onClick={onSettingsOpen} title="Settings">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M6.3 1.5h3.4l.4 1.6c.4.15.8.36 1.15.62l1.55-.52 1.7 2.94-1.2 1.05c.04.25.06.5.06.75s-.02.5-.06.75l1.2 1.05-1.7 2.94-1.55-.52c-.35.26-.75.47-1.15.62L9.7 14.5H6.3l-.4-1.61a5 5 0 0 1-1.15-.62l-1.55.52-1.7-2.94 1.2-1.05A5.1 5.1 0 0 1 2.65 8c0-.25.02-.5.05-.75L1.5 6.2l1.7-2.94 1.55.52c.35-.26.75-.47 1.15-.62L6.3 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </IconButton>
          </div>
        </div>

        {showColorlessPopup && popupPos && (
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: popupPos.top,
              left: popupPos.left,
              zIndex: 200,
              background: color.surfaceRaised,
              border: `1px solid ${color.borderStrong}`,
              borderRadius: radius.lg,
              padding: `${space.md}px`,
              width: 280, maxHeight: 280,
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ fontSize: font.sizeXs, color: color.warning, fontWeight: font.weightSemiBold, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: space.sm }}>
              No color fields found
            </div>
            <div style={{ fontSize: font.sizeXs, color: color.textFaint, marginBottom: space.md, lineHeight: 1.5 }}>
              These .vpcf files were found but contain no recognisable color values:
            </div>
            {colorlessFiles.map(f => (
              <div
                key={f}
                onClick={() => {
                  const s = useAppStore.getState();
                  s.setSelectedFilename(f);
                  s.setActiveTab('rawText');
                  setShowColorlessPopup(false);
                }}
                style={{
                  fontSize: font.sizeXs, fontFamily: font.mono, color: color.textMuted,
                  padding: '3px 0', lineHeight: 1.6, cursor: 'pointer', transition: transition.quick,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = color.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = color.textMuted)}
              >
                {f}
              </div>
            ))}
          </div>
        )}

        {loadedFiles.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: space.xl }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 8h10l4 4h10v16H4V8z" stroke={color.textFaint} strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <Button variant="primary" height={size.buttonMd} onClick={handleLoadFolder} disabled={isLoadingFolder}>
              {isLoadingFolder ? 'Loading…' : 'Open Folder'}
            </Button>
          </div>
        ) : (
          <>
            <div style={{ padding: `0 ${space.md}px ${space.sm}px`, flexShrink: 0 }}>
              <Input
                value={fileSearchQuery}
                onChange={setFileSearchQuery}
                placeholder="Filter files…"
                height={size.buttonSm}
              />
            </div>

            <div
              ref={listRef}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              style={{ flex: 1, overflowY: 'auto', outline: 'none', scrollbarWidth: 'thin', scrollbarColor: `${color.border} transparent` }}
            >
              {filteredFiles.length === 0 ? (
                <div style={{ padding: `${space.lg}px`, color: color.textFaint, fontSize: font.sizeSm, textAlign: 'center' }}>
                  No files match
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = file.filename === selectedFilename;
                  const hasUnsaved = Object.keys(fileEditorStates[file.filename]?.pendingChanges ?? {}).length > 0;
                  return (
                    <SidebarItem
                      key={file.filename}
                      filename={file.filename}
                      isSelected={isSelected}
                      hasUnsaved={hasUnsaved}
                      itemRef={isSelected ? selectedItemRef : undefined}
                      onClick={() => setSelectedFilename(file.filename)}
                    />
                  );
                })
              )}
            </div>

            <Divider />
            <div style={{ padding: `${space.sm}px ${space.md}px`, flexShrink: 0, display: 'flex', gap: space.sm }}>
              <Button
                variant="ghost"
                height={size.buttonSm}
                width="100%"
                onClick={handleLoadFolder}
                style={{ justifyContent: 'flex-start', paddingLeft: space.md, flex: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h5l2 2h5v8H2V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
                Change Folder
              </Button>
              <CloseFolderButton onClick={handleCloseFolder} />
            </div>
          </>
        )}
      </div>

      <div
        onMouseDown={onResizeDragStart}
        style={{ width: 4, cursor: 'ew-resize', background: 'transparent', flexShrink: 0, transition: transition.quick }}
        onMouseEnter={(e) => (e.currentTarget.style.background = color.border)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      />
    </div>
  );
};

const SidebarItem: React.FC<{
  filename: string;
  isSelected: boolean;
  hasUnsaved: boolean;
  itemRef?: React.RefObject<HTMLDivElement>;
  onClick: () => void;
}> = ({ filename, isSelected, hasUnsaved, itemRef, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      ref={itemRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `8px ${space.lg}px`, cursor: 'pointer',
        background: isSelected ? color.surfaceActive : isHovered ? color.surfaceRaised : 'transparent',
        borderLeft: `2px solid ${isSelected ? color.text : 'transparent'}`,
        transition: transition.quick,
      }}
    >
      <span style={{
        fontSize: font.sizeSm, fontFamily: font.mono,
        color: isSelected ? color.text : isHovered ? '#aaaaaa' : color.textMuted,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1, lineHeight: 1.4, transition: transition.quick,
      }}>
        {filename}
      </span>
      {hasUnsaved && (
        <div title="Unsaved changes" style={{
          marginLeft: 9, width: 7, height: 7,
          borderRadius: '50%', background: color.unsaved, flexShrink: 0,
        }} />
      )}
    </div>
  );
};

const CloseFolderButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Close folder"
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        height: size.buttonSm, width: size.buttonSm,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: h ? color.surfaceActive : 'transparent',
        border: `1px solid ${h ? color.border : 'transparent'}`,
        borderRadius: radius.md, cursor: 'pointer',
        color: h ? color.error : color.textFaint,
        flexShrink: 0, padding: 0, transition: transition.quick,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  );
};
