import { useEffect, useRef, useState } from "react";
import { MonitorPlay, Target } from "lucide-react";
import { ROISelection } from "./ROISelection";
import type { BoundingBox } from "./ROISelection";
import type { TrackedPoint } from "../hooks/useTracking";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoSrc: string | null;
  isLoaded: boolean;
  videoWidth: number;
  videoHeight: number;
  isROIToolActive: boolean;
  currentROI: BoundingBox | null;
  isTracking: boolean;
  trackedPoint: TrackedPoint | null;
  isLockOn?: boolean;
  lockOnZoom?: number;
  viewportRatio?: string;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onEnded: () => void;
  onROISelected: (roi: BoundingBox) => void;
}

export function VideoPlayer({
  videoRef,
  canvasRef,
  videoSrc,
  isLoaded,
  videoWidth,
  videoHeight,
  isROIToolActive,
  currentROI,
  isTracking,
  trackedPoint,
  isLockOn = false,
  lockOnZoom = 1.3,
  viewportRatio = "original",
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onROISelected,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Xác định tỉ lệ khung hình hiển thị (Viewport aspect ratio)
  let displayAspectRatio = "16/9";
  if (viewportRatio === "original") {
    displayAspectRatio = videoWidth && videoHeight ? `${videoWidth} / ${videoHeight}` : "16/9";
  } else {
    displayAspectRatio = viewportRatio.replace(":", "/");
  }

  // Xác định điểm tâm để khóa (Lock-on target center)
  let targetCenter: { x: number; y: number } | null = null;
  if (trackedPoint) {
    targetCenter = { x: trackedPoint.x, y: trackedPoint.y };
  } else if (currentROI) {
    targetCenter = {
      x: currentROI.x + currentROI.width / 2,
      y: currentROI.y + currentROI.height / 2,
    };
  }

  // Tính toán tỷ lệ phần trăm và dịch chuyển để căn tâm
  const leftPercent = targetCenter && videoWidth ? (targetCenter.x / videoWidth) * 100 : 50;
  const topPercent = targetCenter && videoHeight ? (targetCenter.y / videoHeight) * 100 : 50;
  const translateX = 50 - leftPercent;
  const translateY = 50 - topPercent;

  // Lấy kích thước thực tế của container để tự động tính toán khung Viewport
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Tính toán kích thước pixel chính xác cho viewport frame bằng JS
  let viewportStyle: React.CSSProperties = { aspectRatio: displayAspectRatio };
  if (containerSize.width > 0 && containerSize.height > 0) {
    const parts = displayAspectRatio.split("/");
    const ratio = parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : 16/9;
    const containerRatio = containerSize.width / containerSize.height;

    if (containerRatio > ratio) {
      // Container rộng hơn tỉ lệ video -> Giới hạn theo chiều cao (Letterbox 2 bên)
      viewportStyle = {
        width: `${containerSize.height * ratio}px`,
        height: `${containerSize.height}px`,
      };
    } else {
      // Container hẹp hơn tỉ lệ video -> Giới hạn theo chiều rộng (Letterbox trên/dưới)
      viewportStyle = {
        width: `${containerSize.width}px`,
        height: `${containerSize.width / ratio}px`,
      };
    }
  }

  return (
    <div className="video-player-container" ref={containerRef}>
      {/* Video element ẩn — chỉ dùng để decode */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          crossOrigin="anonymous"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          preload="auto"
          style={{ display: "none" }}
        />
      )}

      {/* Canvas hiển thị frame */}
      {videoSrc ? (
        <div
          className="video-viewport-frame"
          style={viewportStyle}
        >
          <div
            className="video-canvas-wrapper"
            style={{
              aspectRatio: videoWidth && videoHeight ? `${videoWidth} / ${videoHeight}` : "16/9",
              transform: isLockOn && targetCenter
                ? `translate(${translateX}%, ${translateY}%) scale(${lockOnZoom})`
                : "none",
              transformOrigin: isLockOn && targetCenter
                ? `${leftPercent}% ${topPercent}%`
                : "50% 50%",
              transition: isTracking ? "none" : "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            <canvas
              ref={canvasRef}
              className="video-canvas"
            />
            {/* ROI Selection overlay */}
            <ROISelection
              canvasRef={canvasRef}
              isActive={isROIToolActive && !isTracking}
              isLoaded={isLoaded}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              onROISelected={onROISelected}
              currentROI={currentROI}
            />
            {/* Tracking Result Overlay */}
            {trackedPoint && (
              <div 
                className="tracking-point-overlay"
                style={{
                  position: 'absolute',
                  top: `${(trackedPoint.y / videoHeight) * 100}%`,
                  left: `${(trackedPoint.x / videoWidth) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              >
                <Target size={24} color="#F44336" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="video-placeholder">
          <MonitorPlay size={48} className="linear-text-muted" style={{ opacity: 0.15, marginBottom: "16px" }} />
          <p className="linear-text-muted" style={{ fontSize: "13px", margin: 0 }}>
            No video loaded. Click <strong style={{ color: "#EEEEEE" }}>Import Video</strong> to begin.
          </p>
          <p className="linear-text-muted" style={{ fontSize: "11px", marginTop: "8px", opacity: 0.5 }}>
            Supports MP4, MKV, WebM, AVI, MOV
          </p>
        </div>
      )}
    </div>
  );
}
