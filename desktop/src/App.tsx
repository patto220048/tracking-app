import { useState, useCallback } from "react";
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
  const { isTracking, trackedPoint, startTracking } = useTracking(
    player.videoRef,
    player.canvasRef,
    player.videoMeta?.width ?? 0,
    player.videoMeta?.height ?? 0
  );
  
  const [activeTool, setActiveTool] = useState<ToolType>("crosshair");
  const [currentROI, setCurrentROI] = useState<BoundingBox | null>(null);

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
              trackedPoint={trackedPoint}
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

      {/* ═══════════════ BOTTOM TIMELINE ═══════════════ */}
      <Timeline
        currentTime={player.currentTime}
        duration={player.duration}
        isLoaded={player.isLoaded}
        videoMeta={player.videoMeta}
        onSeek={player.seek}
      />
    </div>
  );
}

export default App;
