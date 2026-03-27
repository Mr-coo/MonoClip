#[derive(serde::Deserialize)]
pub struct MediaAsset {
    pub id: String,
    pub asset_type: String,
    pub layer: i32,
    pub path: String,
    pub name: String,
    pub start_time: f64,
    pub end_time: f64,
    pub start_in_time_line: f64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64
}
