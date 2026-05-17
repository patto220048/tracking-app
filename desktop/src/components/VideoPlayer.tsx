import { useEffect, useRef } from "react";
import { MonitorPlay } from "lucide-react";
import { ROISelection } from "./ROISelection";
import type { BoundingBox } from "./ROISelection";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoSrc: string | null;
  isLoaded: boolean;
  videoWidth: number;
  videoHeight: number;
  isROIToolActive: boolean;
  currentROI: BoundingBox | null;
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
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onROISelected,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fit canvas khi container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // Canvas sẽ tự scale qua CSS object-fit
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="video-player-container" ref={containerRef}>
      {/* Video element ẩn — chỉ dùng để decode */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          preload="auto"
          style={{ display: "none" }}
        />
      )}

      {/* Canvas hiển thị frame */}
      {videoSrc ? (
        <>
          <canvas
            ref={canvasRef}
            className="video-canvas"
          />
          {/* ROI Selection overlay */}
          <ROISelection
            canvasRef={canvasRef}
            isActive={isROIToolActive}
            isLoaded={isLoaded}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            onROISelected={onROISelected}
            currentROI={currentROI}
          />
        </>
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
