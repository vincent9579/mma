use super::*;

#[test]
fn hex_to_rgb_with_hash() {
    assert_eq!(hex_to_rgb("#ff8800"), Some([255, 136, 0]));
}

#[test]
fn hex_to_rgb_without_hash() {
    assert_eq!(hex_to_rgb("00ff00"), Some([0, 255, 0]));
}

#[test]
fn hex_to_rgb_black() {
    assert_eq!(hex_to_rgb("#000000"), Some([0, 0, 0]));
}

#[test]
fn hex_to_rgb_white() {
    assert_eq!(hex_to_rgb("#ffffff"), Some([255, 255, 255]));
}

#[test]
fn hex_to_rgb_invalid_length() {
    assert_eq!(hex_to_rgb("#fff"), None);
    assert_eq!(hex_to_rgb(""), None);
}

#[test]
fn hex_to_rgb_invalid_chars() {
    assert_eq!(hex_to_rgb("#gggggg"), None);
}

#[test]
fn tag_meta_roundtrips_color_and_order() {
    let (tag_defs, _) = parse_tag_defs(
        r##"{"1": {"name": "red", "color": "#ff0000", "order": 3}, "2": {"name": "blue", "color": "#0000ff"}}"##,
    );
    let meta = tag_color_meta(&tag_defs);
    assert_eq!(meta["red"]["color"], serde_json::json!([255, 0, 0]));
    assert_eq!(meta["red"]["order"], serde_json::json!(3));
    assert_eq!(meta["blue"]["color"], serde_json::json!([0, 0, 255]));
    assert!(meta["blue"].get("order").is_none());
}
