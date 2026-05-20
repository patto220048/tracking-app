use libloading::{Library, Symbol};
use std::ffi::CString;
use std::os::raw::c_char;

#[repr(C)]
#[derive(Debug, Clone, Copy, serde::Serialize)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

pub struct TrackingBridge {
    lib: Library,
    _dep_libs: Vec<Library>,
    tracker_ptr: *mut std::ffi::c_void,
}

// Cho phép Tauri truyền state qua các theard an toàn
unsafe impl Send for TrackingBridge {}
unsafe impl Sync for TrackingBridge {}

impl TrackingBridge {
    pub fn new(dll_path: &str, backbone_path: &str, head_path: &str) -> Result<Self, String> {
        unsafe {
            // Load OpenCV DLL trước tiên trên Windows để giải quyết vấn đề phụ thuộc (dependencies) của tracking_core.dll
            let mut dep_libs = Vec::new();
            #[cfg(target_os = "windows")]
            {
                let opencv_path = "C:/opencv/build/x64/vc16/bin/opencv_world4100.dll";
                if std::path::Path::new(opencv_path).exists() {
                    match Library::new(opencv_path) {
                        Ok(dep) => {
                            dep_libs.push(dep);
                            println!("Loaded dependency OpenCV DLL: {}", opencv_path);
                        }
                        Err(e) => {
                            println!("Warning: Failed to load OpenCV dependency DLL: {}", e);
                        }
                    }
                } else {
                    println!("Warning: OpenCV dependency DLL not found at: {}", opencv_path);
                }
            }

            let lib = Library::new(dll_path).map_err(|e| format!("Lỗi load DLL: {}", e))?;
            
            let create_tracker: Symbol<unsafe extern "C" fn(*const c_char, *const c_char) -> *mut std::ffi::c_void> = 
                lib.get(b"create_tracker").map_err(|e| format!("Lỗi tìm hàm create_tracker: {}", e))?;
            
            let c_backbone = CString::new(backbone_path).unwrap();
            let c_head = CString::new(head_path).unwrap();
            
            let tracker_ptr = create_tracker(c_backbone.as_ptr(), c_head.as_ptr());
            
            Ok(TrackingBridge { lib, _dep_libs: dep_libs, tracker_ptr })
        }
    }

    pub fn init_tracker(&self, frame_data: &[u8], width: i32, height: i32, x: i32, y: i32, w: i32, h: i32) -> Result<(), String> {
        unsafe {
            let init_func: Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, *const u8, i32, i32, i32, i32, i32, i32)> = 
                self.lib.get(b"init_tracker").map_err(|e| format!("Lỗi tìm hàm init_tracker: {}", e))?;
                
            init_func(self.tracker_ptr, frame_data.as_ptr(), width, height, x, y, w, h);
            Ok(())
        }
    }

    pub fn update_tracker(&self, frame_data: &[u8], width: i32, height: i32) -> Result<Point, String> {
        unsafe {
            let update_func: Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, *const u8, i32, i32) -> Point> = 
                self.lib.get(b"update_tracker").map_err(|e| format!("Lỗi tìm hàm update_tracker: {}", e))?;
                
            let point = update_func(self.tracker_ptr, frame_data.as_ptr(), width, height);
            Ok(point)
        }
    }
}

impl Drop for TrackingBridge {
    fn drop(&mut self) {
        unsafe {
            if let Ok(destroy_tracker) = self.lib.get::<unsafe extern "C" fn(*mut std::ffi::c_void)>(b"destroy_tracker") {
                destroy_tracker(self.tracker_ptr);
            }
        }
    }
}
