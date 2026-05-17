import { Plus, Settings2, Target, Crosshair } from "lucide-react";
import { useVideoPlayer } from "./hooks/useVideoPlayer";
import { VideoPlayer } from "./components/VideoPlayer";
import { PlayerControls } from "./components/PlayerControls";
import { Timeline } from "./components/Timeline";
import "./App.css";

function App() {
  const player = useVideoPlayer();

  return (
    <div className="app-container">
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
          <button className="linear-icon-btn" title="Select Tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
              <path d="m13 13 6 6"/>
            </svg>
          </button>
          <button className="linear-icon-btn toolbar-active" title="Lock-on Target">
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
              onLoadedMetadata={player.handleLoadedMetadata}
              onTimeUpdate={player.handleTimeUpdate}
              onEnded={player.handleEnded}
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
              <li>Select the crosshair tool.</li>
              <li>Draw a box over your target.</li>
              <li>Press Start Tracking.</li>
            </ol>
            <button
              className="linear-btn-primary card-action-btn"
              disabled={!player.isLoaded}
            >
              Start AI Tracking
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
