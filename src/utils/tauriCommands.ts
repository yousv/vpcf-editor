import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig, ColorChange, LoadedFile,
  SavedFileResult, SharedColorGroup,
} from '../types';

export interface RemoteVersion {
  version: string;
  releaseUrl?: string;
}

export const tauriCommands = {
  loadFolder: (path: string): Promise<LoadedFile[]> =>
    invoke('load_folder', { path }),

  readFileContent: (filename: string): Promise<string> =>
    invoke('read_file_content', { filename }),

  reloadFileFromDisk: (filename: string): Promise<LoadedFile> =>
    invoke('reload_file_from_disk', { filename }),

  saveFileColors: (filename: string, changes: ColorChange[]): Promise<SavedFileResult> =>
    invoke('save_file_colors', { filename, changes }),

  saveRawText: (filename: string, content: string): Promise<SavedFileResult> =>
    invoke('save_raw_text', { filename, content }),

  getFileMtime: (filename: string): Promise<number> =>
    invoke('get_file_mtime_cmd', { filename }),

  computeSharedColors: (threshold: number): Promise<SharedColorGroup[]> =>
    invoke('compute_shared_colors_cmd', { threshold }),

  applySharedColor: (oldRgb: number[], newRgb: number[], threshold: number): Promise<SavedFileResult[]> =>
    invoke('apply_shared_color_cmd', { oldRgb, newRgb, threshold }),

  getConfig: (): Promise<AppConfig> =>
    invoke('get_config_cmd'),

  saveConfig: (config: AppConfig): Promise<void> =>
    invoke('save_config_cmd', { config }),

  openFolderDialog: (): Promise<string | null> =>
    invoke('open_folder_dialog'),

  openUrl: (url: string): Promise<void> =>
    invoke('open_url', { url }),

  checkForUpdates: (): Promise<RemoteVersion> =>
    invoke('check_for_updates'),

  getColorlessFiles: (): Promise<string[]> =>
    invoke('get_colorless_files_cmd'),

  openConfigFolder: (): Promise<void> =>
    invoke('open_config_folder'),

  saveHistory: (folderPath: string, entries: import('../types').HistoryEntry[]): Promise<void> =>
    invoke('save_history_cmd', { folderPath, entries }),

  loadHistory: (folderPath: string): Promise<import('../types').HistoryEntry[]> =>
    invoke('load_history_cmd', { folderPath }),
};
