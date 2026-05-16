use std::sync::Mutex;
use tauri::State;

mod tracking_bridge;
use tracking_bridge::TrackingBridge;

struct AppState {
    tracker: Mutex<Option<TrackingBridge>>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            tracker: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![init_ai_engine])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
