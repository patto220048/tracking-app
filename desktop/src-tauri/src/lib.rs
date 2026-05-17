use std::sync::Mutex;
use std::path::Path;
use tauri::State;

mod tracking_bridge;
use tracking_bridge::TrackingBridge;

struct AppState {
    tracker: Mutex<Option<TrackingBridge>>,
}

#[derive(serde::Serialize)]
struct VideoMetadata {
    file_name: String,
    file_size_mb: f64,
    file_path: String,
}

#[tauri::command]
fn init_ai_engine(state: State<'_, AppState>) -> Result<String, String> {
    // Đường dẫn tương đối từ thư mục desktop/src-tauri/
    let dll_path = "../../core/build/Release/tracking_core.dll";
    let backbone = "../../scripts/models/nanotrack_backbone_sim.onnx";
    let head = "../../scripts/models/nanotrack_head_sim.onnx";
    
    match TrackingBridge::new(dll_path, backbone, head) {
        Ok(bridge) => {
            let mut tracker = state.tracker.lock().unwrap();
            *tracker = Some(bridge);
            Ok("Khởi tạo AI NanoTrack (C++) thành công!".to_string())
        },
        Err(e) => Err(format!("Lỗi: {}", e)),
    }
}

#[tauri::command]
fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    let file_path = Path::new(&path);
    
    if !file_path.exists() {
        return Err(format!("File không tồn tại: {}", path));
    }

    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Không thể đọc metadata: {}", e))?;

    let file_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let file_size_mb = metadata.len() as f64 / (1024.0 * 1024.0);

    Ok(VideoMetadata {
        file_name,
        file_size_mb: (file_size_mb * 100.0).round() / 100.0,
        file_path: path,
    })
}

// Convert RGBA to RGB for OpenCV
fn rgba_to_rgb(rgba: &[u8]) -> Vec<u8> {
    let mut rgb = Vec::with_capacity((rgba.len() / 4) * 3);
    for chunk in rgba.chunks_exact(4) {
        rgb.push(chunk[0]);
        rgb.push(chunk[1]);
        rgb.push(chunk[2]);
    }
    rgb
}

#[tauri::command]
fn start_tracking(
    state: State<'_, AppState>,
    frame_data: Vec<u8>,
    width: i32,
    height: i32,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
) -> Result<(), String> {
    let rgb_data = rgba_to_rgb(&frame_data);
    let tracker_lock = state.tracker.lock().unwrap();
    if let Some(tracker) = tracker_lock.as_ref() {
        tracker.init_tracker(&rgb_data, width, height, x, y, w, h)?;
        Ok(())
    } else {
        Err("AI Engine chưa được khởi tạo. Vui lòng bấm Init AI Engine trước.".to_string())
    }
}

#[tauri::command]
fn process_frame(
    state: State<'_, AppState>,
    frame_data: Vec<u8>,
    width: i32,
    height: i32,
) -> Result<tracking_bridge::Point, String> {
    let rgb_data = rgba_to_rgb(&frame_data);
    let tracker_lock = state.tracker.lock().unwrap();
    if let Some(tracker) = tracker_lock.as_ref() {
        tracker.update_tracker(&rgb_data, width, height)
    } else {
        Err("AI Engine chưa được khởi tạo.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            tracker: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            init_ai_engine, 
            get_video_metadata,
            start_tracking,
            process_frame
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
