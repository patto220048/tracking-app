# 🎯 Tracking Video App

Dự án phát triển ứng dụng xử lý video **Lock-on Tracking + Speed Ramp** đa nền tảng, sử dụng AI NanoTrack để theo dõi đối tượng trong video với hiệu suất cao.

---

## 📁 Cấu trúc thư mục (Monorepo)

```
tracking-video-app/
├── core/                # Core Engine C++ (OpenCV + NanoTrack AI) → Build ra DLL
│   ├── CMakeLists.txt   # CMake build config
│   └── src/
│       ├── Tracker.cpp  # Logic xử lý tracking (C-ABI export)
│       └── Tracker.h    # Header định nghĩa API
├── desktop/             # Ứng dụng Desktop (Tauri v2 + React + Vite)
│   ├── src/             # Frontend React (TypeScript)
│   ├── src-tauri/       # Backend Rust (Tauri)
│   │   └── src/
│   │       ├── lib.rs              # Entry point Tauri
│   │       └── tracking_bridge.rs  # FFI bridge gọi DLL từ core/
│   ├── package.json
│   └── vite.config.ts
├── mobile/              # (Đang phát triển) Ứng dụng di động
├── scripts/             # Prototype Python + AI Models
│   ├── nanotrack_prototype.py   # Script demo NanoTrack bằng Python
│   ├── lockon_prototype.py      # Script demo Lock-on effect
│   └── models/                  # Thư mục chứa file ONNX model (không push lên Git)
│       ├── nanotrack_backbone_sim.onnx
│       └── nanotrack_head_sim.onnx
└── DESIGN.md            # Design System (Linear Aesthetic)
```

---

## ⚙️ Yêu cầu hệ thống (Prerequisites)

### Bắt buộc

| Công cụ          | Phiên bản tối thiểu | Ghi chú                                                  |
| ---------------- | -------------------- | --------------------------------------------------------- |
| **Node.js**      | v18+                 | Runtime cho React/Vite frontend                           |
| **npm**          | v9+                  | Đi kèm Node.js                                           |
| **Rust**         | v1.70+               | Backend Tauri. Cài qua [rustup.rs](https://rustup.rs)    |
| **CMake**        | v3.10+               | Build hệ thống cho Core C++                               |
| **OpenCV**       | v4.7.0+ (khuyến nghị 4.10) | Thư viện Computer Vision, cần có module `TrackerNano` |
| **Visual Studio**| 2022 hoặc mới hơn    | C++ Build Tools (MSVC compiler)                           |

### Tùy chọn (Để chạy Prototype Python)

| Công cụ        | Phiên bản | Ghi chú                      |
| -------------- | --------- | ----------------------------- |
| **Python**     | 3.8+      | Chạy scripts prototype       |
| **opencv-python** | 4.7+  | `pip install opencv-python`   |
| **numpy**      | latest    | `pip install numpy`           |

---

## 🚀 Hướng dẫn cài đặt & khởi động

### Bước 0: Clone dự án

```bash
git clone <repository-url>
cd tracking-video-app
```

---

### Bước 1: Cài đặt OpenCV (C++) trên Windows

> [!IMPORTANT]
> Core Engine yêu cầu OpenCV được cài tại `C:/opencv/`. Nếu bạn cài ở đường dẫn khác, hãy sửa lại trong `core/CMakeLists.txt`.

1. Tải OpenCV pre-built từ [opencv.org/releases](https://opencv.org/releases/)
2. Giải nén vào `C:\opencv\` sao cho cấu trúc thư mục là:
   ```
   C:\opencv\
   └── build\
       ├── include\          # Header files
       └── x64\vc16\lib\     # opencv_world4100.lib
   ```
3. Thêm `C:\opencv\build\x64\vc16\bin` vào biến môi trường **PATH** (để hệ thống tìm được `opencv_world4100.dll` khi chạy)

---

### Bước 2: Build Core Engine (C++ → DLL)

```powershell
# Từ thư mục gốc của dự án
cd core

# Tạo thư mục build
mkdir build
cd build

# Generate project bằng CMake (dùng Visual Studio generator)
cmake .. -G "Visual Studio 17 2022" -A x64

# Build ở chế độ Release
cmake --build . --config Release
```

Sau khi build thành công, file DLL sẽ nằm tại:
```
core/build/Release/tracking_core.dll
```

> [!NOTE]
> File `tracking_core.dll` này sẽ được Tauri backend (Rust) load động thông qua crate `libloading` khi khởi động ứng dụng.

---

### Bước 3: Tải AI Models (NanoTrack ONNX)

Models **không được push lên Git** (do file `.gitignore`). Bạn cần tải thủ công hoặc chạy script tự động:

#### Cách 1: Chạy script Python (tự động tải)

```powershell
cd scripts
python nanotrack_prototype.py
# Script sẽ tự tải 2 file ONNX vào thư mục scripts/models/
# Nhấn Ctrl+C sau khi thấy "Tải xong!" nếu chỉ muốn tải model
```

#### Cách 2: Tải thủ công

Tải 2 file sau và đặt vào `scripts/models/`:

- [`nanotrack_backbone_sim.onnx`](https://raw.githubusercontent.com/HonglinChu/SiamTrackers/master/NanoTrack/models/nanotrackv2/nanotrack_backbone_sim.onnx) (~1 MB)
- [`nanotrack_head_sim.onnx`](https://raw.githubusercontent.com/HonglinChu/SiamTrackers/master/NanoTrack/models/nanotrackv2/nanotrack_head_sim.onnx) (~0.7 MB)

---

### Bước 4: Cài đặt & chạy Desktop App (Tauri + React)

```powershell
# Từ thư mục gốc, di chuyển vào desktop/
cd desktop

# Cài đặt dependencies Node.js
npm install

# Chạy ứng dụng ở chế độ Development
npm run tauri dev
```

> [!WARNING]
> Trước khi chạy `tauri dev`, hãy đảm bảo:
> 1. ✅ Đã build xong `tracking_core.dll` (Bước 2)
> 2. ✅ Đã tải file ONNX models (Bước 3)
> 3. ✅ Đã cài Rust toolchain (`rustup` + `cargo`)

Lần chạy đầu tiên sẽ mất thời gian vì Cargo cần biên dịch toàn bộ dependencies Rust.

---

## 🧪 Chạy Prototype (Python — không cần Tauri)

Nếu bạn chỉ muốn test nhanh thuật toán tracking mà không cần build toàn bộ app:

```powershell
# Cài đặt thư viện Python
pip install opencv-python numpy

# Đặt một file video test vào scripts/ với tên input.mp4
# Sau đó chạy:
cd scripts
python nanotrack_prototype.py
```

- Chọn vùng đối tượng cần track bằng chuột khi cửa sổ hiện lên
- Nhấn **Enter** để bắt đầu tracking, **Q** để dừng

---

## 🔧 Các lệnh thường dùng

### Desktop App

| Lệnh                        | Mô tả                                     |
| ---------------------------- | ------------------------------------------ |
| `npm run dev`                | Chạy Vite dev server (chỉ frontend)        |
| `npm run tauri dev`          | Chạy toàn bộ Tauri app (frontend + Rust)   |
| `npm run build`              | Build production frontend                  |
| `npm run tauri build`        | Build bản cài đặt (installer) cho Desktop  |

### Core Engine

| Lệnh                                     | Mô tả                              |
| ----------------------------------------- | ----------------------------------- |
| `cmake .. -G "Visual Studio 17 2022" -A x64` | Generate project CMake          |
| `cmake --build . --config Release`        | Build DLL ở chế độ Release          |
| `cmake --build . --config Debug`          | Build DLL ở chế độ Debug            |

---

## 🏗️ Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────┐
│                   Desktop App                        │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │   React + Vite   │◄──►│   Tauri (Rust)         │ │
│  │   (Frontend UI)  │IPC │   ├── lib.rs           │ │
│  │   - Timeline     │    │   └── tracking_bridge  │ │
│  │   - Video Player │    │       (FFI / libloading)│ │
│  │   - Controls     │    └───────────┬────────────┘ │
│  └──────────────────┘                │ DLL Load     │
│                                      ▼              │
│                          ┌───────────────────────┐  │
│                          │  Core Engine (C++)     │  │
│                          │  tracking_core.dll     │  │
│                          │  ├── TrackerNano       │  │
│                          │  └── OpenCV + ONNX     │  │
│                          └───────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Luồng dữ liệu:**
1. **React** gửi lệnh (init, track frame) qua Tauri IPC → **Rust backend**
2. **Rust** gọi C-ABI functions từ `tracking_core.dll` qua `libloading` (FFI)
3. **C++ Core** xử lý bằng OpenCV TrackerNano AI → trả về tọa độ tracking
4. Kết quả trả ngược lên **React** để render lên giao diện

---

## 📝 Quy tắc phát triển

### Code Style
- **Frontend**: TypeScript + React, sử dụng CSS thuần (không Tailwind). Đọc `DESIGN.md` trước khi làm UI.
- **Backend Rust**: Theo Rust conventions, dùng `cargo fmt` và `cargo clippy`.
- **Core C++**: C++17, export C-ABI cho FFI. Tránh dùng STL trong API public.

### Git Workflow
- Không push file binary lên Git (`.dll`, `.onnx`, `.mp4`, v.v. — đã có `.gitignore`)
- Viết commit message bằng tiếng Việt hoặc tiếng Anh đều được, miễn là rõ ràng
- Tạo branch riêng cho mỗi feature / fix

### Design System
- Đọc kỹ file [`DESIGN.md`](./DESIGN.md) trước khi chỉnh sửa UI
- Dark mode only, lấy cảm hứng từ Linear.app
- Sử dụng grid system 4px/8px, không dùng padding quá lớn

---

## ❓ Xử lý lỗi thường gặp

<details>
<summary><strong>❌ CMake không tìm thấy OpenCV</strong></summary>

Kiểm tra đường dẫn trong `core/CMakeLists.txt`:
```cmake
set(OpenCV_INCLUDE_DIRS "C:/opencv/build/include")
target_link_libraries(tracking_core "C:/opencv/build/x64/vc16/lib/opencv_world4100.lib")
```
Đảm bảo đường dẫn khớp với nơi bạn cài OpenCV. Nếu dùng OpenCV phiên bản khác (ví dụ 4.9.0), đổi `opencv_world4100.lib` thành `opencv_world490.lib`.

</details>

<details>
<summary><strong>❌ Lỗi "DLL not found" khi chạy Tauri</strong></summary>

1. Đảm bảo đã build Core Engine ở chế độ **Release** (không phải Debug)
2. Kiểm tra file `core/build/Release/tracking_core.dll` có tồn tại
3. Đảm bảo `opencv_world4100.dll` có trong **PATH** (hoặc copy vào cùng thư mục chạy)

</details>

<details>
<summary><strong>❌ Lỗi "TrackerNano" not found trong Python</strong></summary>

Phiên bản `opencv-python` phải từ **4.7.0** trở lên:
```bash
pip install --upgrade opencv-python
python -c "import cv2; print(cv2.__version__)"
```

</details>

<details>
<summary><strong>❌ Tauri build chậm lần đầu</strong></summary>

Đây là bình thường. Cargo cần biên dịch toàn bộ dependency tree lần đầu (~5-10 phút). Các lần sau sẽ nhanh hơn rất nhiều nhờ incremental compilation.

</details>

---

## 📄 License

*(Chưa xác định — sẽ bổ sung sau)*
