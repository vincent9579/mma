pub fn hsl_to_rgb(h: f64, s: f64, l: f64) -> (u8, u8, u8) {
    let a = s * l.min(1.0 - l);
    let f = |n: f64| -> u8 {
        let k = (n + h / 30.0) % 12.0;
        (255.0 * (l - a * (k - 3.0).min(9.0 - k).min(1.0).max(-1.0))).round() as u8
    };
    (f(0.0), f(8.0), f(4.0))
}

pub fn color_for_name(name: &str) -> String {
    let mut h: i32 = 0;
    for b in name.bytes() {
        h = h.wrapping_add((b as i32).wrapping_add(h << 5));
    }
    h = h.wrapping_mul(214013).wrapping_add(2531011);
    let hue = (h.abs() % 360) as f64;
    let (r, g, b) = hsl_to_rgb(hue, 0.5, 0.5);
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

#[cfg(test)]
#[path = "util.test.rs"]
mod tests;
