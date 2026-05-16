#pragma once

#include <string>
#include <memory>
#include <opencv2/core.hpp>
#include <opencv2/video/tracking.hpp>

// Định nghĩa macro export cho Windows DLL
#ifdef _WIN32
#define EXPORT_API __declspec(dllexport)
#else
#define EXPORT_API
#endif

namespace tracking {

    struct Point {
        float x;
        float y;
    };

    class Tracker {
    public:
        // Khởi tạo TrackerNano với đường dẫn tới 2 file model
        Tracker(const std::string& backbone_path, const std::string& neckhead_path);
        ~Tracker();

        // Khởi tạo đối tượng cần track bằng bounding box
        void init(const cv::Mat& frame, const cv::Rect& bbox);

        // Xử lý frame mới và trả về vị trí cập nhật (Tâm của bounding box)
        Point processFrame(const cv::Mat& frame);

    private:
        cv::Ptr<cv::TrackerNano> nano_tracker;
        Point current_position;
    };

} // namespace tracking

// API thuần C (C-ABI) để Rust có thể gọi trực tiếp thông qua FFI
extern "C" {
    // Trả về con trỏ void* chứa object Tracker
    EXPORT_API void* create_tracker(const char* backbone_path, const char* neckhead_path);
    
    // Giải phóng vùng nhớ
    EXPORT_API void destroy_tracker(void* tracker_ptr);

    // Khởi tạo bbox với dữ liệu ảnh truyền từ Rust (Mảng byte RGB)
    EXPORT_API void init_tracker(void* tracker_ptr, 
                      const unsigned char* frame_data, int width, int height, 
                      int bbox_x, int bbox_y, int bbox_w, int bbox_h);

    // Truyền frame mới vào để theo dõi, trả về tọa độ điểm tâm mới (C struct)
    EXPORT_API tracking::Point update_tracker(void* tracker_ptr, 
                                   const unsigned char* frame_data, int width, int height);
}
