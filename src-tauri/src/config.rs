use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const CONFIG_FILENAME: &str = "vpcf-editor-config.json";

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ColorPaletteConfig {
    pub id:     String,
    pub name:   String,
    pub colors: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub folder_path: Option<String>,
    #[serde(default)]
    pub palettes: Vec<ColorPaletteConfig>,
    #[serde(default = "default_threshold")]
    pub color_match_threshold: f64,
    #[serde(default = "default_display_mode")]
    pub color_display_mode: String,
    #[serde(default, skip_serializing)]
    pub saved_colors: Vec<String>,
}

fn default_threshold() -> f64 { 30.0 }
fn default_display_mode() -> String { "hex".to_string() }

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            folder_path:           None,
            palettes:              Vec::new(),
            color_match_threshold: 30.0,
            color_display_mode:    "hex".to_string(),
            saved_colors:          Vec::new(),
        }
    }
}

pub fn config_dir_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("vpcf-editor")
}

fn config_file_path() -> PathBuf {
    config_dir_path().join(CONFIG_FILENAME)
}

pub fn load_config() -> AppConfig {
    let config_path = config_file_path();
    if config_path.exists() {
        if let Ok(raw_text) = fs::read_to_string(&config_path) {
            if let Ok(mut parsed) = serde_json::from_str::<AppConfig>(&raw_text) {
                if parsed.palettes.is_empty() && !parsed.saved_colors.is_empty() {
                    parsed.palettes = vec![ColorPaletteConfig {
                        id:     "default".to_string(),
                        name:   "Default".to_string(),
                        colors: parsed.saved_colors.clone(),
                    }];
                    parsed.saved_colors.clear();
                    let _ = save_config(&parsed);
                }
                return parsed;
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
