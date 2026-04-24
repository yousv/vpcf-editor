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
import type { TabName, UpdateInfo } from './types';

const TAB_LABELS: Record<TabName, string> = {
  colorEditor:  'Color Editor',
  sharedColors: 'Shared Colors',
  rawText:      'Raw Text',
};

type UpdateState = 'idle' | 'available' | 'installing' | 'installed';

export const App: React.FC = () => {
  const {
    activeTab, setActiveTab,
    setConfig, setLoadedFiles, initFileEditorState, pushToast,
  } = useAppStore();

  const [isSettingsOpen, setIsSettingsOpen]     = useState(false);
  const [updateState, setUpdateState]           = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo]             = useState<UpdateInfo | null>(null);

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

      setTimeout(async () => {
        try {
          const info = await tauriCommands.checkForUpdates();
          if (info) { setUpdateInfo(info); setUpdateState('available'); }
        } catch {}
      }, 2000);
    })();
  }, []);

  const handleInstallUpdate = async () => {
    setUpdateState('installing');
    try {
      await tauriCommands.restartApp();
    } catch {
      pushToast('error', 'Update install failed');
      setUpdateState('available');
    }
  };

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

        {updateState !== 'idle' && (
          <UpdateBanner
            state={updateState}
            info={updateInfo}
            onInstall={handleInstallUpdate}
            onDismiss={() => setUpdateState('idle')}
          />
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

const UpdateBanner: React.FC<{
  state: UpdateState;
  info: UpdateInfo | null;
  onInstall: () => void;
  onDismiss: () => void;
}> = ({ state, info, onInstall, onDismiss }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `8px ${space.xl}px`,
    background: color.surfaceRaised,
    borderBottom: `1px solid ${color.border}`,
    flexShrink: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke={color.textMuted} strokeWidth="1.3"/>
        <path d="M7 4v4M7 9.5v.5" stroke={color.textMuted} strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: font.sizeSm, color: color.text }}>
        {state === 'available'   && `v${info?.version} available`}
        {state === 'installing'  && 'Installing update…'}
        {state === 'installed'   && 'Update installed — restart to apply'}
      </span>
      {info?.body && state === 'available' && (
        <span style={{ fontSize: font.sizeXs, color: color.textMuted }}>
          {info.body.split('\n')[0]?.slice(0, 80)}
        </span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
      {state === 'available' && (
        <>
          <button
            onClick={onInstall}
            style={{
              fontSize: font.sizeSm, fontWeight: font.weightMedium,
              color: color.text, background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 10px',
              borderRadius: 5, backgroundColor: color.surfaceHigh,
            }}
          >
            Install
          </button>
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: color.textMuted, padding: 4, display: 'flex' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </>
      )}
      {state === 'installed' && (
        <button
          onClick={() => tauriCommands.restartApp()}
          style={{
            fontSize: font.sizeSm, fontWeight: font.weightMedium,
            color: color.text, background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 10px',
            borderRadius: 5, backgroundColor: color.surfaceHigh,
          }}
        >
          Restart
        </button>
      )}
    </div>
  </div>
);
