import { useRef, useState, useEffect, useCallback } from "react";

export interface DrawingData {
  id: string;
  dataUrl: string;
  createdAt: number;
}

interface CanvasDrawingProps {
  initialData?: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

type Tool = "pen" | "eraser";

const COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

const BRUSH_SIZES = [2, 4, 8, 12, 20];

export default function CanvasDrawing({
  initialData,
  onSave,
  onCancel,
  width = 600,
  height = 400,
}: CanvasDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const saveToHistory = useCallback(() => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);

    // Limit history to 50 steps
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [getContext, history, historyIndex]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    // Set white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load initial data if provided
    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = initialData;
    } else {
      saveToHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = getContext();
    if (!ctx) return;

    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = getContext();
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = getContext();
      if (ctx) {
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";
      }
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;

    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;

    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleClear = () => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="canvas-drawing">
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button
            className={`tool-btn ${tool === "pen" ? "active" : ""}`}
            onClick={() => setTool("pen")}
            title="Pen"
          >
            ✏️
          </button>
          <button
            className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            🧹
          </button>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">Color:</span>
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-btn ${color === c ? "active" : ""}`}
                style={{
                  backgroundColor: c,
                  border: c === "#ffffff" ? "1px solid #ccc" : "none",
                }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">Size:</span>
          <div className="size-picker">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                className={`size-btn ${brushSize === size ? "active" : ""}`}
                onClick={() => setBrushSize(size)}
                title={`${size}px`}
              >
                <span
                  className="size-preview"
                  style={{
                    width: Math.min(size, 16),
                    height: Math.min(size, 16),
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <button
            className="tool-btn"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            className="tool-btn"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪️
          </button>
          <button className="tool-btn" onClick={handleClear} title="Clear">
            🗑️
          </button>
        </div>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            cursor: tool === "eraser" ? "cell" : "crosshair",
            touchAction: "none",
          }}
        />
      </div>

      <div className="canvas-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Drawing
        </button>
      </div>
    </div>
  );
}
