import { useRef, useState, useCallback, useEffect } from "react";

export interface BoundingBox {
  x: number;      // Tọa độ x trên video gốc (pixel)
  y: number;      // Tọa độ y trên video gốc (pixel)
  width: number;  // Chiều rộng trên video gốc (pixel)
  height: number; // Chiều cao trên video gốc (pixel)
}

interface ROISelectionProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;      // Tool crosshair đang được chọn?
  isLoaded: boolean;      // Video đã load?
  videoWidth: number;     // Kích thước video gốc
  videoHeight: number;
  onROISelected: (roi: BoundingBox) => void;
  currentROI: BoundingBox | null;
}

export function ROISelection({
  canvasRef,
  isActive,
  isLoaded,
  videoWidth,
  videoHeight,
  onROISelected,
  currentROI,
}: ROISelectionProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  // Chuyển tọa độ chuột từ overlay canvas → tọa độ video gốc
  const mouseToVideoCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const overlay = overlayRef.current;
      if (!overlay || videoWidth === 0 || videoHeight === 0) return null;

      const overlayRect = overlay.getBoundingClientRect();
      const mouseX = e.clientX - overlayRect.left;
      const mouseY = e.clientY - overlayRect.top;

      const canvasDisplayW = overlayRect.width;
      const canvasDisplayH = overlayRect.height;

      // Chuyển trực tiếp sang tọa độ video gốc (tỉ lệ tuyến tính vì overlay khớp hoàn toàn với video)
      const vx = (mouseX / canvasDisplayW) * videoWidth;
      const vy = (mouseY / canvasDisplayH) * videoHeight;

      // Clamp vào trong video
      return {
        x: Math.max(0, Math.min(videoWidth, vx)),
        y: Math.max(0, Math.min(videoHeight, vy)),
      };
    },
    [videoWidth, videoHeight]
  );

  // Chuyển tọa độ video gốc → pixel trên overlay canvas
  const videoToOverlayCoords = useCallback(
    (vx: number, vy: number) => {
      const overlay = overlayRef.current;
      if (!overlay || videoWidth === 0 || videoHeight === 0) return { x: 0, y: 0 };

      const rect = overlay.getBoundingClientRect();
      const canvasDisplayW = rect.width;
      const canvasDisplayH = rect.height;

      return {
        x: (vx / videoWidth) * canvasDisplayW,
        y: (vy / videoHeight) * canvasDisplayH,
      };
    },
    [videoWidth, videoHeight]
  );

  // Vẽ overlay (bounding box + crosshair)
  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    // Resize canvas theo kích thước hiển thị
    const rect = overlay.getBoundingClientRect();
    if (overlay.width !== rect.width || overlay.height !== rect.height) {
      overlay.width = rect.width;
      overlay.height = rect.height;
    }

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Vẽ box đang kéo
    if (isDrawing && startPoint && currentPoint) {
      const s = videoToOverlayCoords(startPoint.x, startPoint.y);
      const c = videoToOverlayCoords(currentPoint.x, currentPoint.y);

      const x = Math.min(s.x, c.x);
      const y = Math.min(s.y, c.y);
      const w = Math.abs(c.x - s.x);
      const h = Math.abs(c.y - s.y);

      // Semi-transparent fill
      ctx.fillStyle = "rgba(94, 106, 210, 0.15)";
      ctx.fillRect(x, y, w, h);

      // Border
      ctx.strokeStyle = "#5E6AD2";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Corner handles
      const handleSize = 6;
      ctx.fillStyle = "#5E6AD2";
      const corners = [
        [x, y], [x + w, y], [x, y + h], [x + w, y + h]
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      }
    }

    // Vẽ ROI đã chọn
    if (currentROI && !isDrawing) {
      const topLeft = videoToOverlayCoords(currentROI.x, currentROI.y);
      const bottomRight = videoToOverlayCoords(
        currentROI.x + currentROI.width,
        currentROI.y + currentROI.height
      );

      const x = topLeft.x;
      const y = topLeft.y;
      const w = bottomRight.x - topLeft.x;
      const h = bottomRight.y - topLeft.y;

      // Fill
      ctx.fillStyle = "rgba(94, 106, 210, 0.1)";
      ctx.fillRect(x, y, w, h);

      // Border (solid)
      ctx.strokeStyle = "#5E6AD2";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Corner handles
      const handleSize = 7;
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#5E6AD2";
      ctx.lineWidth = 1.5;
      const corners = [
        [x, y], [x + w, y], [x, y + h], [x + w, y + h]
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      }

      // Crosshair ở tâm
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      const crossSize = 12;

      ctx.strokeStyle = "#F44336";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX - crossSize, centerY);
      ctx.lineTo(centerX + crossSize, centerY);
      ctx.moveTo(centerX, centerY - crossSize);
      ctx.lineTo(centerX, centerY + crossSize);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = "#F44336";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Dimension label
      ctx.fillStyle = "rgba(94, 106, 210, 0.9)";
      ctx.font = "10px Inter, system-ui, sans-serif";
      const label = `${Math.round(currentROI.width)}×${Math.round(currentROI.height)}`;
      const textMetrics = ctx.measureText(label);
      const labelX = x + w / 2 - textMetrics.width / 2;
      const labelY = y - 8;

      // Label background
      ctx.fillStyle = "rgba(94, 106, 210, 0.85)";
      const padding = 4;
      ctx.beginPath();
      ctx.roundRect(
        labelX - padding, labelY - 10 - padding,
        textMetrics.width + padding * 2, 14 + padding,
        3
      );
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(label, labelX, labelY);
    }
  }, [isDrawing, startPoint, currentPoint, currentROI, videoToOverlayCoords]);

  // Re-draw overlay mỗi khi state thay đổi
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Redraw khi window resize
  useEffect(() => {
    const handleResize = () => drawOverlay();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawOverlay]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive || !isLoaded) return;
      const point = mouseToVideoCoords(e);
      if (!point) return;

      setIsDrawing(true);
      setStartPoint(point);
      setCurrentPoint(point);
    },
    [isActive, isLoaded, mouseToVideoCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const point = mouseToVideoCoords(e);
      if (!point) return;
      setCurrentPoint(point);
    },
    [isDrawing, mouseToVideoCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPoint || !currentPoint) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    // Bỏ qua box quá nhỏ (< 10px)
    if (width >= 10 && height >= 10) {
      onROISelected({ x, y, width, height });
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [isDrawing, startPoint, currentPoint, onROISelected]);

  if (!isLoaded) return null;

  return (
    <canvas
      ref={overlayRef}
      className="roi-overlay"
      style={{
        cursor: isActive ? "crosshair" : "default",
        pointerEvents: isActive || currentROI ? "auto" : "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
