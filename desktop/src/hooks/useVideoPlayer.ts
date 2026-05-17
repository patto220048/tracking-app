import { useState, useRef, useCallback, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

export interface VideoMeta {
  fileName: string;
  fileSizeMb: number;
  filePath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Render video frame lên canvas
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused && !video.seeking) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Đảm bảo canvas match kích thước video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, []);

  // Mở file dialog và load video
  const openVideoFile = useCallback(async () => {
    try {
      const file = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: "Video",
          extensions: ["mp4", "mkv", "webm", "avi", "mov", "wmv"]
        }]
      });

      if (file) {
        const filePath = file as unknown as string;
        const assetUrl = convertFileSrc(filePath);
        
        // Lấy metadata từ Rust backend
        try {
          const meta = await invoke<{ file_name: string; file_size_mb: number; file_path: string }>(
            "get_video_metadata",
            { path: filePath }
          );
          setVideoMeta({
            fileName: meta.file_name,
            fileSizeMb: meta.file_size_mb,
            filePath: meta.file_path,
            duration: 0,
            width: 0,
            height: 0,
            fps: 30,
          });
        } catch {
          // Fallback nếu metadata command fail
          setVideoMeta({
            fileName: filePath.split(/[\\/]/).pop() || "video",
            fileSizeMb: 0,
            filePath: filePath,
            duration: 0,
            width: 0,
            height: 0,
            fps: 30,
          });
        }

        setVideoSrc(assetUrl);
        setIsPlaying(false);
        setCurrentTime(0);
        setIsLoaded(false);
      }
    } catch (error) {
      console.error("Lỗi mở file:", error);
    }
  }, []);

  // Xử lý khi video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setIsLoaded(true);

    // Cập nhật metadata với thông tin từ video element
    setVideoMeta(prev => prev ? {
      ...prev,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    } : null);

    // Render frame đầu tiên
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }
    }
  }, []);

  // Xử lý time update
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, []);

  // Xử lý khi video kết thúc
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(animFrameRef.current);
    // Render frame cuối
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Play / Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(renderFrame);
    } else {
      video.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
      // Render frame hiện tại lên canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
  }, [videoSrc, renderFrame]);

  // Stop
  const stop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    cancelAnimationFrame(animFrameRef.current);

    // Render frame đầu tiên
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (video && canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }, 50);
  }, []);

  // Seek
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
    setCurrentTime(video.currentTime);

    // Render frame tại vị trí seek
    if (video.paused) {
      const onSeeked = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        video.removeEventListener("seeked", onSeeked);
      };
      video.addEventListener("seeked", onSeeked);
    }
  }, []);

  // Thay đổi tốc độ phát
  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  // Thay đổi volume
  const changeVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (video) {
      video.volume = vol;
      setVolume(vol);
      if (vol === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  }, []);

  // Trích xuất frame data cho tracking (sẽ dùng sau)
  const getFrameData = useCallback((): ImageData | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    videoSrc,
    isPlaying,
    isLoaded,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    videoMeta,
    openVideoFile,
    togglePlay,
    stop,
    seek,
    changePlaybackRate,
    toggleMute,
    changeVolume,
    getFrameData,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleEnded,
  };
}
