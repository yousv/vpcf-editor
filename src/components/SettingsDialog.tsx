import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useAppStore } from '../store/appStore';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, shadow, size, space, transition, zIndex } from '../theme';
import { Button, Divider } from './Primitives';
import type { ColorDisplayMode } from '../types';

const RELEASES_URL = 'https://github.com/yousv/vpcf-editor/releases';
type UpdateCheckState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error';

function compareSemver(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [aMaj = 0, aMin = 0, aPat = 0] = parse(a);
  const [bMaj = 0, bMin = 0, bPat = 0] = parse(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { config, persistConfig } = useAppStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [appVersion, setAppVersion]       = useState<string>('…');
  const [updateState, setUpdateState]     = useState<UpdateCheckState>('idle');
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl]       = useState<string | null>(null);
  const [visible, setVisible]             = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('unknown'));
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else { setVisible(false); setUpdateState('idle'); }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleCheckUpdates = useCallback(async () => {
    setUpdateState('checking');
    setRemoteVersion(null);
    setReleaseUrl(null);
    try {
      const data = await tauriCommands.checkForUpdates();
      setRemoteVersion(data.version);
      setReleaseUrl(data.releaseUrl ?? null);
      setUpdateState(compareSemver(data.version, appVersion) > 0 ? 'available' : 'up-to-date');
    } catch {
      setUpdateState('error');
    }
  }, [appVersion]);

  const handleOpenReleases = useCallback(async () => {
    await tauriCommands.openUrl(releaseUrl ?? RELEASES_URL);
  }, [releaseUrl]);

  const handleOpenGitHub = useCallback(async () => {
    await tauriCommands.openUrl('https://github.com/yousv/vpcf-editor');
  }, []);

  const handleOpenConfigFolder = useCallback(async () => {
    await tauriCommands.openConfigFolder();
  }, []);

  const handleDisplayModeChange = useCallback(async (mode: ColorDisplayMode) => {
    await persistConfig({ ...config, colorDisplayMode: mode });
  }, [config, persistConfig]);

  if (!isOpen) return null;

  const currentMode = config.colorDisplayMode ?? 'hex';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: zIndex.modal,
        background: color.backdrop,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      <div style={{
        background: color.surfaceRaised, border: `1px solid ${color.border}`,
        borderRadius: radius.xl, padding: space.xl, width: 500,
        boxShadow: shadow.lg,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
        transition: 'transform 0.15s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xl }}>
          <span style={{ fontSize: font.sizeLg, fontWeight: font.weightSemiBold, color: color.text }}>Settings</span>
          <CloseButton onClick={onClose} />
        </div>

        <Divider style={{ marginBottom: space.xl }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: space.xl }}>

          <SettingsSection title="Display">
            <SettingsRow label="Color format">
              <ToggleGroup
                options={[
                  { value: 'hex', label: 'HEX' },
                  { value: 'rgb', label: 'RGB' },
                ]}
                value={currentMode}
                onChange={(v) => handleDisplayModeChange(v as ColorDisplayMode)}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Data">
            <SettingsRow label="Config folder">
              <button
                onClick={handleOpenConfigFolder}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: size.buttonSm, padding: '0 12px',
                  background: color.surfaceHigh, border: `1px solid ${color.border}`,
                  borderRadius: radius.md, cursor: 'pointer',
                  fontSize: font.sizeSm, color: color.textMuted,
                  transition: transition.quick, whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.borderStrong; e.currentTarget.style.color = color.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.color = color.textMuted; }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3h4l1.5 1.5H12v7H2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M7 7v4M5.5 9.5L7 11l1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open Folder
              </button>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="About">
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
              <InfoRow label="Version" value={appVersion} />
              <InfoRow label="Author"  value="yousv" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Repository</span>
                <LinkButton onClick={handleOpenGitHub}>github.com/yousv/vpcf-editor</LinkButton>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Updates">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
              <UpdateStatus state={updateState} remoteVersion={remoteVersion} onOpenReleases={handleOpenReleases} />
              <CheckUpdatesButton state={updateState} onClick={handleCheckUpdates} />
            </div>
          </SettingsSection>
        </div>

        <Divider style={{ marginTop: space.xl, marginBottom: space.lg }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" height={size.buttonMd} width={96} onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={{ fontSize: font.sizeSm, fontWeight: font.weightSemiBold, color: color.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: space.md }}>
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
      {children}
    </div>
  </div>
);

const SettingsRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.xl, minHeight: 38 }}>
    <span style={{ fontSize: font.sizeSm, color: color.text }}>{label}</span>
    {children}
  </div>
);

const ToggleGroup: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'inline-flex',
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
    flexShrink: 0,
  }}>
    {options.map(opt => {
      const isActive = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            height: 28, padding: '0 14px',
            background: isActive ? color.surfaceHigh : 'transparent',
            border: `1px solid ${isActive ? color.borderStrong : 'transparent'}`,
            borderRadius: radius.sm,
            color: isActive ? color.text : color.textMuted,
            fontSize: font.sizeSm, fontWeight: font.weightMedium,
            cursor: isActive ? 'default' : 'pointer',
            transition: transition.quick, letterSpacing: '0.04em',
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = color.textMuted; }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: h ? color.surfaceActive : 'transparent',
        border: `1px solid ${h ? color.border : 'transparent'}`,
        cursor: 'pointer', color: h ? color.text : color.textMuted,
        borderRadius: radius.md, transition: transition.quick,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  );
};

const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: h ? color.text : color.textMuted,
        fontSize: font.sizeSm,
        textDecoration: h ? 'underline' : 'none',
        textDecorationColor: color.textFaint,
        padding: 0, transition: transition.quick,
      }}
    >
      {children}
    </button>
  );
};

const CheckUpdatesButton: React.FC<{ state: UpdateCheckState; onClick: () => void }> = ({ state, onClick }) => {
  const [h, setH] = useState(false);
  const busy = state === 'checking';
  return (
    <button
      onClick={onClick}
      disabled={busy}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        fontSize: font.sizeSm, fontWeight: font.weightMedium,
        color: color.text,
        background: h && !busy ? color.surfaceActive : color.surfaceHigh,
        border: `1px solid ${h && !busy ? color.borderStrong : color.border}`,
        borderRadius: radius.md, padding: '6px 12px',
        cursor: busy ? 'default' : 'pointer',
        transition: transition.quick,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
        style={busy ? { animation: 'spin 1s linear infinite' } : undefined}>
        <path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.5 1.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M10.5 1v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {busy ? 'Checking…' : 'Check for Updates'}
    </button>
  );
};

const UpdateStatus: React.FC<{ state: UpdateCheckState; remoteVersion: string | null; onOpenReleases: () => void }> = ({ state, remoteVersion, onOpenReleases }) => {
  if (state === 'idle')     return <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>—</span>;
  if (state === 'checking') return <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Checking…</span>;
  if (state === 'up-to-date') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="#5a9a6a" strokeWidth="1.3"/>
        <path d="M4 6.5l2 2 3-3" stroke="#5a9a6a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>You're up to date</span>
    </div>
  );
  if (state === 'available') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="#c9a84c" strokeWidth="1.3"/>
        <path d="M6.5 4v3M6.5 8.5v.5" stroke="#c9a84c" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: font.sizeSm, color: color.text }}>
        v{remoteVersion} available —{' '}
        <button
          onClick={onOpenReleases}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: color.text, fontSize: font.sizeSm,
            textDecoration: 'underline', textDecorationColor: color.textFaint,
          }}
        >View releases</button>
      </span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="#a85a5a" strokeWidth="1.3"/>
        <path d="M4 4l5 5M9 4l-5 5" stroke="#a85a5a" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Could not check for updates</span>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>{label}</span>
    <span style={{ fontSize: font.sizeSm, color: color.text, fontFamily: font.mono }}>{value}</span>
  </div>
);
