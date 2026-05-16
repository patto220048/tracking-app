import cv2
import numpy as np
import time

def main():
    video_path = "input.mp4" 
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Không thể mở video '{video_path}'.")
        return

    ret, frame = cap.read()
    if not ret:
        return

    h, w = frame.shape[:2]

    # --- TỐI ƯU TỐC ĐỘ: Thu nhỏ kích thước video khi Tracking ---
    # Tracking trên video 4K hay 1080p bằng CSRT rất chậm. 
    # Ta sẽ thu nhỏ frame xuống bề ngang 640px để track, sau đó nhân tỷ lệ tọa độ lên.
    track_width = 640
    scale_factor = w / track_width
    track_height = int(h / scale_factor)
    
    # 1. Chọn vùng trên frame gốc
    window_name_select = "Select Lock-on Target"
    cv2.namedWindow(window_name_select, cv2.WINDOW_NORMAL)
    bbox = cv2.selectROI(window_name_select, frame, fromCenter=False, showCrosshair=True)
    cv2.destroyWindow(window_name_select)

    if bbox[2] == 0 or bbox[3] == 0:
        return

    # Khởi tạo tracker
    tracker = cv2.TrackerCSRT_create()
    
    # Tạo frame nhỏ và bbox nhỏ để init tracker
    frame_small = cv2.resize(frame, (track_width, track_height))
    bbox_small = (int(bbox[0]/scale_factor), int(bbox[1]/scale_factor), int(bbox[2]/scale_factor), int(bbox[3]/scale_factor))
    tracker.init(frame_small, bbox_small)

    # Tâm gốc (Điểm neo) trên frame chuẩn
    lock_x = bbox[0] + bbox[2] / 2.0
    lock_y = bbox[1] + bbox[3] / 2.0

    zoom_scale = 1.3 
    
    # --- TỐI ƯU ĐỘ RUNG: Sử dụng bộ lọc Exponential Moving Average (EMA) ---
    smoothed_x = lock_x
    smoothed_y = lock_y
    # Hệ số làm mượt (Từ 0.0 đến 1.0). 
    # Càng nhỏ càng mượt (ít rung) nhưng sẽ có độ trễ (lag) bám theo.
    alpha_smooth = 0.3 

    print("\nĐang xử lý Tracking... Nhấn phím 'Q' để dừng.")
    window_name_track = "Lock-on Tracking (Nhan Q de thoat)"
    cv2.namedWindow(window_name_track, cv2.WINDOW_NORMAL)

    while True:
        start_time = time.time()
        
        ret, frame = cap.read()
        if not ret:
            break

        # Resize để track cho nhanh
        frame_small = cv2.resize(frame, (track_width, track_height))
        success, new_bbox_small = tracker.update(frame_small)

        if success:
            # Lấy tọa độ từ frame nhỏ, nhân scale lên để ra tọa độ thật trên frame to
            curr_x = (new_bbox_small[0] + new_bbox_small[2] / 2.0) * scale_factor
            curr_y = (new_bbox_small[1] + new_bbox_small[3] / 2.0) * scale_factor
            
            w_box = new_bbox_small[2] * scale_factor
            h_box = new_bbox_small[3] * scale_factor

            # Áp dụng bộ lọc làm mượt (Chống Jitter)
            smoothed_x = alpha_smooth * curr_x + (1 - alpha_smooth) * smoothed_x
            smoothed_y = alpha_smooth * curr_y + (1 - alpha_smooth) * smoothed_y

            # Bù trừ dựa trên tọa độ ĐÃ ĐƯỢC LÀM MƯỢT
            dx = lock_x - smoothed_x
            dy = lock_y - smoothed_y

            M_translate = np.float32([
                [1, 0, dx],
                [0, 1, dy]
            ])
            frame_translated = cv2.warpAffine(frame, M_translate, (w, h))

            M_zoom = cv2.getRotationMatrix2D((lock_x, lock_y), 0, zoom_scale)
            final_frame = cv2.warpAffine(frame_translated, M_zoom, (w, h))

            # Vẽ ô vuông
            top_left = (int(lock_x - w_box/2), int(lock_y - h_box/2))
            bottom_right = (int(lock_x + w_box/2), int(lock_y + h_box/2))
            cv2.rectangle(final_frame, top_left, bottom_right, (0, 255, 0), 2)
            cv2.circle(final_frame, (int(lock_x), int(lock_y)), 5, (0, 0, 255), -1)

            # Tính FPS
            fps = 1.0 / (time.time() - start_time)
            cv2.putText(final_frame, f"FPS: {int(fps)}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,0), 2)

            cv2.imshow(window_name_track, final_frame)
        else:
            cv2.putText(frame, "LOST TARGET", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
            cv2.imshow(window_name_track, frame)

        # Điều chỉnh độ trễ hiển thị (1ms = chạy hết tốc lực máy tính)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
