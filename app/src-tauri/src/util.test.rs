use super::*;

#[test]
fn hsl_pure_red() {
    let (r, g, b) = hsl_to_rgb(0.0, 1.0, 0.5);
    assert_eq!(r, 255);
    assert_eq!(g, 0);
    assert_eq!(b, 0);
}

#[test]
fn hsl_pure_green() {
    let (r, g, b) = hsl_to_rgb(120.0, 1.0, 0.5);
    assert_eq!(r, 0);
    assert_eq!(g, 255);
    assert_eq!(b, 0);
}

#[test]
fn hsl_pure_blue() {
    let (r, g, b) = hsl_to_rgb(240.0, 1.0, 0.5);
    assert_eq!(r, 0);
    assert_eq!(g, 0);
    assert_eq!(b, 255);
}

#[test]
fn hsl_white() {
    let (r, g, b) = hsl_to_rgb(0.0, 0.0, 1.0);
    assert_eq!((r, g, b), (255, 255, 255));
}

#[test]
fn hsl_black() {
    let (r, g, b) = hsl_to_rgb(0.0, 0.0, 0.0);
    assert_eq!((r, g, b), (0, 0, 0));
}

#[test]
fn hsl_mid_gray() {
    let (r, g, b) = hsl_to_rgb(0.0, 0.0, 0.5);
    assert_eq!(r, g);
    assert_eq!(g, b);
    assert_eq!(r, 128);
}

#[test]
fn color_for_name_returns_hex() {
    let c = color_for_name("test");
    assert!(c.starts_with('#'));
    assert_eq!(c.len(), 7);
}

#[test]
fn color_for_name_deterministic() {
    assert_eq!(color_for_name("hello"), color_for_name("hello"));
}

#[test]
fn color_for_name_varies() {
    assert_ne!(color_for_name("alpha"), color_for_name("beta"));
}
