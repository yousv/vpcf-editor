import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, shadow, size, space, zIndex } from '../theme';
import { Button, Divider } from './Primitives';

const RELEASES_URL = 'https://github.com/yousv/vpcf-editor/releases';

type UpdateCheckState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error';

function compareSemver(a: string, b: string): number {
  const parse = (v: string) => {
    const parts = v.replace(/^v/, '').split('.');
    return [
      Number(parts[0] ?? 0),
      Number(parts[1] ?? 0),
      Number(parts[2] ?? 0),
    ];
  };
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [appVersion, setAppVersion] = useState<string>('…');
  const [updateState, setUpdateState] = useState<UpdateCheckState>('idle');
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('unknown'));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setUpdateState('idle');
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: zIndex.modal,
        background: color.backdrop, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: color.surfaceRaised, border: `1px solid ${color.border}`,
        borderRadius: radius.xl, padding: space.xl,
        width: 480, boxShadow: shadow.lg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xl }}>
          <span style={{ fontSize: font.sizeLg, fontWeight: font.weightSemiBold, color: color.text }}>Settings</span>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer', color: color.textMuted, borderRadius: radius.md,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <Divider style={{ marginBottom: space.xl }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: space.xl }}>
          <div>
            <div style={{ fontSize: font.sizeMd, fontWeight: font.weightMedium, color: color.text, marginBottom: space.md }}>
              About
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
              <InfoRow label="Version" value={appVersion} />
              <InfoRow label="Author" value="yousv" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Repository</span>
                <button
                  onClick={handleOpenGitHub}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: color.text, fontSize: font.sizeSm,
                    textDecoration: 'underline', textDecorationColor: color.textFaint,
                    padding: 0,
                  }}
                >
                  github.com/yousv/vpcf-editor
                </button>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: font.sizeMd, fontWeight: font.weightMedium, color: color.text, marginBottom: space.md }}>
              Updates
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
              <UpdateStatus state={updateState} remoteVersion={remoteVersion} onOpenReleases={handleOpenReleases} />
              <button
                onClick={handleCheckUpdates}
                disabled={updateState === 'checking'}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: font.sizeSm, fontWeight: font.weightMedium,
                  color: updateState === 'checking' ? color.textMuted : color.text,
                  background: color.surfaceHigh, border: `1px solid ${color.border}`,
                  borderRadius: radius.md, padding: '6px 12px',
                  cursor: updateState === 'checking' ? 'default' : 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {updateState === 'checking' ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="6.5" cy="6.5" r="5" stroke={color.textMuted} strokeWidth="1.4" strokeDasharray="20 12"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1.5A5 5 0 1 1 2 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M2 3.5V6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {updateState === 'checking' ? 'Checking…' : 'Check for Updates'}
              </button>
            </div>
          </div>
        </div>

        <Divider style={{ marginTop: space.xl, marginBottom: space.lg }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" height={size.buttonMd} width={96} onClick={onClose}>Close</Button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const UpdateStatus: React.FC<{
  state: UpdateCheckState;
  remoteVersion: string | null;
  onOpenReleases: () => void;
}> = ({ state, remoteVersion, onOpenReleases }) => {
  if (state === 'idle') {
    return <span style={{ fontSize: font.sizeSm, color: color.textFaint }}>—</span>;
  }
  if (state === 'checking') {
    return <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>Checking for updates…</span>;
  }
  if (state === 'up-to-date') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="#5a9a6a" strokeWidth="1.3"/>
          <path d="M4 6.5l2 2 3-3" stroke="#5a9a6a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>You're up to date</span>
      </div>
    );
  }
  if (state === 'available') {
    return (
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
          >
            View releases
          </button>
        </span>
      </div>
    );
  }
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