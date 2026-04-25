use regex::Regex;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

use crate::color_utils::{color_distance, parse_color_string, rgb_to_hex};

static GRADIENT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?is)(m_Gradient\s*=\s*\{\s*m_Stops\s*=\s*\[\s*)((?:\{\s*m_flPosition\s*=\s*[\d.]+\s*m_Color\s*=\s*\[\s*[\d,\s]+\s*\]\s*\}\s*,?\s*)+)(\s*\]\s*\})",
    ).unwrap()
});

static STOP_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?is)(\{\s*m_flPosition\s*=\s*([\d.]+)\s*m_Color\s*=\s*\[\s*([\d,\s]+)\s*\]\s*\}\s*,?\s*)",
    ).unwrap()
});

static COLOR_FIELD_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?is)(\b(m_ConstantColor|m_ColorFade|m_Color1|m_Color2|m_ColorTint|m_TintColor|m_ColorMin|m_ColorMax|m_LiteralColor)\s*=\s*)(\[\s*[\d.,\s]+\s*\])",
    ).unwrap()
});

static FIELD_DISPLAY_NAMES: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut m = HashMap::new();
    m.insert("m_ConstantColor", "Base Color");
    m.insert("m_ColorFade",     "Color Fade");
    m.insert("m_Color1",        "Color 1");
    m.insert("m_Color2",        "Color 2");
    m.insert("m_ColorTint",     "Color Tint");
    m.insert("m_TintColor",     "Tint Color");
    m.insert("m_ColorMin",      "Color Min");
    m.insert("m_ColorMax",      "Color Max");
    m.insert("m_LiteralColor",  "Literal Color");
    m
});

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ColorField {
    pub field_type:          String,
    pub value:               String,
    pub full_match:          String,
    pub prefix:              String,
    pub field_name:          String,
    pub raw_name:            String,
    pub filename:            String,
    pub gradient_block_index: i32,
    pub stop_index:          i32,
    pub stop_position:       String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoadedFile {
    pub filename: String,
    pub abs_path: String,
    pub fields:   Vec<ColorField>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SharedColorGroup {
    pub hex:                String,
    pub rgb:                Vec<u8>,
    pub representative_rgb: Vec<u8>,
    pub field_names:        Vec<String>,
    pub files:              Vec<String>,
    pub count:              usize,
    pub total:              usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ColorChange {
    pub field_index: usize,
    pub new_rgb:     Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SavedFileResult {
    pub filename: String,
    pub fields:   Vec<ColorField>,
}

pub struct FileData {
    pub abs_path: String,
    pub content:  String,
    pub fields:   Vec<ColorField>,
    pub mtime:    u64,
}

/// Replace only the numeric token at position `ch_idx` within the original string.
/// Leaves brackets, commas, whitespace and all other characters untouched.
fn replace_numbers_in_value(s: &str, new_values: &[u8]) -> String {
    let mut result = String::with_capacity(s.len() + 8);
    let bytes = s.as_bytes();
    let mut i = 0;
    let mut num_idx = 0;

    while i < bytes.len() {
        if bytes[i].is_ascii_digit() {
            let start = i;
            while i < bytes.len() && (bytes[i].is_ascii_digit() || bytes[i] == b'.') {
                i += 1;
            }
            if num_idx < new_values.len() {
                result.push_str(&new_values[num_idx].to_string());
                num_idx += 1;
            } else {
                result.push_str(&s[start..i]);
            }
        } else {
            result.push(s.as_bytes()[i] as char);
            i += 1;
        }
    }
    result
}

pub fn find_vpcf_files(folder: &str) -> Vec<String> {
    WalkDir::new(folder)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().map_or(false, |ext| ext.eq_ignore_ascii_case("vpcf")))
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

pub fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

pub fn write_file(path: &str, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

pub fn backup_file(path: &str) -> Result<(), String> {
    let p      = Path::new(path);
    let dir    = p.parent().ok_or_else(|| "No parent dir".to_string())?;
    let fname  = p.file_name().ok_or_else(|| "No filename".to_string())?;
    let bak_dir = dir.join("backup");
    fs::create_dir_all(&bak_dir).map_err(|e| e.to_string())?;
    let bak_path = bak_dir.join(format!("{}.bak", fname.to_string_lossy()));
    if !bak_path.exists() {
        fs::copy(path, &bak_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_file_mtime(path: &str) -> u64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0))
        .unwrap_or(0)
}

pub fn parse_color_fields(content: &str, filename: &str) -> Vec<ColorField> {
    let mut fields: Vec<ColorField> = Vec::new();
    let mut gradient_block_counter: i32 = 0;

    for g_match in GRADIENT_RE.find_iter(content) {
        gradient_block_counter += 1;
        let gradient_text = &content[g_match.start()..g_match.end()];
        if let Some(captures) = GRADIENT_RE.captures(gradient_text) {
            let stops_body = captures.get(2).map_or("", |m| m.as_str());
            let mut stop_idx: i32 = 0;
            for s_cap in STOP_RE.captures_iter(stops_body) {
                let full_stop  = s_cap.get(1).map_or("", |m| m.as_str()).to_string();
                let stop_pos   = s_cap.get(2).map_or("", |m| m.as_str()).to_string();
                let color_nums = s_cap.get(3).map_or("", |m| m.as_str()).to_string();

                let rgb = parse_color_string_nums(&color_nums);
                if rgb.iter().any(|&v| v != 0) {
                    fields.push(ColorField {
                        field_type:          "gradient".to_string(),
                        value:               color_nums,
                        full_match:          full_stop,
                        prefix:              String::new(),
                        field_name:          format!("Gradient {} Stop {}", gradient_block_counter, stop_idx + 1),
                        raw_name:            String::new(),
                        filename:            filename.to_string(),
                        gradient_block_index: gradient_block_counter,
                        stop_index:          stop_idx,
                        stop_position:       stop_pos,
                    });
                }
                stop_idx += 1;
            }
        }
    }

    let mut name_counter: HashMap<String, u32> = HashMap::new();

    for cap in COLOR_FIELD_RE.captures_iter(content) {
        let prefix     = cap.get(1).map_or("", |m| m.as_str()).to_string();
        let raw_name   = cap.get(2).map_or("", |m| m.as_str()).to_string();
        let color_val  = cap.get(3).map_or("", |m| m.as_str()).to_string();
        let full_match = cap.get(0).map_or("", |m| m.as_str()).to_string();

        // parse RGB from inside the brackets to check for all-zero
        let rgb = parse_color_string(&color_val);
        if rgb.len() >= 3 && rgb[0] == 0 && rgb[1] == 0 && rgb[2] == 0 {
            continue;
        }

        let display_name = FIELD_DISPLAY_NAMES
            .get(raw_name.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                raw_name.replace("m_", "").replace('_', " ")
                    .split_whitespace()
                    .map(|w| {
                        let mut c = w.chars();
                        match c.next() {
                            None    => String::new(),
                            Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ")
            });

        let count = name_counter.entry(raw_name.clone()).or_insert(0);
        *count += 1;

        fields.push(ColorField {
            field_type:          "color".to_string(),
            value:               color_val,
            full_match,
            prefix,
            field_name:          format!("{} {}", display_name, count),
            raw_name,
            filename:            filename.to_string(),
            gradient_block_index: -1,
            stop_index:          -1,
            stop_position:       String::new(),
        });
    }

    fields
}

/// Parse comma/whitespace-separated numbers (no brackets expected).
fn parse_color_string_nums(s: &str) -> Vec<u8> {
    s.split(|c: char| c == ',' || c.is_whitespace())
        .filter(|p| !p.is_empty())
        .take(4)
        .filter_map(|p| p.trim().parse::<f32>().ok())
        .map(|v| v.clamp(0.0, 255.0) as u8)
        .collect()
}

pub fn apply_color_changes_to_content(
    content: &str,
    fields:  &[ColorField],
    changes: &HashMap<usize, Vec<u8>>,
) -> String {
    let mut new_content = content.to_string();

    // Apply plain color-field changes
    for (&field_idx, new_rgb) in changes.iter() {
        let field = &fields[field_idx];
        if field.field_type != "color" { continue; }

        // Replace only the numeric values INSIDE the existing bracket string
        let new_value  = replace_numbers_in_value(&field.value, new_rgb);
        // The search string is exactly what appeared in the file
        let search_str  = format!("{}{}", field.prefix, field.value);
        let replacement = format!("{}{}", field.prefix, new_value);

        if let Some(pos) = new_content.find(&search_str) {
            new_content = format!(
                "{}{}{}",
                &new_content[..pos],
                replacement,
                &new_content[pos + search_str.len()..]
            );
        }
    }

    // Apply gradient-stop changes
    let gradient_changes: HashMap<(i32, i32), &Vec<u8>> = changes.iter()
        .filter_map(|(&idx, rgb)| {
            let f = &fields[idx];
            if f.field_type == "gradient" {
                Some(((f.gradient_block_index, f.stop_index), rgb))
            } else {
                None
            }
        })
        .collect();

    if !gradient_changes.is_empty() {
        let mut block_counter = 0i32;
        let mut result        = String::new();
        let mut last_end      = 0;
        let content_snap      = new_content.clone();

        for g_cap in GRADIENT_RE.captures_iter(&content_snap) {
            block_counter += 1;
            let full_match = g_cap.get(0).unwrap();
            result.push_str(&content_snap[last_end..full_match.start()]);

            let prefix     = g_cap.get(1).map_or("", |m| m.as_str());
            let stops_body = g_cap.get(2).map_or("", |m| m.as_str());
            let suffix     = g_cap.get(3).map_or("", |m| m.as_str());

            let mut stop_idx  = 0i32;
            let mut new_stops = stops_body.to_string();
            let stops_snap    = stops_body.to_string();

            for s_cap in STOP_RE.captures_iter(&stops_snap) {
                let key = (block_counter, stop_idx);
                if let Some(new_rgb) = gradient_changes.get(&key) {
                    let old_nums = s_cap.get(3).map_or("", |m| m.as_str());
                    let new_nums = replace_numbers_in_value(old_nums, new_rgb);
                    new_stops = new_stops.replacen(old_nums, &new_nums, 1);
                }
                stop_idx += 1;
            }

            result.push_str(prefix);
            result.push_str(&new_stops);
            result.push_str(suffix);
            last_end = full_match.end();
        }
        result.push_str(&content_snap[last_end..]);
        new_content = result;
    }

    new_content
}

pub fn compute_shared_colors(all_fields: &[ColorField], threshold: f64) -> Vec<SharedColorGroup> {
    struct GroupBuilder {
        representative: Vec<u8>,
        hex:            String,
        field_names:    HashSet<String>,
        files:          HashSet<String>,
        total:          usize,
    }

    let mut groups: Vec<GroupBuilder> = Vec::new();

    for field in all_fields {
        let rgb = parse_color_string(&field.value);
        if rgb.len() < 3 { continue; }
        // Skip pure black (all zeros)
        if rgb[0] == 0 && rgb[1] == 0 && rgb[2] == 0 { continue; }

        let field_key = if field.raw_name.is_empty() {
            field.field_type.clone()
        } else {
            field.raw_name.clone()
        };

        let closest_idx = groups.iter().enumerate().min_by(|(_, a), (_, b)| {
            let da = color_distance(&rgb, &a.representative);
            let db = color_distance(&rgb, &b.representative);
            da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
        });

        let added = if let Some((idx, grp)) = closest_idx {
            if color_distance(&rgb, &grp.representative) <= threshold {
                groups[idx].field_names.insert(field_key.clone());
                groups[idx].files.insert(field.filename.clone());
                groups[idx].total += 1;
                true
            } else {
                false
            }
        } else {
            false
        };

        if !added {
            let mut g = GroupBuilder {
                representative: rgb.clone(),
                hex:            rgb_to_hex(&rgb),
                field_names:    HashSet::new(),
                files:          HashSet::new(),
                total:          0,
            };
            g.field_names.insert(field_key);
            g.files.insert(field.filename.clone());
            g.total = 1;
            groups.push(g);
        }
    }

    let mut result: Vec<SharedColorGroup> = groups.into_iter().map(|g| {
        let count = g.files.len();
        let mut field_names: Vec<String> = g.field_names.into_iter().collect();
        field_names.sort();
        let mut files: Vec<String> = g.files.into_iter().collect();
        files.sort();
        SharedColorGroup {
            hex:                g.hex.clone(),
            rgb:                g.representative.clone(),
            representative_rgb: g.representative,
            field_names,
            files,
            count,
            total: g.total,
        }
    }).collect();

    result.sort_by(|a, b| b.total.cmp(&a.total));
    result
}

pub fn apply_shared_color_to_files(
    old_rgb: &[u8],
    new_rgb: &[u8],
    threshold: f64,
    files: &mut HashMap<String, FileData>,
) -> Result<Vec<SavedFileResult>, String> {
    let mut modified: Vec<SavedFileResult> = Vec::new();
    let filenames: Vec<String> = files.keys().cloned().collect();

    for filename in filenames {
        let file_data = files.get(&filename).unwrap();
        let matching: Vec<(usize, ColorField)> = file_data.fields.iter().enumerate()
            .filter(|(_, f)| {
                let rgb = parse_color_string(&f.value);
                color_distance(&rgb, old_rgb) <= threshold
            })
            .map(|(i, f)| (i, f.clone()))
            .collect();

        if matching.is_empty() { continue; }

        let changes: HashMap<usize, Vec<u8>> = matching.iter()
            .map(|(idx, _)| (*idx, new_rgb.to_vec()))
            .collect();

        let new_content = apply_color_changes_to_content(&file_data.content, &file_data.fields, &changes);
        let abs_path    = file_data.abs_path.clone();

        backup_file(&abs_path)?;
        write_file(&abs_path, &new_content)?;

        let new_fields = parse_color_fields(&new_content, &filename);
        let mtime      = get_file_mtime(&abs_path);

        if let Some(fd) = files.get_mut(&filename) {
            fd.content = new_content;
            fd.fields  = new_fields.clone();
            fd.mtime   = mtime;
        }

        modified.push(SavedFileResult { filename, fields: new_fields });
    }

    Ok(modified)
}
