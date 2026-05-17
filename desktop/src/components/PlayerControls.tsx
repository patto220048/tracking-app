import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react";

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onChangePlaybackRate: (rate: number) => void;
}

// Chuyển đổi giây → HH:MM:SS:FF (30fps)
function formatTimecode(seconds: number, fps: number = 30): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00:00:00";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);

  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
    f.toString().padStart(2, "0"),
  ].join(":");
}

export function PlayerControls({
  isPlaying,
  isLoaded,
  currentTime,
  duration,
  playbackRate,
  isMuted,
  onTogglePlay,
  onStop,
  onToggleMute,
  onChangePlaybackRate,
}: PlayerControlsProps) {
  const rates = [0.25, 0.5, 1, 1.5, 2];

  return (
    <div className="player-controls">
      {/* Left: playback buttons */}
      <div className="player-controls-left">
        <button
          className="linear-icon-btn"
          onClick={onStop}
          disabled={!isLoaded}
          title="Stop"
          style={{ padding: "4px" }}
        >
          <Square size={14} fill="currentColor" />
        </button>
        <button
          className="linear-icon-btn player-play-btn"
          onClick={onTogglePlay}
          disabled={!isLoaded}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
      </div>

      {/* Center: timecode */}
      <div className="player-timecode">
        <span className="timecode-current">{formatTimecode(currentTime)}</span>
        <span className="timecode-separator">/</span>
        <span className="timecode-duration">{formatTimecode(duration)}</span>
      </div>

      {/* Right: speed + volume */}
      <div className="player-controls-right">
        <select
          className="player-speed-select"
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          disabled={!isLoaded}
          title="Playback Speed"
        >
          {rates.map((r) => (
            <option key={r} value={r}>
              {r}x
            </option>
          ))}
        </select>
        <button
          className="linear-icon-btn"
          onClick={onToggleMute}
          disabled={!isLoaded}
          title={isMuted ? "Unmute" : "Mute"}
          style={{ padding: "4px" }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
