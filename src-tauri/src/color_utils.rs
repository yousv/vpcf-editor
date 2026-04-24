pub fn parse_color_string(raw_value: &str) -> Vec<u8> {
    raw_value
        .trim()
        .trim_matches(|c| c == '[' || c == ']')
        .split(|c: char| !c.is_ascii_digit() && c != '.')
        .filter(|part| !part.is_empty())
        .filter_map(|part| part.parse::<f64>().ok())
        .take(4)
        .map(|v| v.clamp(0.0, 255.0) as u8)
        .collect()
}

pub fn color_list_to_string(rgb_channels: &[u8]) -> String {
    let channel_strings: Vec<String> = rgb_channels.iter().map(|v| v.to_string()).collect();
    format!("[ {} ]", channel_strings.join(", "))
}

pub fn rgb_to_hex(rgb_channels: &[u8]) -> String {
    if rgb_channels.len() >= 3 {
        format!("#{:02x}{:02x}{:02x}", rgb_channels[0], rgb_channels[1], rgb_channels[2])
    } else {
        "#000000".to_string()
    }
}

pub fn color_distance(color_a: &[u8], color_b: &[u8]) -> f64 {
    if color_a.len() < 3 || color_b.len() < 3 {
        return f64::MAX;
    }
    let delta_r = color_a[0] as f64 - color_b[0] as f64;
    let delta_g = color_a[1] as f64 - color_b[1] as f64;
    let delta_b = color_a[2] as f64 - color_b[2] as f64;
    (delta_r * delta_r + delta_g * delta_g + delta_b * delta_b).sqrt()
}
