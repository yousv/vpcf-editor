import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { color, font, radius, size, shadow, space, transition } from '../theme';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  height?: number;
  width?: number | string;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({
  children, onClick, variant = 'default', height = size.buttonMd,
  width, disabled, style, title, type = 'button',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      background: disabled ? '#888' : isPressed ? '#cccccc' : isHovered ? '#e8e8e8' : color.white,
      borderColor: disabled ? '#888' : isPressed ? '#cccccc' : isHovered ? '#e8e8e8' : color.white,
      color: '#000000',
    },
    default: {
      background: isPressed ? color.surfaceHigh : isHovered ? color.surfaceActive : color.surfaceRaised,
      borderColor: isHovered ? color.borderStrong : color.border,
      color: isHovered ? color.text : color.textMuted,
    },
    ghost: {
      background: isPressed ? color.surfaceActive : isHovered ? color.surfaceRaised : 'transparent',
      borderColor: 'transparent',
      color: isHovered ? color.text : color.textMuted,
    },
    danger: {
      background: isPressed ? '#b91c1c' : isHovered ? color.errorDark : color.error,
      borderColor: isPressed ? '#b91c1c' : isHovered ? color.errorDark : color.error,
      color: '#ffffff',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, height, width: width ?? 'auto',
        padding: width ? 0 : '0 14px',
        borderRadius: radius.md, border: '1px solid',
        fontSize: font.sizeSm, fontWeight: font.weightMedium,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        transition: transition.quick,
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
        transform: isPressed && !disabled ? 'scale(0.965)' : 'scale(1)',
        letterSpacing: '0.01em',
        fontFamily: font.sans,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {children}
    </button>
  );
};

interface IconButtonProps {
  children: ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  size?: number;
  style?: CSSProperties;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children, onClick, title, disabled, size: btnSize = 28, style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        width: btnSize, height: btnSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isPressed ? color.surfaceHigh : isHovered && !disabled ? color.surfaceActive : 'transparent',
        border: `1px solid ${isHovered && !disabled ? color.border : 'transparent'}`,
        borderRadius: radius.md,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: transition.quick,
        transform: isPressed && !disabled ? 'scale(0.93)' : 'scale(1)',
        padding: 0, flexShrink: 0,
        color: isHovered ? color.text : color.textMuted,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  height?: number;
  width?: number | string;
  mono?: boolean;
  style?: CSSProperties;
  autoFocus?: boolean;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = ({
  value, onChange, onBlur, onKeyDown, placeholder,
  height = size.inputHeight, width, mono = false, style,
  autoFocus, maxLength,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => { setIsFocused(false); onBlur?.(); }}
      onFocus={() => setIsFocused(true)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={maxLength}
      style={{
        height, width: width ?? '100%', padding: '0 12px',
        background: color.surfaceActive,
        border: `1px solid ${isFocused ? '#444444' : color.border}`,
        borderRadius: radius.md, color: color.text,
        fontSize: font.sizeSm,
        fontFamily: mono ? font.mono : font.sans,
        transition: transition.quick,
        boxShadow: isFocused ? shadow.focus : 'none',
        ...style,
      }}
    />
  );
};

export const Divider: React.FC<{ style?: CSSProperties }> = ({ style }) => (
  <div style={{ height: 1, background: color.border, flexShrink: 0, ...style }} />
);

interface BadgeProps {
  children: ReactNode;
  badgeColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, badgeColor = color.textMuted }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: radius.sm,
    background: `${badgeColor}12`,
    border: `1px solid ${badgeColor}28`,
    fontSize: font.sizeXs, fontWeight: font.weightMedium,
    color: badgeColor, whiteSpace: 'nowrap' as const,
    letterSpacing: '0.01em',
  }}>
    {children}
  </span>
);

interface SwatchProps {
  hexColor: string;
  swatchSize?: number;
  onClick?: () => void;
  selected?: boolean;
  title?: string;
  style?: CSSProperties;
}

export const Swatch: React.FC<SwatchProps> = ({
  hexColor, swatchSize = size.swatchMd, onClick, selected, title, style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  return (
    <div
      title={title ?? hexColor}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        width: swatchSize, height: swatchSize,
        borderRadius: radius.md, background: hexColor,
        border: `1.5px solid ${selected ? color.white : isHovered && onClick ? '#555555' : color.border}`,
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0, transition: transition.quick,
        transform: isPressed && onClick ? 'scale(0.9)' : isHovered && onClick ? 'scale(1.06)' : 'scale(1)',
        boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.18)' : 'none',
        ...style,
      }}
    />
  );
};

export const SectionLabel: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({
  children, style,
}) => (
  <span style={{
    fontSize: font.sizeXs, fontWeight: font.weightMedium,
    color: color.textFaint, textTransform: 'uppercase' as const,
    letterSpacing: '0.1em', ...style,
  }}>
    {children}
  </span>
);

interface PickerButtonProps {
  currentHex: string;
  onInput: (hex: string) => void;
  onCommit?: () => void;
  btnSize?: number;
}

export const PickerButton: React.FC<PickerButtonProps> = ({
  currentHex, onInput, onCommit, btnSize = 30,
}) => {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen]       = useState(false);
  const [draft, setDraft]     = useState('#000000');
  const popoverRef            = useRef<HTMLDivElement>(null);
  const triggerRef            = useRef<HTMLButtonElement>(null);
  const handleApplyRef        = useRef<() => void>(() => {});
  const [pos, setPos]         = useState({ top: 0, left: 0 });

  const safeHex = /^#[0-9a-fA-F]{6}$/.test(currentHex) ? currentHex : '#000000';

  const openPicker = useCallback(() => {
    if (open) { setOpen(false); return; }
    setDraft(safeHex);
    if (triggerRef.current) {
      const r  = triggerRef.current.getBoundingClientRect();
      const pw = 190;
      const ph = 148;
      let left = r.left;
      let top  = r.bottom + 6;
      if (left + pw > window.innerWidth - 8)  left = window.innerWidth - pw - 8;
      if (top  + ph > window.innerHeight - 8) top  = r.top - ph - 6;
      setPos({ top, left });
    }
    setOpen(true);
  }, [safeHex, open]);

  const handleApply = useCallback(() => {
    onInput(draft);
    onCommit?.();
    setOpen(false);
  }, [draft, onInput, onCommit]);

  // Always keep ref pointing to latest handleApply so keydown never goes stale
  useEffect(() => { handleApplyRef.current = handleApply; }, [handleApply]);

  // Only re-attach listeners when open changes — not on every draft keystroke.
  // Use capture:true so stopPropagation in child components never blocks us.
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
      if (e.key === 'Enter')  { e.stopPropagation(); handleApplyRef.current(); }
    };

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown',   onKeyDown,   true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown',   onKeyDown,   true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={openPicker}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: btnSize, height: btnSize, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open || hovered ? color.surfaceActive : color.surfaceRaised,
          border: `1px solid ${open || hovered ? color.borderStrong : color.border}`,
          borderRadius: radius.md,
          color: open || hovered ? color.text : '#888888',
          cursor: 'pointer', padding: 0, transition: transition.quick,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M12 2l2 2-7.5 7.5H4.5v-2L12 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M10 4l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M3 12.5c-.5 1-1 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="3" cy="13" r="1" fill="currentColor"/>
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed', zIndex: 300,
            top: pos.top, left: pos.left,
            background: color.surfaceRaised,
            border: `1px solid ${color.borderStrong}`,
            borderRadius: radius.lg, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)', width: 190,
          }}
        >
          <input
            type="color"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ width: '100%', height: 34, border: 'none', padding: 0, cursor: 'crosshair', borderRadius: radius.md, background: 'none' }}
          />
          <input
            value={draft}
            maxLength={7}
            onChange={(e) => {
              const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setDraft(v);
            }}
            style={{
              height: 30, padding: '0 10px',
              background: color.surface, border: `1px solid ${color.border}`,
              borderRadius: radius.md, color: color.text,
              fontSize: font.sizeSm, fontFamily: font.mono, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(false)}
              style={{
                flex: 1, height: 28, border: `1px solid ${color.border}`,
                background: color.surface, borderRadius: radius.md, cursor: 'pointer',
                color: color.textMuted, fontSize: font.sizeSm,
              }}
            >Cancel</button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleApply}
              style={{
                flex: 2, height: 28, border: 'none',
                background: color.white, borderRadius: radius.md, cursor: 'pointer',
                color: '#000', fontSize: font.sizeSm, fontWeight: font.weightMedium,
              }}
            >Apply</button>
          </div>
        </div>
      )}
    </>
  );
};

interface RgbFieldsProps {
  rgb: number[];
  onChange: (rgb: number[]) => void;
  onCommit: () => void;
  onFocus?: () => void;
}

export const RgbFields: React.FC<RgbFieldsProps> = ({ rgb, onChange, onCommit, onFocus }) => {
  const clamp = (n: number) => Math.min(255, Math.max(0, n));

  const [vals, setVals] = useState([
    String(clamp(rgb[0] ?? 0)),
    String(clamp(rgb[1] ?? 0)),
    String(clamp(rgb[2] ?? 0)),
  ]);

  const rgbKey = `${rgb[0]}-${rgb[1]}-${rgb[2]}`;
  useEffect(() => {
    setVals([
      String(clamp(rgb[0] ?? 0)),
      String(clamp(rgb[1] ?? 0)),
      String(clamp(rgb[2] ?? 0)),
    ]);
  }, [rgbKey]);

  const handleChange = (idx: number, val: string) => {
    const next = [...vals];
    next[idx] = val;
    setVals(next);
    const nums = next.map(v => { const n = parseInt(v, 10); return isNaN(n) ? null : clamp(n); });
    if (nums.every(n => n !== null)) onChange(nums as number[]);
  };

  const handleBlur = () => {
    const nums = vals.map(v => { const n = parseInt(v, 10); return isNaN(n) ? 0 : clamp(n); });
    setVals(nums.map(String));
    onChange(nums);
    onCommit();
  };

  const fieldStyle: CSSProperties = {
    width: 42, height: size.inputHeightSm,
    padding: '0 4px', textAlign: 'center',
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.md,
    color: color.text, fontSize: font.sizeSm, fontFamily: font.mono,
    outline: 'none', transition: transition.quick,
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
      {(['R', 'G', 'B'] as const).map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 11, color: color.textFaint, fontFamily: font.mono, lineHeight: 1, userSelect: 'none' }}>{label}</span>
          <input
            value={vals[i]}
            maxLength={3}
            onChange={(e) => handleChange(i, e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); e.stopPropagation(); }}
            onClick={(e) => e.stopPropagation()}
            style={fieldStyle}
          />
        </div>
      ))}
    </div>
  );
};

interface UnsavedBarProps {
  count: number;
  noun: string;
  onDiscard?: () => void;
}

export const UnsavedBar: React.FC<UnsavedBarProps> = ({ count, noun, onDiscard }) => {
  if (count === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `0 ${space.xl}px`, height: 34, flexShrink: 0,
      background: `${color.unsaved}0B`,
      borderBottom: `1px solid ${color.unsaved}28`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color.unsaved, flexShrink: 0 }} />
        <span style={{ fontSize: font.sizeXs, color: color.unsaved, fontWeight: font.weightMedium }}>
          {count} unsaved {noun}{count !== 1 ? 's' : ''}
        </span>
      </div>
      {onDiscard && (
        <button
          onClick={onDiscard}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: font.sizeXs, color: color.textFaint, padding: '2px 8px',
            borderRadius: radius.sm, transition: transition.quick,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = color.textMuted)}
          onMouseLeave={(e) => (e.currentTarget.style.color = color.textFaint)}
        >
          Discard
        </button>
      )}
    </div>
  );
};
