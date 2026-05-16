#include "Tracker.h"
#include <iostream>

namespace tracking {

    Tracker::Tracker(const std::string& backbone_path, const std::string& neckhead_path) {
        cv::TrackerNano::Params params;
        params.backbone = backbone_path;
        params.neckhead = neckhead_path;
        
        try {
            nano_tracker = cv::TrackerNano::create(params);
        } catch (const cv::Exception& e) {
            std::cerr << "OpenCV Error initializing TrackerNano: " << e.what() << std::endl;
        }
    }

    Tracker::~Tracker() {
        // cv::Ptr tự động quản lý bộ nhớ
    }

    void Tracker::init(const cv::Mat& frame, const cv::Rect& bbox) {
        if (nano_tracker) {
            nano_tracker->init(frame, bbox);
            this->current_position.x = bbox.x + bbox.width / 2.0f;
            this->current_position.y = bbox.y + bbox.height / 2.0f;
        }
    }

    Point Tracker::processFrame(const cv::Mat& frame) {
        if (nano_tracker) {
            cv::Rect new_bbox;
            bool success = nano_tracker->update(frame, new_bbox);

            if (success) {
                // Tính tọa độ tâm mới
                this->current_position.x = new_bbox.x + new_bbox.width / 2.0f;
                this->current_position.y = new_bbox.y + new_bbox.height / 2.0f;
            }
        }
        return this->current_position;
    }

} // namespace tracking

// ==========================================
// THỰC THI C-API CHO RUST GỌI VÀO
// ==========================================
extern "C" {

    EXPORT_API void* create_tracker(const char* backbone_path, const char* neckhead_path) {
        return new tracking::Tracker(backbone_path, neckhead_path);
    }

    EXPORT_API void destroy_tracker(void* tracker_ptr) {
        if (tracker_ptr) {
            delete static_cast<tracking::Tracker*>(tracker_ptr);
        }
    }

    EXPORT_API void init_tracker(void* tracker_ptr, 
                      const unsigned char* frame_data, int width, int height, 
                      int bbox_x, int bbox_y, int bbox_w, int bbox_h) {
        if (!tracker_ptr || !frame_data) return;
        
        // Wrap mảng byte nhận từ Rust (giả sử RGB 3 kênh) thành ma trận cv::Mat của OpenCV
        cv::Mat frame(height, width, CV_8UC3, (void*)frame_data);
        cv::Rect bbox(bbox_x, bbox_y, bbox_w, bbox_h);
        
        auto tracker = static_cast<tracking::Tracker*>(tracker_ptr);
        tracker->init(frame, bbox);
    }

    EXPORT_API tracking::Point update_tracker(void* tracker_ptr, 
                                   const unsigned char* frame_data, int width, int height) {
        if (!tracker_ptr || !frame_data) return {0, 0};
        
        // Wrap mảng byte thành cv::Mat
        cv::Mat frame(height, width, CV_8UC3, (void*)frame_data);
        auto tracker = static_cast<tracking::Tracker*>(tracker_ptr);
        
        return tracker->processFrame(frame);
    }

}
