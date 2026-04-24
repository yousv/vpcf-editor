import { useMemo } from 'react';
import { create } from 'zustand';
import type {
  AppConfig, ColorField, FileEditorState, LoadedFile,
  PendingColorChange, TabName, Toast, ToastType,
} from '../types';
import { parseColorString } from '../utils/colorUtils';
import { tauriCommands } from '../utils/tauriCommands';

const MAX_UNDO = 50;

function buildOriginalColors(fields: ColorField[]): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  fields.forEach((f, i) => { out[i] = parseColorString(f.value); });
  return out;
}

function buildInitialEditorState(fields: ColorField[]): FileEditorState {
  return { fields, pendingChanges: {}, originalColors: buildOriginalColors(fields) };
}

interface AppStore {
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
  persistConfig: (config: AppConfig) => Promise<void>;

  loadedFiles: LoadedFile[];
  setLoadedFiles: (files: LoadedFile[]) => void;

  selectedFilename: string | null;
  setSelectedFilename: (filename: string | null) => void;
  navigateFile: (direction: 1 | -1) => void;
  navigateToFileInEditor: (filename: string) => void;

  fileEditorStates: Record<string, FileEditorState>;
  initFileEditorState: (filename: string, fields: ColorField[]) => void;
  setPendingChange: (filename: string, fieldIndex: number, newRgb: number[]) => void;
  resetPendingChange: (filename: string, fieldIndex: number) => void;
  clearFilePendingChanges: (filename: string) => void;
  updateFileFields: (filename: string, fields: ColorField[]) => void;

  undoStacks: Record<string, Array<Record<number, PendingColorChange>>>;
  pushToUndoStack: (filename: string) => void;
  undoChange: (filename: string) => void;

  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;

  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  fileSearchQuery: string;
  setFileSearchQuery: (query: string) => void;

  isLoadingFolder: boolean;
  setIsLoadingFolder: (loading: boolean) => void;

  toasts: Toast[];
  pushToast: (type: ToastType, message: string) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  config: { folderPath: null, savedColors: [], colorMatchThreshold: 25 },
  setConfig: (config) => set({ config }),
  persistConfig: async (config) => {
    set({ config });
    await tauriCommands.saveConfig(config);
  },

  loadedFiles: [],
  setLoadedFiles: (files) => set({ loadedFiles: files }),

  selectedFilename: null,
  setSelectedFilename: (filename) => set({ selectedFilename: filename }),

  navigateFile: (direction) => {
    const { loadedFiles, selectedFilename, fileSearchQuery } = get();
    const filtered = loadedFiles.filter(f =>
      f.filename.toLowerCase().includes(fileSearchQuery.toLowerCase())
    );
    if (filtered.length === 0) return;
    const cur = filtered.findIndex(f => f.filename === selectedFilename);
    const next = cur === -1
      ? (direction === 1 ? 0 : filtered.length - 1)
      : (cur + direction + filtered.length) % filtered.length;
    set({ selectedFilename: filtered[next].filename });
  },

  navigateToFileInEditor: (filename) => set({ selectedFilename: filename, activeTab: 'colorEditor' }),

  fileEditorStates: {},

  initFileEditorState: (filename, fields) => {
    const { fileEditorStates } = get();
    if (fileEditorStates[filename]) return;
    set({ fileEditorStates: { ...fileEditorStates, [filename]: buildInitialEditorState(fields) } });
  },

  setPendingChange: (filename, fieldIndex, newRgb) => {
    const { fileEditorStates } = get();
    const es = fileEditorStates[filename];
    if (!es) return;
    const originalRgb = es.originalColors[fieldIndex] ?? newRgb;
    set({
      fileEditorStates: {
        ...fileEditorStates,
        [filename]: {
          ...es,
          pendingChanges: { ...es.pendingChanges, [fieldIndex]: { fieldIndex, newRgb, originalRgb } },
        },
      },
    });
  },

  resetPendingChange: (filename, fieldIndex) => {
    const { fileEditorStates } = get();
    const es = fileEditorStates[filename];
    if (!es) return;
    const next = { ...es.pendingChanges };
    delete next[fieldIndex];
    set({ fileEditorStates: { ...fileEditorStates, [filename]: { ...es, pendingChanges: next } } });
  },

  clearFilePendingChanges: (filename) => {
    const { fileEditorStates } = get();
    const es = fileEditorStates[filename];
    if (!es) return;
    set({
      fileEditorStates: {
        ...fileEditorStates,
        [filename]: { ...es, pendingChanges: {}, originalColors: buildOriginalColors(es.fields) },
      },
    });
  },

  updateFileFields: (filename, fields) => {
    const { fileEditorStates } = get();
    const es = fileEditorStates[filename];
    const next: FileEditorState = es
      ? { ...es, fields, pendingChanges: {}, originalColors: buildOriginalColors(fields) }
      : buildInitialEditorState(fields);
    set({ fileEditorStates: { ...fileEditorStates, [filename]: next } });
  },

  undoStacks: {},

  pushToUndoStack: (filename) => {
    const { fileEditorStates, undoStacks } = get();
    const es = fileEditorStates[filename];
    if (!es) return;
    const stack = undoStacks[filename] ?? [];
    const trimmed = stack.length >= MAX_UNDO ? stack.slice(1) : stack;
    set({ undoStacks: { ...undoStacks, [filename]: [...trimmed, { ...es.pendingChanges }] } });
  },

  undoChange: (filename) => {
    const { fileEditorStates, undoStacks } = get();
    const stack = undoStacks[filename];
    if (!stack || stack.length === 0) return;
    const prev = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);
    const es = fileEditorStates[filename];
    if (!es) return;
    set({
      fileEditorStates: { ...fileEditorStates, [filename]: { ...es, pendingChanges: prev } },
      undoStacks: { ...undoStacks, [filename]: newStack },
    });
  },

  activeTab: 'colorEditor',
  setActiveTab: (tab) => set({ activeTab: tab }),

  sidebarWidth: 336,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  fileSearchQuery: '',
  setFileSearchQuery: (query) => set({ fileSearchQuery: query }),

  isLoadingFolder: false,
  setIsLoadingFolder: (loading) => set({ isLoadingFolder: loading }),

  toasts: [],
  pushToast: (type, message) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, message };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => get().dismissToast(id), 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useFilteredFiles() {
  const loadedFiles = useAppStore((s) => s.loadedFiles);
  const fileSearchQuery = useAppStore((s) => s.fileSearchQuery);
  return useMemo(
    () => loadedFiles.filter((f) =>
      f.filename.toLowerCase().includes(fileSearchQuery.toLowerCase())
    ),
    [loadedFiles, fileSearchQuery]
  );
}
