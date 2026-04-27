import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from './store/appStore';
import { tauriCommands } from './utils/tauriCommands';
import { color, font, size, space, transition } from './theme';
import { Sidebar } from './components/Sidebar';
import { ColorEditorTab } from './components/ColorEditorTab';
import { SharedColorsTab } from './components/SharedColorsTab';
import { RawTextTab } from './components/RawTextTab';
import { SettingsDialog } from './components/SettingsDialog';
import { ToastContainer } from './components/ToastContainer';
import { SavedColorsPalette } from './components/SavedColorsPalette';
import type { TabName } from './types';

const TAB_LABELS: Record<TabName, string> = {
  colorEditor:  'Color Editor',
  sharedColors: 'Shared Colors',
  rawText:      'Raw Text',
};
const TAB_KEYS = Object.keys(TAB_LABELS) as TabName[];

export const App: React.FC = () => {
  const {
    activeTab, setActiveTab,
    setConfig, setLoadedFiles, initFileEditorState, setColorlessFiles,
    paletteSelectHandler, loadHistory,
  } = useAppStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const tabRefs = useRef<Partial<Record<TabName, HTMLButtonElement>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

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
            try {
              const colorless = await tauriCommands.getColorlessFiles();
              setColorlessFiles(colorless);
            } catch {}
            await loadHistory(loadedConfig.folderPath);
          } catch {}
        }
      } catch {}
    })();
  }, []);

  const updateIndicator = () => {
    const btn = tabRefs.current[activeTab];
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  };

  useEffect(updateIndicator, [activeTab]);

  useEffect(() => {
    const btn = tabRefs.current[activeTab];
    if (!btn) return;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(btn.parentElement ?? btn);
    return () => ro.disconnect();
  }, [activeTab]);

  const showPalette = activeTab !== 'rawText';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: color.background, overflow: 'hidden' }}>
      <Sidebar onSettingsOpen={() => setIsSettingsOpen(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: color.surface,
          borderBottom: `1px solid ${color.border}`,
          height: size.tabBarHeight,
          padding: `0 ${space.xl}px`,
          flexShrink: 0,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', position: 'relative' }}>
            {TAB_KEYS.map((tabKey) => (
              <TabButton
                key={tabKey}
                label={TAB_LABELS[tabKey]}
                isActive={activeTab === tabKey}
                onClick={() => setActiveTab(tabKey)}
                btnRef={(el) => { tabRefs.current[tabKey] = el ?? undefined; }}
              />
            ))}
            {indicator.ready && (
              <div style={{
                position: 'absolute',
                bottom: -1,
                left: indicator.left,
                width: indicator.width,
                height: 2,
                background: color.text,
                transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1), width 0.18s cubic-bezier(0.4,0,0.2,1)',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        </div>

        {showPalette && (
          <div style={{
            padding: `${space.md}px ${space.xl}px`,
            display: 'flex', alignItems: 'flex-start',
            gap: space.md, flexShrink: 0,
            borderBottom: `1px solid ${color.border}`,
            minHeight: 58,
          }}>
            <SavedColorsPalette
              onColorSelect={(hex) => paletteSelectHandler?.(hex)}
              selectedHex={null}
              allowAddColor
            />
          </div>
        )}

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

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  btnRef: (el: HTMLButtonElement | null) => void;
}> = ({ label, isActive, onClick, btnRef }) => {
  const [h, setH] = useState(false);
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        height: size.tabBarHeight,
        padding: '0 20px',
        border: 'none',
        background: 'transparent',
        color: isActive ? color.text : h ? '#999999' : color.textMuted,
        fontSize: font.sizeBase,
        fontWeight: isActive ? font.weightMedium : font.weightRegular,
        fontFamily: font.sans,
        cursor: 'pointer',
        transition: `color ${transition.quick}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        marginBottom: -1,
        position: 'relative',
      }}
    >
      {label}
    </button>
  );
};
