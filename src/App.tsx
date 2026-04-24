import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { tauriCommands } from './utils/tauriCommands';
import { color, font, size, space, transition } from './theme';
import { Sidebar } from './components/Sidebar';
import { ColorEditorTab } from './components/ColorEditorTab';
import { SharedColorsTab } from './components/SharedColorsTab';
import { RawTextTab } from './components/RawTextTab';
import { SettingsDialog } from './components/SettingsDialog';
import { ToastContainer } from './components/ToastContainer';
import type { TabName } from './types';

const TAB_LABELS: Record<TabName, string> = {
  colorEditor:  'Color Editor',
  sharedColors: 'Shared Colors',
  rawText:      'Raw Text',
};

export const App: React.FC = () => {
  const {
    activeTab, setActiveTab,
    setConfig, setLoadedFiles, initFileEditorState,
  } = useAppStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const loadedConfig = await tauriCommands.getConfig();
        setConfig(loadedConfig);
        if (loadedConfig.folderPath) {
          try {
            const loadedFiles = await tauriCommands.loadFolder(loadedConfig.folderPath);
            setLoadedFiles(loadedFiles);
            loadedFiles.forEach((f) => initFileEditorState(f.filename, f.fields));
          } catch {}
        }
      } catch {}
    })();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: color.background, overflow: 'hidden' }}>
      <Sidebar onSettingsOpen={() => setIsSettingsOpen(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          background: color.surface,
          borderBottom: `1px solid ${color.border}`,
          height: size.tabBarHeight,
          padding: `0 ${space.xl}px`,
          flexShrink: 0,
        }}>
          {(Object.keys(TAB_LABELS) as TabName[]).map((tabKey) => (
            <TabButton
              key={tabKey}
              label={TAB_LABELS[tabKey]}
              isActive={activeTab === tabKey}
              onClick={() => setActiveTab(tabKey)}
            />
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'colorEditor'  && <ColorEditorTab />}
          {activeTab === 'sharedColors' && <SharedColorsTab />}
          {activeTab === 'rawText'      && <RawTextTab />}
        </div>
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ToastContainer />
    </div>
  );
};

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({
  label, isActive, onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: '100%',
        padding: '0 18px',
        border: 'none',
        borderBottom: `2px solid ${isActive ? color.text : 'transparent'}`,
        background: 'transparent',
        color: isActive ? color.text : isHovered ? '#999999' : color.textMuted,
        fontSize: font.sizeBase,
        fontWeight: isActive ? font.weightMedium : font.weightRegular,
        fontFamily: font.sans,
        cursor: 'pointer',
        transition: transition.quick,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );
};