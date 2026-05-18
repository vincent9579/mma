#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct Tag {
    pub id: u32,
    pub name: String,
    pub color: String,
    #[serde(default = "default_visible")]
    pub visible: bool,
    #[serde(default)]
    pub order: Option<u32>,
}

fn default_visible() -> bool {
    true
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    #[serde(default)]
    pub id: u32,
    pub lat: f64,
    pub lng: f64,
    pub heading: f64,
    pub pitch: f64,
    pub zoom: f64,
    pub pano_id: Option<String>,
    pub flags: u32,
    pub tags: Vec<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra: Option<serde_json::Map<String, serde_json::Value>>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<String>,
}
