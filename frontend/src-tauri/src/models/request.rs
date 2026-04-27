// Only the fields used in export are mapped; unknown fields (gradient, letterSpacing, etc.)
// are silently ignored by serde's default behaviour.
#[derive(serde::Deserialize, Debug, Clone)]
pub struct TextStyle {
    #[serde(default)]
    pub content: String,
    #[serde(rename = "fontFamily", default = "ts_font_family")]
    pub font_family: String,
    #[serde(rename = "fontSize", default = "ts_font_size")]
    pub font_size: f64,
    #[serde(default = "ts_color")]
    pub color: String,
    #[serde(default = "ts_opacity")]
    pub opacity: f64,
    #[serde(rename = "strokeColor", default = "ts_black")]
    pub stroke_color: String,
    #[serde(rename = "strokeWidth", default)]
    pub stroke_width: f64,
    #[serde(rename = "shadowOffsetX", default)]
    pub shadow_offset_x: f64,
    #[serde(rename = "shadowOffsetY", default)]
    pub shadow_offset_y: f64,
    #[serde(rename = "shadowColor", default = "ts_black")]
    pub shadow_color: String,
    #[serde(rename = "shadowOpacity", default)]
    pub shadow_opacity: f64,
    #[serde(rename = "bgColor", default = "ts_black")]
    pub bg_color: String,
    #[serde(rename = "bgOpacity", default)]
    pub bg_opacity: f64,
    #[serde(rename = "bgPadding", default = "ts_bg_padding")]
    pub bg_padding: f64,
    #[serde(rename = "textAlign", default = "ts_text_align")]
    pub text_align: String,
}

fn ts_font_family() -> String { "Arial".into() }
fn ts_font_size()   -> f64    { 48.0 }
fn ts_color()       -> String { "#ffffff".into() }
fn ts_opacity()     -> f64    { 1.0 }
fn ts_black()       -> String { "#000000".into() }
fn ts_bg_padding()  -> f64    { 16.0 }
fn ts_text_align()  -> String { "left".into() }

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
    pub height: f64,
    #[serde(rename = "textStyle", default)]
    pub text_style: Option<TextStyle>,
}