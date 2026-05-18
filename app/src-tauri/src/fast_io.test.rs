use super::*;
use crate::types::Location;

fn sample_loc() -> Location {
    Location {
        id: 42,
        lat: 48.8566,
        lng: 2.3522,
        heading: 90.0,
        pitch: 5.0,
        zoom: 1.5,
        pano_id: Some("CAoSLEF".into()),
        flags: 1,
        tags: vec![1, 2, 3],
        extra: Some(serde_json::from_str(r#"{"country":"FR"}"#).unwrap()),
        created_at: "2024-01-15T10:30:00Z".into(),
        modified_at: Some("2024-01-15T11:00:00Z".into()),
    }
}

#[test]
fn location_data_serde_round_trip() {
    let loc = sample_loc();
    let json = serde_json::to_string(&loc).unwrap();
    let restored: Location = serde_json::from_str(&json).unwrap();
    assert_eq!(loc, restored);
}

#[test]
fn location_data_null_optionals() {
    let loc = Location {
        id: 1, lat: 0.0, lng: 0.0, heading: 0.0, pitch: 0.0, zoom: 0.0,
        pano_id: None, flags: 0, tags: vec![], extra: None,
        created_at: String::new(), modified_at: None,
    };
    let json = serde_json::to_string(&loc).unwrap();
    assert!(!json.contains("extra"));
    assert!(!json.contains("modifiedAt"));
    let restored: Location = serde_json::from_str(&json).unwrap();
    assert_eq!(loc, restored);
}

#[test]
fn location_data_id_defaults_to_zero() {
    let json = r#"{"lat":0,"lng":0,"heading":0,"pitch":0,"zoom":0,"panoId":null,"flags":0,"tags":[],"createdAt":""}"#;
    let loc: Location = serde_json::from_str(json).unwrap();
    assert_eq!(loc.id, 0);
}

#[test]
fn sha256_hex_deterministic() {
    let a = sha256_hex(b"hello");
    let b = sha256_hex(b"hello");
    assert_eq!(a, b);
}

#[test]
fn sha256_hex_length() {
    let h = sha256_hex(b"test");
    assert_eq!(h.len(), 64);
}

#[test]
fn sha256_hex_known_value() {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    let h = sha256_hex(b"");
    assert_eq!(h, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
}

#[test]
fn sha256_hex_differs_for_different_input() {
    assert_ne!(sha256_hex(b"hello"), sha256_hex(b"world"));
}
