import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { BoundingBox } from "../components/ROISelection";

export interface TrackedPoint {
  x: number;
  y: number;
  time: number;
}

export function useTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoWidth: number,
  videoHeight: number
) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackedPoint, setTrackedPoint] = useState<TrackedPoint | null>(null);
  const [trackingData, setTrackingData] = useState<TrackedPoint[]>([]); // Lưu trữ dữ liệu tracking

  const isTrackingRef = useRef(false);
  const requestRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(-1);

  // Khởi tạo tracking engine và đặt ROI ban đầu
  const startTracking = useCallback(async (roi: BoundingBox) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || videoWidth === 0 || videoHeight === 0) {
      console.warn("Video/Canvas chưa sẵn sàng");
      return;
    }

    try {
      // Đảm bảo video đang dừng để lấy frame chính xác
      video.pause();

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Trích xuất RGBA frame
      const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
      // Ép kiểu Uint8Array để Tauri serialize thành byte array hiệu quả
      const frameData = new Uint8Array(imageData.data.buffer);

      console.log("Khởi tạo AI Tracker...");
      await invoke("start_tracking", {
        frameData: Array.from(frameData), // Fallback mảng số nếu Tauri gặp lỗi serialize
        width: videoWidth,
        height: videoHeight,
        x: Math.round(roi.x),
        y: Math.round(roi.y),
        w: Math.round(roi.width),
        h: Math.round(roi.height),
      });

      console.log("AI Tracker đã sẵn sàng!");
      
      const startPoint = { x: roi.x + roi.width / 2, y: roi.y + roi.height / 2, time: video.currentTime };
      setTrackedPoint(startPoint);
      setTrackingData([startPoint]);
      
      setIsTracking(true);
      isTrackingRef.current = true;
      lastProcessedTimeRef.current = video.currentTime;

      // Tự động play video để bắt đầu quá trình tracking
      video.play();
    } catch (error) {
      console.error("Lỗi khi start_tracking:", error);
      alert("Lỗi: " + error);
    }
  }, [videoRef, canvasRef, videoWidth, videoHeight]);

  // Vòng lặp xử lý frame
  const processTrackingFrame = useCallback(async () => {
    if (!isTrackingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Chỉ xử lý nếu thời gian video đã thay đổi
    if (video.currentTime !== lastProcessedTimeRef.current) {
      try {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
          const frameData = new Uint8Array(imageData.data.buffer);

          // Gọi Rust/C++ để lấy tọa độ mới
          const point: { x: number, y: number } = await invoke("process_frame", {
            frameData: Array.from(frameData),
            width: videoWidth,
            height: videoHeight,
          });

          const newTrackedPoint = { x: point.x, y: point.y, time: video.currentTime };
          setTrackedPoint(newTrackedPoint);
          setTrackingData(prev => [...prev, newTrackedPoint]);
          
          lastProcessedTimeRef.current = video.currentTime;
        }
      } catch (error) {
        console.error("Lỗi process_frame:", error);
      }
    }

    // Tiếp tục loop nếu video chưa kết thúc
    if (!video.paused && !video.ended) {
      requestRef.current = requestAnimationFrame(processTrackingFrame);
    } else if (video.ended) {
      setIsTracking(false);
      isTrackingRef.current = false;
    }
  }, [videoRef, canvasRef, videoWidth, videoHeight]);

  // Hook vào quá trình play của video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (isTrackingRef.current) {
        requestRef.current = requestAnimationFrame(processTrackingFrame);
      }
    };

    const handlePause = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [videoRef, processTrackingFrame]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    isTrackingRef.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  }, []);

  return {
    isTracking,
    trackedPoint,
    trackingData,
    startTracking,
    stopTracking,
  };
}
