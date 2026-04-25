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
    closeFolder,
  } = useAppStore();

  const filteredFiles   = useFilteredFiles();
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartWidth  = useRef(sidebarWidth);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const listRef         = useRef<HTMLDivElement>(null);

  const folderDisplayName = config.folderPath
    ? config.folderPath.split(/[\\\/]/).filter(Boolean).pop() ?? 'Files'
    : null;

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedFilename]);

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
      pushToast('success', `Loaded ${files.length} file${files.length !== 1 ? 's' : ''}`);
    } catch (err) {
      pushToast('error', String(err));
    } finally {
      setIsLoadingFolder(false);
    }
  }, [config, initFileEditorState, persistConfig, pushToast, setIsLoadingFolder, setLoadedFiles, setSelectedFilename]);

  const handleCloseFolder = useCallback(async () => {
    await closeFolder();
    pushToast('info', 'Folder closed');
  }, [closeFolder, pushToast]);

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
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <IconButton title="Settings" onClick={onSettingsOpen}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6.5 1.5h3l.5 2a5 5 0 0 1 1.2.7l2-.7 1.5 2.6-1.6 1.3a5 5 0 0 1 0 1.4l1.6 1.3-1.5 2.6-2-.7a5 5 0 0 1-1.2.7l-.5 2h-3l-.5-2a5 5 0 0 1-1.2-.7l-2 .7L1.3 10l1.6-1.3a5 5 0 0 1 0-1.4L1.3 6l1.5-2.6 2 .7a5 5 0 0 1 1.2-.7l.5-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </IconButton>
          </div>
        </div>

        <div style={{ padding: `0 ${space.lg}px ${space.md}px`, flexShrink: 0 }}>
          <Input
            value={fileSearchQuery}
            onChange={setFileSearchQuery}
            placeholder="Filter files…"
            height={size.inputHeightSm}
          />
        </div>

        <Divider />

        <div
          ref={listRef}
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          style={{ flex: 1, overflowY: 'auto', padding: `${space.xs}px 0`, outline: 'none' }}
        >
          {isLoadingFolder ? (
            <div style={{ padding: space.xl, textAlign: 'center', color: color.textMuted, fontSize: font.sizeBase }}>
              Loading…
            </div>
          ) : filteredFiles.length === 0 && loadedFiles.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: `${space.xxl}px ${space.lg}px`, gap: space.xl,
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h5l2 2h11v11H3V6z" stroke={color.textFaint} strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              <span style={{ color: color.textMuted, fontSize: font.sizeBase, textAlign: 'center', lineHeight: 1.5 }}>
                No folder loaded
              </span>
              <Button variant="primary" height={size.buttonMd} width={sidebarWidth - 48} onClick={handleLoadFolder}>
                Open Folder
              </Button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ padding: space.xl, textAlign: 'center', color: color.textMuted, fontSize: font.sizeBase }}>
              No matches
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isSelected  = file.filename === selectedFilename;
              const editorState = fileEditorStates[file.filename];
              const hasUnsaved  = editorState && Object.keys(editorState.pendingChanges).length > 0;
              return (
                <SidebarItem
                  key={file.filename}
                  filename={file.filename}
                  isSelected={isSelected}
                  hasUnsaved={!!hasUnsaved}
                  itemRef={isSelected ? selectedItemRef : undefined}
                  onClick={() => { setSelectedFilename(file.filename); listRef.current?.focus(); }}
                />
              );
            })
          )}
        </div>

        {loadedFiles.length > 0 && (
          <>
            <Divider />
            <div style={{ padding: `${space.sm}px ${space.md}px`, flexShrink: 0, display: 'flex', gap: space.sm }}>
              <Button
                variant="ghost"
                height={size.buttonSm}
                width="100%"
                onClick={handleLoadFolder}
                style={{ justifyContent: 'flex-start', paddingLeft: space.md, flex: 1 }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
          marginLeft: 9, width: 6, height: 6,
          borderRadius: '50%', background: color.unsaved, flexShrink: 0,
        }} />
      )}
    </div>
  );
};

const CloseFolderButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Close folder"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: size.buttonSm, width: size.buttonSm,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isHovered ? color.surfaceActive : 'transparent',
        border: `1px solid ${isHovered ? color.border : 'transparent'}`,
        borderRadius: radius.md, cursor: 'pointer',
        color: isHovered ? color.error : color.textFaint,
        flexShrink: 0, padding: 0, transition: transition.quick,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  );
};
