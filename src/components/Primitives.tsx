import React, { CSSProperties, ReactNode, useState } from 'react';
import { color, font, radius, size, shadow, transition } from '../theme';

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
