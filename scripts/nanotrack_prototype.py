import cv2
import numpy as np
import time
import os
import urllib.request

def download_model(url, save_path):
    if not os.path.exists(save_path):
        print(f"Đang tải {os.path.basename(save_path)}... Vui lòng đợi (khoảng 1-3MB).")
        try:
            urllib.request.urlretrieve(url, save_path)
            print("Tải xong!")
        except Exception as e:
            print(f"Lỗi khi tải file: {e}")
            print("Vui lòng kiểm tra kết nối mạng hoặc tải thủ công từ GitHub SiamTrackers.")
            exit(1)

def main():
    # ----------------------------------------
    # Bước 1: Chuẩn bị Model NanoTrack
    # ----------------------------------------
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)

    backbone_path = os.path.join(models_dir, "nanotrack_backbone_sim.onnx")
    neckhead_path = os.path.join(models_dir, "nanotrack_head_sim.onnx")

    # URL gốc từ Github của tác giả HonglinChu
    url_backbone = "https://raw.githubusercontent.com/HonglinChu/SiamTrackers/master/NanoTrack/models/nanotrackv2/nanotrack_backbone_sim.onnx"
    url_neckhead = "https://raw.githubusercontent.com/HonglinChu/SiamTrackers/master/NanoTrack/models/nanotrackv2/nanotrack_head_sim.onnx"

    # Tự động tải ONNX models nếu chưa có
    download_model(url_backbone, backbone_path)
    download_model(url_neckhead, neckhead_path)

    # ----------------------------------------
    # Bước 2: Chuẩn bị Video
    # ----------------------------------------
    video_path = os.path.join(script_dir, "input.mp4")
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Không thể mở video '{video_path}'. Hãy đảm bảo file tồn tại.")
        return

    ret, frame = cap.read()
    if not ret:
        return

    h, w = frame.shape[:2]

    # Resize để track. NanoTrack được thiết kế để chạy rất nhanh, nên ta để 640px là đẹp.
    track_width = 640
    scale_factor = w / track_width
    track_height = int(h / scale_factor)

    window_name_select = "Select Lock-on Target (NanoTrack AI)"
    cv2.namedWindow(window_name_select, cv2.WINDOW_NORMAL)
    bbox = cv2.selectROI(window_name_select, frame, fromCenter=False, showCrosshair=True)
    cv2.destroyWindow(window_name_select)

    if bbox[2] == 0 or bbox[3] == 0:
        return

    # ----------------------------------------
    # Bước 3: Khởi tạo NanoTrack AI (Sử dụng OpenCV DNN)
    # ----------------------------------------
    try:
        params = cv2.TrackerNano_Params()
        params.backbone = backbone_path
        params.neckhead = neckhead_path
        tracker = cv2.TrackerNano_create(params)
    except Exception as e:
        print("\n[LỖI] Khởi tạo TrackerNano thất bại!")
        print("Vui lòng đảm bảo phiên bản OpenCV của bạn là 4.7.0 trở lên.")
        print(f"Chi tiết lỗi: {e}")
        return

    frame_small = cv2.resize(frame, (track_width, track_height))
    bbox_small = (int(bbox[0]/scale_factor), int(bbox[1]/scale_factor), int(bbox[2]/scale_factor), int(bbox[3]/scale_factor))
    tracker.init(frame_small, bbox_small)

    # Tâm gốc (Điểm neo) trên frame chuẩn
    lock_x = bbox[0] + bbox[2] / 2.0
    lock_y = bbox[1] + bbox[3] / 2.0
    zoom_scale = 1.3 
    
    # Bộ lọc làm mượt
    smoothed_x = lock_x
    smoothed_y = lock_y
    alpha_smooth = 0.3 

    print("\nĐang xử lý NanoTrack AI... Nhấn phím 'Q' để dừng.")
    window_name_track = "NanoTrack AI Lock-on"
    cv2.namedWindow(window_name_track, cv2.WINDOW_NORMAL)

    while True:
        start_time = time.time()
        
        ret, frame = cap.read()
        if not ret:
            break

        frame_small = cv2.resize(frame, (track_width, track_height))
        
        # AI tính toán vị trí mới
        success, new_bbox_small = tracker.update(frame_small)

        if success:
            curr_x = (new_bbox_small[0] + new_bbox_small[2] / 2.0) * scale_factor
            curr_y = (new_bbox_small[1] + new_bbox_small[3] / 2.0) * scale_factor
            w_box = new_bbox_small[2] * scale_factor
            h_box = new_bbox_small[3] * scale_factor

            smoothed_x = alpha_smooth * curr_x + (1 - alpha_smooth) * smoothed_x
            smoothed_y = alpha_smooth * curr_y + (1 - alpha_smooth) * smoothed_y

            dx = lock_x - smoothed_x
            dy = lock_y - smoothed_y

            M_translate = np.float32([
                [1, 0, dx],
                [0, 1, dy]
            ])
            frame_translated = cv2.warpAffine(frame, M_translate, (w, h))

            M_zoom = cv2.getRotationMatrix2D((lock_x, lock_y), 0, zoom_scale)
            final_frame = cv2.warpAffine(frame_translated, M_zoom, (w, h))

            # Vẽ ô vuông màu Cam để phân biệt đây là AI
            top_left = (int(lock_x - w_box/2), int(lock_y - h_box/2))
            bottom_right = (int(lock_x + w_box/2), int(lock_y + h_box/2))
            cv2.rectangle(final_frame, top_left, bottom_right, (0, 165, 255), 3) # Màu Cam
            cv2.circle(final_frame, (int(lock_x), int(lock_y)), 5, (0, 0, 255), -1)

            fps = 1.0 / (time.time() - start_time)
            cv2.putText(final_frame, f"NanoTrack FPS: {int(fps)}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

            cv2.imshow(window_name_track, final_frame)
        else:
            # AI NanoTrack sẽ rơi vào đây nếu nó nhận thấy vật thể đã bị mất / bị che khuất hoàn toàn
            cv2.putText(frame, "AI SEARCHING (OCCLUDED)...", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)
            cv2.imshow(window_name_track, frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
