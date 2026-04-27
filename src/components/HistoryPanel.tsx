import React, { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { color, font, radius, size, space, transition } from '../theme';
import type { HistoryEntry } from '../types';

const ACTION_LABELS: Record<string, string> = {
  edit:         'Edit',
  revert:       'Revert',
  save:         'Save',
  save_all:     'Save All',
  apply_shared: 'Apply Shared',
  undo:         'Undo',
  redo:         'Redo',
};

const ACTION_COLORS: Record<string, string> = {
  edit:         color.text,
  revert:       '#94a3b8',
  save:         '#22c55e',
  save_all:     '#22c55e',
  apply_shared: '#a78bfa',
  undo:         '#64748b',
  redo:         '#64748b',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function groupByDate(entries: HistoryEntry[]): { date: string; items: HistoryEntry[] }[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.timestamp);
    const key = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ open, onClose }) => {
  const { historyEntries, clearHistory } = useAppStore();
  const groups = groupByDate(historyEntries);

  const handleClear = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  return (
    <div style={{
      position: 'absolute', bottom: size.bottomBarHeight, right: 0,
      width: 340, maxHeight: 520,
      background: color.surfaceRaised,
      border: `1px solid ${color.borderStrong}`,
      borderRadius: `${radius.lg}px ${radius.lg}px 0 0`,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
      transform: open ? 'translateY(0)' : 'translateY(110%)',
      opacity: open ? 1 : 0,
      transition: 'transform 0.16s ease, opacity 0.12s ease',
      pointerEvents: open ? 'all' : 'none',
      zIndex: 50,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${space.md}px ${space.lg}px`,
        borderBottom: `1px solid ${color.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: font.sizeSm, fontWeight: font.weightSemiBold, color: color.text }}>
          Edit History
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {historyEntries.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: font.sizeXs, color: color.textFaint, padding: '2px 6px',
                borderRadius: radius.sm, transition: transition.quick,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = color.error)}
              onMouseLeave={(e) => (e.currentTarget.style.color = color.textFaint)}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: color.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: radius.sm, padding: 0, transition: transition.quick,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = color.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = color.textMuted)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${color.border} transparent` }}>
        {historyEntries.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: color.textFaint, fontSize: font.sizeXs }}>
            No history yet
          </div>
        ) : (
          groups.map(({ date, items }) => (
            <div key={date}>
              <div style={{
                padding: `${space.sm}px ${space.lg}px`,
                fontSize: font.sizeXs, color: color.textFaint,
                fontWeight: font.weightSemiBold, letterSpacing: '0.07em',
                textTransform: 'uppercase', borderBottom: `1px solid ${color.border}`,
                background: color.surface,
              }}>
                {date}
              </div>
              {items.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const HistoryRow: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
  const labelColor = ACTION_COLORS[entry.action] ?? color.textMuted;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: `8px ${space.lg}px`,
      borderBottom: `1px solid ${color.border}`,
    }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <span style={{
          display: 'inline-block', fontSize: 10, fontWeight: font.weightSemiBold,
          color: labelColor, background: `${labelColor}18`,
          border: `1px solid ${labelColor}30`,
          borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}>
          {ACTION_LABELS[entry.action] ?? entry.action}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {entry.oldHex && entry.newHex && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.oldHex.toLowerCase(), border: `1px solid ${color.border}`, display: 'inline-block', flexShrink: 0 }} />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: color.textFaint, flexShrink: 0 }}>
                <path d="M2 5h6M6 3l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.newHex.toLowerCase(), border: `1px solid ${color.border}`, display: 'inline-block', flexShrink: 0 }} />
            </div>
          )}
          {entry.fieldName && (
            <span style={{ fontSize: font.sizeXs, color: color.textMuted, fontFamily: font.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.fieldName}
            </span>
          )}
        </div>
        {entry.filename && (
          <div style={{ fontSize: font.sizeXs, color: color.textFaint, fontFamily: font.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {entry.filename}
          </div>
        )}
        <div style={{ fontSize: 11, color: color.textFaint, marginTop: 2 }}>
          {formatTimestamp(entry.timestamp)}
        </div>
      </div>
    </div>
  );
};
