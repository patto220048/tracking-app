import { useRef, useCallback, useState, useEffect } from "react";
import type { VideoMeta } from "../hooks/useVideoPlayer";

interface TimelineProps {
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  videoMeta: VideoMeta | null;
  onSeek: (time: number) => void;
  isLockOn?: boolean;
}

// Format thời gian cho ruler (MM:SS)
function formatRulerTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timeline({
  currentTime,
  duration,
  isLoaded,
  videoMeta,
  onSeek,
  isLockOn = false,
}: TimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = fit to view
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Tính playhead position (%)
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Tính thời gian từ vị trí click
  const getTimeFromMouseEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const trackArea = trackAreaRef.current;
      if (!trackArea || duration <= 0) return 0;

      const rect = trackArea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      return percent * duration;
    },
    [duration]
  );

  // Handle click trên track area
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isLoaded) return;
      const time = getTimeFromMouseEvent(e);
      onSeek(time);
    },
    [isLoaded, getTimeFromMouseEvent, onSeek]
  );

  // Handle drag playhead
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isLoaded) return;
      setIsDragging(true);
    },
    [isLoaded]
  );

  // Mouse move / up khi đang drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromMouseEvent(e);
      onSeek(time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, getTimeFromMouseEvent, onSeek]);

  // Zoom bằng scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((prev) => {
        const newZoom = prev + (e.deltaY > 0 ? -0.2 : 0.2);
        return Math.max(1, Math.min(10, newZoom));
      });
    }
  }, []);

  // Tạo ruler ticks
  const generateRulerTicks = useCallback(() => {
    if (duration <= 0) return [];
    
    // Khoảng cách giữa các tick (giây)
    const intervals = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const targetTickCount = 12 * zoom;
    let tickInterval = 1;
    for (const interval of intervals) {
      if (duration / interval <= targetTickCount) {
        tickInterval = interval;
        break;
      }
    }

    const ticks: { time: number; label: string; isMajor: boolean }[] = [];
    for (let t = 0; t <= duration; t += tickInterval) {
      ticks.push({
        time: t,
        label: formatRulerTime(t),
        isMajor: t % (tickInterval * 2) === 0 || tickInterval >= 5,
      });
    }
    return ticks;
  }, [duration, zoom]);

  const rulerTicks = generateRulerTicks();

  return (
    <div className="timeline-container">
      {/* Timeline Header */}
      <div className="timeline-header">
        <span className="timeline-title">Timeline</span>
        <div className="timeline-header-actions">
          <button
            className="timeline-zoom-btn"
            onClick={() => setZoom(1)}
            title="Fit to view"
          >
            Fit
          </button>
          <span className="timeline-zoom-label">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Scrollable track area */}
      <div
        className="timeline-scroll-container"
        ref={scrollContainerRef}
        onWheel={handleWheel}
      >
        <div
          className="timeline-track-area"
          ref={trackAreaRef}
          style={{ width: `${100 * zoom}%` }}
          onClick={handleTrackClick}
        >
          {/* Time Ruler */}
          <div className="timeline-ruler">
            {rulerTicks.map((tick, i) => (
              <div
                key={i}
                className={`ruler-tick ${tick.isMajor ? "major" : "minor"}`}
                style={{ left: `${(tick.time / duration) * 100}%` }}
              >
                {tick.isMajor && (
                  <span className="ruler-label">{tick.label}</span>
                )}
              </div>
            ))}
          </div>

          {/* Video Track */}
          <div className="timeline-track">
            <div className="track-label">
              <span>Video 1</span>
            </div>
            <div className="track-content">
              {isLoaded && videoMeta && (
                <div className="track-clip video-clip">
                  <span className="clip-name">{videoMeta.fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* FX Track */}
          <div className="timeline-track">
            <div className="track-label">
              <span>FX (Lock-on)</span>
            </div>
            <div className="track-content">
              {isLoaded && isLockOn && (
                <div
                  className="track-clip video-clip"
                  style={{
                    left: 0,
                    right: 0,
                    background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)",
                    border: "1px solid rgba(168, 85, 247, 0.35)",
                    color: "rgba(168, 85, 247, 0.9)",
                  }}
                >
                  <span className="clip-name">Lock-on Stabilization</span>
                </div>
              )}
            </div>
          </div>

          {/* Playhead */}
          {isLoaded && (
            <div
              className={`timeline-playhead ${isDragging ? "dragging" : ""}`}
              style={{ left: `${playheadPercent}%` }}
              onMouseDown={handlePlayheadMouseDown}
            >
              <div className="playhead-head" />
              <div className="playhead-line" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
