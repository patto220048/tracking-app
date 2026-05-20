import { useState, useCallback, useEffect } from "react";
import { Plus, Settings2, Target, Crosshair, MousePointer2 } from "lucide-react";
import { useVideoPlayer } from "./hooks/useVideoPlayer";
import { useTracking } from "./hooks/useTracking";
import { VideoPlayer } from "./components/VideoPlayer";
import { PlayerControls } from "./components/PlayerControls";
import { Timeline } from "./components/Timeline";
import type { BoundingBox } from "./components/ROISelection";
import "./App.css";

type ToolType = "select" | "crosshair";

function App() {
  const player = useVideoPlayer();
  const { isTracking, trackedPoint, trackingData, startTracking, stopTracking } = useTracking(
    player.videoRef,
    player.canvasRef,
    player.videoMeta?.width ?? 0,
    player.videoMeta?.height ?? 0,
    player.videoMeta?.fps ?? 30
  );
  
  const [activeTool, setActiveTool] = useState<ToolType>("crosshair");
  const [currentROI, setCurrentROI] = useState<BoundingBox | null>(null);
  const [isLockOn, setIsLockOn] = useState(true);
  const [lockOnZoom, setLockOnZoom] = useState(1.3);
  const [viewportRatio, setViewportRatio] = useState<string>("original");

  // Tự động nhận dạng tỷ lệ video (ngang, dọc, hoặc vuông) khi load video mới
  useEffect(() => {
    if (player.videoMeta && player.videoMeta.width > 0 && player.videoMeta.height > 0) {
      const { width, height } = player.videoMeta;
      if (width === height) {
        setViewportRatio("1:1");
      } else if (height > width) {
        setViewportRatio("9:16");
      } else {
        setViewportRatio("16:9");
      }
    }
  }, [player.videoMeta]);

  // Tìm kiếm điểm tracking dựa trên currentTime khi playback bình thường
  const playbackTrackedPoint = isTracking 
    ? trackedPoint 
    : trackingData.length > 0 
      ? trackingData.reduce((prev, curr) => 
          Math.abs(curr.time - player.currentTime) < Math.abs(prev.time - player.currentTime) ? curr : prev
        ) 
      : null;

  const handleROISelected = useCallback((roi: BoundingBox) => {
    setCurrentROI(roi);
    console.log("ROI selected:", roi);
  }, []);

  const handleClearROI = useCallback(() => {
    setCurrentROI(null);
  }, []);

  // Keyboard shortcuts
  // V = select tool, C = crosshair tool, Space = play/pause
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    
    switch (e.key.toLowerCase()) {
      case "v":
        setActiveTool("select");
        break;
      case "c":
        setActiveTool("crosshair");
        break;
      case " ":
        e.preventDefault();
        player.togglePlay();
        break;
      case "escape":
        setCurrentROI(null);
        break;
    }
  }, [player]);

  return (
    <div className="app-container" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="app-header">
        <div className="header-left">
          <Target className="linear-accent" size={18} />
          <span className="header-title">NanoTrack Studio</span>
        </div>
        <div className="header-right">
          <button className="linear-btn-secondary header-btn" onClick={player.openVideoFile}>
            <Plus size={14} />
            Import Video
          </button>
          <button className="linear-btn-primary header-btn">
            Export
          </button>
        </div>
      </header>

      {/* ═══════════════ MAIN WORKSPACE ═══════════════ */}
      <div className="workspace">

        {/* LEFT TOOLBAR */}
        <div className="toolbar">
          <button
            className={`linear-icon-btn ${activeTool === "select" ? "toolbar-active" : ""}`}
            title="Select Tool (V)"
            onClick={() => setActiveTool("select")}
          >
            <MousePointer2 size={18} />
          </button>
          <button
            className={`linear-icon-btn ${activeTool === "crosshair" ? "toolbar-active" : ""}`}
            title="Lock-on Target (C)"
            onClick={() => setActiveTool("crosshair")}
          >
            <Crosshair size={18} />
          </button>
          <div style={{ flex: 1 }} />
          <button className="linear-icon-btn" title="Settings">
            <Settings2 size={18} />
          </button>
        </div>

        {/* CENTER: VIDEO + CONTROLS */}
        <div className="viewer-area">
          <div className="viewer-content">
            <VideoPlayer
              videoRef={player.videoRef}
              canvasRef={player.canvasRef}
              videoSrc={player.videoSrc}
              isLoaded={player.isLoaded}
              videoWidth={player.videoMeta?.width ?? 0}
              videoHeight={player.videoMeta?.height ?? 0}
              isROIToolActive={activeTool === "crosshair"}
              currentROI={currentROI}
              isTracking={isTracking}
              trackedPoint={playbackTrackedPoint}
              isLockOn={isLockOn}
              lockOnZoom={lockOnZoom}
              viewportRatio={viewportRatio}
              onLoadedMetadata={player.handleLoadedMetadata}
              onTimeUpdate={player.handleTimeUpdate}
              onEnded={player.handleEnded}
              onROISelected={handleROISelected}
            />
          </div>
          <PlayerControls
            isPlaying={player.isPlaying}
            isLoaded={player.isLoaded}
            currentTime={player.currentTime}
            duration={player.duration}
            playbackRate={player.playbackRate}
            isMuted={player.isMuted}
            onTogglePlay={player.togglePlay}
            onStop={player.stop}
            onToggleMute={player.toggleMute}
            onChangePlaybackRate={player.changePlaybackRate}
          />
        </div>

        {/* RIGHT: INSPECTOR */}
        <div className="inspector">
          <div className="inspector-title">Inspector</div>

          {/* Video Info */}
          {player.videoMeta && (
            <div className="inspector-section">
              <label className="inspector-label">Video File</label>
              <div className="inspector-info-grid">
                <span className="info-key">Name</span>
                <span className="info-value" title={player.videoMeta.fileName}>
                  {player.videoMeta.fileName}
                </span>
                {player.videoMeta.width > 0 && (
                  <>
                    <span className="info-key">Resolution</span>
                    <span className="info-value">
                      {player.videoMeta.width}×{player.videoMeta.height}
                    </span>
                  </>
                )}
                <span className="info-key">Size</span>
                <span className="info-value">{player.videoMeta.fileSizeMb} MB</span>
                {player.videoMeta.duration > 0 && (
                  <>
                    <span className="info-key">Duration</span>
                    <span className="info-value">{player.videoMeta.duration.toFixed(2)}s</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ROI Info */}
          {currentROI && (
            <div className="inspector-section">
              <label className="inspector-label">Target Region (ROI)</label>
              <div className="inspector-info-grid">
                <span className="info-key">Position</span>
                <span className="info-value">
                  {Math.round(currentROI.x)}, {Math.round(currentROI.y)}
                </span>
                <span className="info-key">Size</span>
                <span className="info-value">
                  {Math.round(currentROI.width)}×{Math.round(currentROI.height)}
                </span>
              </div>
              <button
                className="linear-btn-secondary"
                onClick={handleClearROI}
                style={{ width: "100%", marginTop: "8px", fontSize: "11px" }}
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Viewport Aspect Ratio */}
          <div className="inspector-section">
            <label className="inspector-label">Viewport Aspect Ratio</label>
            <select
              className="inspector-select"
              value={viewportRatio}
              onChange={(e) => setViewportRatio(e.target.value)}
            >
              <option value="original">Original (Auto)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Vertical/TikTok)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:3">4:3 (Classic)</option>
            </select>
          </div>

          {/* Tracking Engine */}
          <div className="inspector-section">
            <label className="inspector-label">Tracking Engine</label>
            <select className="inspector-select">
              <option>NanoTrack AI (Recommended)</option>
              <option>OpenCV CSRT (Legacy)</option>
            </select>
          </div>

          {/* Smoothing */}
          <div className="inspector-section">
            <label className="inspector-label">Smoothing (EMA Alpha)</label>
            <input
              type="range"
              min="1"
              max="100"
              defaultValue="30"
              className="inspector-slider"
            />
            <div className="slider-labels">
              <span>Laggy</span>
              <span>Smooth</span>
              <span>Jittery</span>
            </div>
          </div>

          {/* Lock-on Target Effect */}
          <div className="inspector-section" style={{ borderTop: "1px solid #282828", marginTop: "4px", paddingTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <input
                type="checkbox"
                id="lock-on-toggle"
                checked={isLockOn}
                onChange={(e) => setIsLockOn(e.target.checked)}
                style={{ accentColor: "#5E6AD2", cursor: "pointer", width: "14px", height: "14px" }}
              />
              <label htmlFor="lock-on-toggle" style={{ cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#EEEEEE", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Lock-on Preview
              </label>
            </div>
            {isLockOn && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888888", marginBottom: "4px" }}>
                  <span>Stabilization Zoom</span>
                  <span>{lockOnZoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.1"
                  value={lockOnZoom}
                  onChange={(e) => setLockOnZoom(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#5E6AD2", height: "4px", backgroundColor: "#282828", borderRadius: "2px", appearance: "none", cursor: "pointer" }}
                />
              </div>
            )}
          </div>

          {/* Instructions Card */}
          <div className="inspector-card">
            <div className="card-title">How to track</div>
            <ol className="card-steps">
              <li>Import a video file.</li>
              <li>
                Select the <Crosshair size={12} style={{ verticalAlign: "middle" }} /> crosshair tool.
              </li>
              <li>Draw a box over your target.</li>
              <li>Press Start Tracking.</li>
            </ol>
            <button
              className="linear-btn-primary card-action-btn"
              disabled={!player.isLoaded || !currentROI || isTracking}
              onClick={() => {
                if (currentROI && !isTracking) {
                  startTracking(currentROI);
                }
              }}
            >
              {isTracking ? "Tracking..." : "Start AI Tracking"}
            </button>
          </div>
        </div>
      </div>

      {/* TRACKING PROGRESS MODAL */}
      {isTracking && (
        <div className="tracking-progress-overlay">
          <div className="tracking-progress-modal">
            <h3>Đang Tracking (AI NanoTrack)...</h3>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${player.duration > 0 ? Math.min(100, (player.currentTime / player.duration) * 100) : 0}%` }} 
              />
            </div>
            <p>{player.duration > 0 ? Math.min(100, Math.round((player.currentTime / player.duration) * 100)) : 0}%</p>
            <button className="linear-btn-secondary" onClick={stopTracking}>
              Dừng (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ BOTTOM TIMELINE ═══════════════ */}
      <Timeline
        currentTime={player.currentTime}
        duration={player.duration}
        isLoaded={player.isLoaded}
        videoMeta={player.videoMeta}
        onSeek={player.seek}
        isLockOn={isLockOn}
      />
    </div>
  );
}

export default App;
