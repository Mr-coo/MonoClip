#[derive(serde::Deserialize, Debug, Clone)]
pub struct MediaAsset {
    pub id: String,
    #[serde(rename = "type")]
    pub asset_type: String,
    pub layer: i32,
    pub path: String,
    pub name: String,
    #[serde(rename = "startTime")]
    pub start_time: f64,
    #[serde(rename = "endTime")]
    pub end_time: f64,
    #[serde(rename = "startInTimeLine")]
    pub start_in_time_line: f64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64
}
