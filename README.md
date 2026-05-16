# Tracking Video App

Dự án phát triển ứng dụng xử lý video (Lock-on Tracking + Speed Ramp) đa nền tảng.

## Cấu trúc thư mục (Monorepo)
*   **`core/`**: Chứa Core Engine xử lý Video bằng C++ và OpenCV. (Biên dịch ra thư viện động).
*   **`desktop/`**: Ứng dụng giao diện dành cho máy tính (Tauri/Electron).
*   **`mobile/`**: Ứng dụng giao diện dành cho di động (React Native/Flutter).
