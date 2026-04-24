import React, { useCallback, useEffect, useRef } from 'react';
import { useAppStore, useFilteredFiles } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, size, space, transition } from '../theme';
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
  } = useAppStore();

  const filteredFiles = useFilteredFiles();

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(sidebarWidth);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
      const loadedFileList = await tauriCommands.loadFolder(chosenPath);
      setLoadedFiles(loadedFileList);
      loadedFileList.forEach((f) => initFileEditorState(f.filename, f.fields));
      await persistConfig({ ...config, folderPath: chosenPath });
      if (loadedFileList.length > 0) setSelectedFilename(loadedFileList[0].filename);
      pushToast('success', `Loaded ${loadedFileList.length} file${loadedFileList.length !== 1 ? 's' : ''}`);
    } catch (err) {
      pushToast('error', String(err));
    } finally {
      setIsLoadingFolder(false);
    }
  }, [config]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateFile(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); navigateFile(-1); }
  }, [navigateFile]);

  const onResizeDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    e.preventDefault();
  }, [sidebarWidth]);

  const onResizeDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = Math.max(size.sidebarMinWidth, Math.min(dragStartWidth.current + e.clientX - dragStartX.current, size.sidebarMaxWidth));
    setSidebarWidth(newWidth);
  }, []);

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
        width: sidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        background: color.surface,
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0,
        borderRight: `1px solid ${color.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${space.lg}px ${space.lg}px ${space.md}px`,
          flexShrink: 0,
        }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1, cursor: folderDisplayName ? 'pointer' : 'default' }}
            title={config.folderPath ?? undefined}
            onClick={folderDisplayName ? handleLoadFolder : undefined}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2 4h5l2 2h5v8H2V4z" stroke={color.textFaint} strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            <span style={{
              fontSize: font.sizeXs,
              fontWeight: font.weightSemiBold,
              color: folderDisplayName ? color.textMuted : color.textFaint,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
              const isSelected = file.filename === selectedFilename;
              const editorState = fileEditorStates[file.filename];
              const hasUnsavedChanges = editorState && Object.keys(editorState.pendingChanges).length > 0;

              return (
                <div
                  key={file.filename}
                  ref={isSelected ? selectedItemRef : undefined}
                  onClick={() => { setSelectedFilename(file.filename); listRef.current?.focus(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `8px ${space.lg}px`,
                    cursor: 'pointer',
                    background: isSelected ? color.surfaceActive : 'transparent',
                    borderLeft: `2px solid ${isSelected ? color.text : 'transparent'}`,
                    transition: transition.quick,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = color.surfaceRaised;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <span style={{
                    fontSize: font.sizeSm,
                    fontFamily: font.mono,
                    color: isSelected ? color.text : color.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    lineHeight: 1.4,
                  }}>
                    {file.filename}
                  </span>
                  {hasUnsavedChanges && (
                    <div title="Unsaved changes" style={{
                      marginLeft: 9,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color.unsaved,
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {loadedFiles.length > 0 && (
          <>
            <Divider />
            <div style={{ padding: space.md, flexShrink: 0 }}>
              <Button
                variant="ghost"
                height={size.buttonSm}
                width="100%"
                onClick={handleLoadFolder}
                style={{ justifyContent: 'flex-start', paddingLeft: space.md }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h5l2 2h5v8H2V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
                Change Folder
              </Button>
            </div>
          </>
        )}
      </div>

      <div
        onMouseDown={onResizeDragStart}
        style={{ width: 4, cursor: 'ew-resize', background: 'transparent', flexShrink: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = color.border)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      />
    </div>
  );
};
