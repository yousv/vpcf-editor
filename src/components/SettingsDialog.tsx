import React, { useCallback, useEffect, useRef } from 'react';
import { tauriCommands } from '../utils/tauriCommands';
import { color, font, radius, shadow, size, space, zIndex } from '../theme';
import { Button, Divider } from './Primitives';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

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
              <InfoRow label="Version" value="0.9.0" />
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
        </div>

        <Divider style={{ marginTop: space.xl, marginBottom: space.lg }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" height={size.buttonMd} width={96} onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: font.sizeSm, color: color.textMuted }}>{label}</span>
    <span style={{ fontSize: font.sizeSm, color: color.text, fontFamily: font.mono }}>{value}</span>
  </div>
);