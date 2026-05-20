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
  videoHeight: number,
  fps: number = 30
) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackedPoint, setTrackedPoint] = useState<TrackedPoint | null>(null);
  const [trackingData, setTrackingData] = useState<TrackedPoint[]>([]); 
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  const isTrackingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getOffscreenCanvas = (w: number, h: number) => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }
    const canvas = offscreenCanvasRef.current;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return canvas;
  };

  useEffect(() => {
    let active = true;
    const initEngine = async () => {
      try {
        console.log("Đang tự động khởi tạo AI Engine...");
        const result = await invoke<string>("init_ai_engine");
        if (active) {
          setIsEngineReady(true);
          setEngineError(null);
          console.log("AI Engine initialized:", result);
        }
      } catch (err: any) {
        if (active) {
          setIsEngineReady(false);
          setEngineError(err.toString());
          console.error("Lỗi tự động khởi tạo AI Engine:", err);
        }
      }
    };
    initEngine();
    return () => {
      active = false;
    };
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    isTrackingRef.current = false;
  }, []);

  const processOfflineTracking = async (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    trackWidth: number,
    trackHeight: number
  ) => {
    const timeStep = 1 / fps;
    let currentTime = video.currentTime + timeStep;

    while (isTrackingRef.current && currentTime <= video.duration) {
      // Seek video and wait for frame
      video.currentTime = currentTime;
      await new Promise(resolve => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve(true);
        };
        video.addEventListener("seeked", onSeeked);
      });

      if (!isTrackingRef.current) break; // Check again if user canceled

      try {
        // Draw to main canvas so user sees progress
        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
        }
        const mainCtx = canvas.getContext("2d");
        if (mainCtx) {
          mainCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
        }

        // Extract frame data
        const offscreen = getOffscreenCanvas(trackWidth, trackHeight);
        const ctx = offscreen.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, trackWidth, trackHeight);
          const imageData = ctx.getImageData(0, 0, trackWidth, trackHeight);
          const frameData = new Uint8Array(imageData.data.buffer);

          // Call AI Engine
          const point: { x: number, y: number } = await invoke("process_frame", {
            frameData: Array.from(frameData),
            width: trackWidth,
            height: trackHeight,
          });

          // Scale back to original
          const scaleX = trackWidth / videoWidth;
          const scaleY = trackHeight / videoHeight;
          const originalX = point.x / scaleX;
          const originalY = point.y / scaleY;

          const newTrackedPoint = { x: originalX, y: originalY, time: currentTime };
          setTrackedPoint(newTrackedPoint);
          setTrackingData(prev => [...prev, newTrackedPoint]);
        }
      } catch (error) {
        console.error("Lỗi process_frame offline:", error);
        break; // Dừng nếu có lỗi nghiêm trọng
      }

      currentTime += timeStep;
    }

    // Kết thúc tracking
    setIsTracking(false);
    isTrackingRef.current = false;
  };

  const startTracking = useCallback(async (roi: BoundingBox) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || videoWidth === 0 || videoHeight === 0) {
      console.warn("Video/Canvas chưa sẵn sàng");
      return;
    }

    try {
      video.pause();

      if (!isEngineReady) {
        await invoke("init_ai_engine");
        setIsEngineReady(true);
        setEngineError(null);
      }

      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }
      const mainCtx = canvas.getContext("2d");
      if (mainCtx) {
        mainCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
      }

      const TRACK_MAX_DIM = 320;
      let trackWidth = videoWidth;
      let trackHeight = videoHeight;
      if (videoWidth > TRACK_MAX_DIM || videoHeight > TRACK_MAX_DIM) {
        if (videoWidth > videoHeight) {
          trackWidth = TRACK_MAX_DIM;
          trackHeight = Math.round((videoHeight * TRACK_MAX_DIM) / videoWidth);
        } else {
          trackHeight = TRACK_MAX_DIM;
          trackWidth = Math.round((videoWidth * TRACK_MAX_DIM) / videoHeight);
        }
      }

      const offscreen = getOffscreenCanvas(trackWidth, trackHeight);
      const ctx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, trackWidth, trackHeight);

      const imageData = ctx.getImageData(0, 0, trackWidth, trackHeight);
      const frameData = new Uint8Array(imageData.data.buffer);

      const scaleX = trackWidth / videoWidth;
      const scaleY = trackHeight / videoHeight;
      const x_track = roi.x * scaleX;
      const y_track = roi.y * scaleY;
      const w_track = roi.width * scaleX;
      const h_track = roi.height * scaleY;

      console.log(`Khởi tạo AI Tracker Offline (${trackWidth}x${trackHeight})...`);
      await invoke("start_tracking", {
        frameData: Array.from(frameData),
        width: trackWidth,
        height: trackHeight,
        x: Math.round(x_track),
        y: Math.round(y_track),
        w: Math.round(w_track),
        h: Math.round(h_track),
      });

      const startPoint = { x: roi.x + roi.width / 2, y: roi.y + roi.height / 2, time: video.currentTime };
      setTrackedPoint(startPoint);
      setTrackingData([startPoint]);
      
      setIsTracking(true);
      isTrackingRef.current = true;

      // Start the offline process loop instead of video.play()
      processOfflineTracking(video, canvas, trackWidth, trackHeight);
    } catch (error) {
      console.error("Lỗi khi start_tracking:", error);
      alert("Lỗi: " + error);
    }
  }, [videoRef, canvasRef, videoWidth, videoHeight, isEngineReady, fps]);

  return {
    isTracking,
    trackedPoint,
    trackingData,
    startTracking,
    stopTracking,
  };
}
