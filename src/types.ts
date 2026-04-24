export type TabName = 'colorEditor' | 'sharedColors' | 'rawText';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ColorField {
  fieldName: string;
  value: string;
  lineIndex: number;
  filename: string;
}

export interface LoadedFile {
  filename: string;
  absPath: string;
  fields: ColorField[];
}

export interface ColorChange {
  fieldIndex: number;
  newRgb: number[];
}

export interface SavedFileResult {
  filename: string;
  fields: ColorField[];
}

export interface SharedColorGroup {
  hex: string;
  rgb: number[];
  count: number;
  total: number;
  files: string[];
  fieldNames: string[];
}

export interface AppConfig {
  folderPath: string | null;
  savedColors: string[];
  colorMatchThreshold: number;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface UpdateInfo {
  version: string;
  releaseUrl: string;
  body: string;
}

export interface PendingColorChange {
  fieldIndex: number;
  newRgb: number[];
  originalRgb: number[];
}

export interface FileEditorState {
  fields: ColorField[];
  pendingChanges: Record<number, PendingColorChange>;
  originalColors: Record<number, number[]>;
}
