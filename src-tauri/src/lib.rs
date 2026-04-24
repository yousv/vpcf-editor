mod color_utils;
mod config;
mod file_ops;

use config::{load_config, save_config, AppConfig};
use file_ops::{
    apply_color_changes_to_content, apply_shared_color_to_files, backup_file,
    compute_shared_colors, find_vpcf_files, get_file_mtime, parse_color_fields, read_file,
    write_file, ColorChange, ColorField, FileData, LoadedFile, SavedFileResult, SharedColorGroup,
};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::State;

pub struct AppStateInner {
    pub files: HashMap<String, FileData>,
    pub folder_path: Option<String>,
    pub config: AppConfig,
}

pub struct AppState(pub Mutex<AppStateInner>);

fn lock_state<'a>(state: &'a State<'a, AppState>) -> Result<std::sync::MutexGuard<'a, AppStateInner>, String> {
    state.0.lock().map_err(|e| format!("State lock poisoned: {}", e))
}

#[tauri::command]
fn load_folder(path: String, state: State<'_, AppState>) -> Result<Vec<LoadedFile>, String> {
    let vpcf_paths = find_vpcf_files(&path);
    if vpcf_paths.is_empty() {
        return Err("No .vpcf files found in the selected folder.".to_string());
    }

    let mut file_map: HashMap<String, FileData> = HashMap::new();
    let mut loaded_list: Vec<LoadedFile> = Vec::new();

    for abs_path in &vpcf_paths {
        let relative_name = Path::new(abs_path)
            .strip_prefix(&path)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| abs_path.clone());

        let raw_content = match read_file(abs_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let parsed_fields = parse_color_fields(&raw_content, &relative_name);
        if parsed_fields.is_empty() { continue; }

        let last_modified = get_file_mtime(abs_path);

        loaded_list.push(LoadedFile {
            filename: relative_name.clone(),
            abs_path: abs_path.clone(),
            fields: parsed_fields.clone(),
        });

        file_map.insert(relative_name, FileData {
            abs_path: abs_path.clone(),
            content: raw_content,
            fields: parsed_fields,
            mtime: last_modified,
        });
    }

    if file_map.is_empty() {
        return Err("Found .vpcf files but none contain recognised color fields.".to_string());
    }

    let mut inner = lock_state(&state)?;
    inner.files = file_map;
    inner.folder_path = Some(path.clone());
    inner.config.folder_path = Some(path);
    let _ = save_config(&inner.config);

    Ok(loaded_list)
}

#[tauri::command]
fn read_file_content(filename: String, state: State<'_, AppState>) -> Result<String, String> {
    let inner = lock_state(&state)?;
    inner.files.get(&filename)
        .map(|fd| fd.content.clone())
        .ok_or_else(|| format!("File not found in state: {}", filename))
}

#[tauri::command]
fn reload_file_from_disk(filename: String, state: State<'_, AppState>) -> Result<LoadedFile, String> {
    let abs_path = {
        let inner = lock_state(&state)?;
        inner.files.get(&filename)
            .map(|fd| fd.abs_path.clone())
            .ok_or_else(|| format!("File not found: {}", filename))?
    };

    let refreshed_content = read_file(&abs_path)?;
    let refreshed_fields  = parse_color_fields(&refreshed_content, &filename);
    let new_mtime         = get_file_mtime(&abs_path);

    let mut inner = lock_state(&state)?;
    if let Some(fd) = inner.files.get_mut(&filename) {
        fd.content = refreshed_content;
        fd.fields  = refreshed_fields.clone();
        fd.mtime   = new_mtime;
    }

    Ok(LoadedFile { filename, abs_path, fields: refreshed_fields })
}

#[tauri::command]
fn save_file_colors(
    filename: String,
    changes: Vec<ColorChange>,
    state: State<'_, AppState>,
) -> Result<SavedFileResult, String> {
    let mut inner = lock_state(&state)?;
    let file_data = inner.files.get(&filename)
        .ok_or_else(|| format!("File not found: {}", filename))?;

    let changes_map: HashMap<usize, Vec<u8>> = changes.into_iter()
        .map(|c| (c.field_index, c.new_rgb))
        .collect();

    let updated_content = apply_color_changes_to_content(&file_data.content, &file_data.fields, &changes_map);

    backup_file(&file_data.abs_path)?;
    write_file(&file_data.abs_path, &updated_content)?;

    let updated_fields = parse_color_fields(&updated_content, &filename);
    let new_mtime      = get_file_mtime(&file_data.abs_path);

    if let Some(fd) = inner.files.get_mut(&filename) {
        fd.content = updated_content;
        fd.fields  = updated_fields.clone();
        fd.mtime   = new_mtime;
    }

    Ok(SavedFileResult { filename, fields: updated_fields })
}

#[tauri::command]
fn save_raw_text(
    filename: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<SavedFileResult, String> {
    let abs_path = {
        let inner = lock_state(&state)?;
        inner.files.get(&filename)
            .map(|fd| fd.abs_path.clone())
            .ok_or_else(|| format!("File not found: {}", filename))?
    };

    backup_file(&abs_path)?;
    write_file(&abs_path, &content)?;

    let updated_fields = parse_color_fields(&content, &filename);
    let new_mtime      = get_file_mtime(&abs_path);

    let mut inner = lock_state(&state)?;
    if let Some(fd) = inner.files.get_mut(&filename) {
        fd.content = content;
        fd.fields  = updated_fields.clone();
        fd.mtime   = new_mtime;
    }

    Ok(SavedFileResult { filename, fields: updated_fields })
}

#[tauri::command]
fn get_file_mtime_cmd(filename: String, state: State<'_, AppState>) -> Result<u64, String> {
    let inner = lock_state(&state)?;
    Ok(inner.files.get(&filename)
        .map(|fd| get_file_mtime(&fd.abs_path))
        .unwrap_or(0))
}

#[tauri::command]
fn compute_shared_colors_cmd(threshold: f64, state: State<'_, AppState>) -> Result<Vec<SharedColorGroup>, String> {
    let inner = lock_state(&state)?;
    let all_fields: Vec<ColorField> = inner.files.values().flat_map(|fd| fd.fields.clone()).collect();
    Ok(compute_shared_colors(&all_fields, threshold))
}

#[tauri::command]
fn apply_shared_color_cmd(
    old_rgb: Vec<u8>,
    new_rgb: Vec<u8>,
    threshold: f64,
    state: State<'_, AppState>,
) -> Result<Vec<SavedFileResult>, String> {
    let mut inner = lock_state(&state)?;
    apply_shared_color_to_files(&old_rgb, &new_rgb, threshold, &mut inner.files)
}

#[tauri::command]
fn get_config_cmd(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let inner = lock_state(&state)?;
    Ok(inner.config.clone())
}

#[tauri::command]
fn save_config_cmd(config: AppConfig, state: State<'_, AppState>) -> Result<(), String> {
    let mut inner = lock_state(&state)?;
    inner.config = config;
    save_config(&inner.config)
}

#[tauri::command]
fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let chosen_folder = app.dialog().file().blocking_pick_folder();
    Ok(chosen_folder.map(|p| p.to_string()))
}

#[tauri::command]
fn open_url(url: String, app: tauri::AppHandle) -> Result<(), String> {
    let scheme = url.split(':').next().unwrap_or("").to_lowercase();
    if scheme != "https" && scheme != "http" {
        return Err(format!("Blocked non-http URL scheme: {}", scheme));
    }
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let loaded_config = load_config();
    let initial_state = AppStateInner {
        files: HashMap::new(),
        folder_path: None,
        config: loaded_config,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState(Mutex::new(initial_state)))
        .invoke_handler(tauri::generate_handler![
            load_folder,
            read_file_content,
            reload_file_from_disk,
            save_file_colors,
            save_raw_text,
            get_file_mtime_cmd,
            compute_shared_colors_cmd,
            apply_shared_color_cmd,
            get_config_cmd,
            save_config_cmd,
            open_folder_dialog,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}