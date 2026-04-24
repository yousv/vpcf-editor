import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { color, font, radius, shadow, space, zIndex } from '../theme';

const TOAST_ICON: Record<string, React.ReactNode> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke={color.success} strokeWidth="1.3"/>
      <path d="M4 7l2.5 2.5L10 5" stroke={color.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke={color.error} strokeWidth="1.3"/>
      <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke={color.error} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L12.5 11.5H1.5L7 1.5z" stroke={color.warning} strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M7 5.5v3M7 9.5v.5" stroke={color.warning} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke={color.textMuted} strokeWidth="1.3"/>
      <path d="M7 6v4M7 4.5v.5" stroke={color.textMuted} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
};

const ACCENT_COLOR: Record<string, string> = {
  success: color.success,
  error:   color.error,
  warning: color.warning,
  info:    color.textMuted,
};

const ToastItem: React.FC<{ id: string; type: string; message: string }> = ({ id, type, message }) => {
  const { dismissToast } = useAppStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(showTimer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => dismissToast(id), 180);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.md,
        padding: `${space.md}px ${space.lg}px`,
        background: color.surfaceRaised,
        border: `1px solid ${color.border}`,
        borderLeft: `3px solid ${ACCENT_COLOR[type] ?? color.textMuted}`,
        borderRadius: radius.lg,
        boxShadow: shadow.md,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 0.18s ease, transform 0.18s ease`,
        maxWidth: 380,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {TOAST_ICON[type]}
      </div>
      <span style={{ flex: 1, fontSize: font.sizeSm, color: color.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {message}
      </span>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: color.textFaint, padding: 0, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useAppStore();

  return (
    <div style={{
      position: 'fixed',
      bottom: space.xl,
      right: space.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: space.sm,
      zIndex: zIndex.toast,
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} type={toast.type} message={toast.message} />
      ))}
    </div>
  );
};
