use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const CONFIG_FILENAME: &str = "vpcf-editor-config.json";

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub folder_path: Option<String>,
    #[serde(default)]
    pub saved_colors: Vec<String>,
    #[serde(default = "default_threshold")]
    pub color_match_threshold: f64,
}

fn default_threshold() -> f64 { 30.0 }

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            folder_path: None,
            saved_colors: Vec::new(),
            color_match_threshold: 30.0,
        }
    }
}

fn config_file_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("vpcf-editor")
        .join(CONFIG_FILENAME)
}

pub fn load_config() -> AppConfig {
    let config_path = config_file_path();
    if config_path.exists() {
        if let Ok(raw_text) = fs::read_to_string(&config_path) {
            if let Ok(parsed_config) = serde_json::from_str::<AppConfig>(&raw_text) {
                return parsed_config;
            }
        }
    }
    AppConfig::default()
}

pub fn save_config(app_config: &AppConfig) -> Result<(), String> {
    let config_path = config_file_path();
    if let Some(parent_dir) = config_path.parent() {
        fs::create_dir_all(parent_dir).map_err(|e| e.to_string())?;
    }
    let serialized = serde_json::to_string_pretty(app_config).map_err(|e| e.to_string())?;
    fs::write(&config_path, serialized).map_err(|e| e.to_string())?;
    Ok(())
}
