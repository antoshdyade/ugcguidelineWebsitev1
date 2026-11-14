import React, { useEffect, useRef, useState } from 'react';
import { Crop, RotateCcw, Upload, X, ZoomIn } from 'lucide-react';
import { formatBytes } from '../lib/cmsLogic';
import {
  ASPECT_RATIO_OPTIONS,
  computeAutoCropRect,
  computeOutputDimensions,
  DEFAULT_MAX_PHOTO_UPLOAD_MB,
  getAspectOption,
  type AspectRatioPreset,
} from '../lib/imageCrop';

interface ImageCropModalProps {
  file: File | null;
  initialAspect?: AspectRatioPreset;
  maxPhotoMb?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export function ImageCropModal({
  file,
  initialAspect = '4:3',
  maxPhotoMb = DEFAULT_MAX_PHOTO_UPLOAD_MB,
  title = 'Auto-Crop & Maintain Aspect Ratio',
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [imgMeta, setImgMeta] = useState<{ width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    setAspectPreset(initialAspect);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setError('');
  }, [file, initialAspect]);

  useEffect(() => {
    if (!file) {
      imgRef.current = null;
      setImgMeta(null);
      return;
    }
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgMeta({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    };
    img.onerror = () => {
      setError('Could not decode selected image.');
    };
    img.src = objUrl;
    return () => {
      URL.revokeObjectURL(objUrl);
    };
  }, [file]);

  const activeOpt = getAspectOption(aspectPreset);
  const cropRect = imgMeta
    ? computeAutoCropRect(imgMeta.width, imgMeta.height, activeOpt.ratio, zoom, panX, panY)
    : null;
  const outputDims = cropRect
    ? computeOutputDimensions(cropRect.sw, cropRect.sh, activeOpt.targetMaxEdge)
    : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !cropRect || !imgMeta) return;

    const previewMaxW = 540;
    const previewMaxH = 320;
    const targetRatio = cropRect.sw / cropRect.sh;
    let drawW = previewMaxW;
    let drawH = drawW / targetRatio;
    if (drawH > previewMaxH) {
      drawH = previewMaxH;
      drawW = drawH * targetRatio;
    }
    canvas.width = Math.max(120, Math.round(drawW));
    canvas.height = Math.max(90, Math.round(drawH));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      cropRect.sx,
      cropRect.sy,
      cropRect.sw,
      cropRect.sh,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // Subtle rule-of-thirds guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i += 1) {
      const vx = (canvas.width / 3) * i;
      const hy = (canvas.height / 3) * i;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx, canvas.height);
      ctx.moveTo(0, hy);
      ctx.lineTo(canvas.width, hy);
      ctx.stroke();
    }
  }, [imgMeta, cropRect]);

  if (!file) return null;

  const maxBytes = Math.round(Math.max(0.25, maxPhotoMb) * 1024 * 1024);

  const handleApplyCrop = async () => {
    const img = imgRef.current;
    if (!img || !cropRect || !outputDims) return;
    setError('');
    setProcessing(true);
    try {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outputDims.width;
      outCanvas.height = outputDims.height;
      const ctx = outCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        cropRect.sx,
        cropRect.sy,
        cropRect.sw,
        cropRect.sh,
        0,
        0,
        outputDims.width,
        outputDims.height,
      );

      const sourceMime =
        file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
      let chosenMime = sourceMime;
      let blob = await canvasToBlob(outCanvas, chosenMime, 0.9);

      if (blob && blob.size > maxBytes) {
        const fallbackMime = sourceMime === 'image/png' ? 'image/webp' : sourceMime;
        for (const q of [0.85, 0.75, 0.65, 0.55]) {
          const candidate = await canvasToBlob(outCanvas, fallbackMime, q);
          if (candidate) {
            blob = candidate;
            chosenMime = fallbackMime;
            if (candidate.size <= maxBytes) break;
          }
        }
      }

      if (!blob) throw new Error('Could not export cropped image.');
      if (blob.size > maxBytes) {
        setError(
          `Cropped photo (${formatBytes(blob.size)}) exceeds the configured Max Photo Size of ${maxPhotoMb} MB. Increase zoom slightly or raise the limit in Site Settings.`,
        );
        return;
      }

      const ext =
        chosenMime === 'image/png' ? 'png' : chosenMime === 'image/webp' ? 'webp' : 'jpg';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'cropped-photo';
      const outFile = new File([blob], `${baseName}.${ext}`, { type: chosenMime });
      onConfirm(outFile);
    } catch (err) {
      setError((err as Error).message || 'Image crop failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/70">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100">{title}</h3>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Auto-centered aspect-ratio crop · Max Photo Limit: {maxPhotoMb} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close crop dialog"
            className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500 mr-1">Aspect Ratio:</span>
            {ASPECT_RATIO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setAspectPreset(opt.id);
                  setPanX(0);
                  setPanY(0);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                  aspectPreset === opt.id
                    ? 'text-white border-transparent'
                    : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                }`}
                style={aspectPreset === opt.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div
            className="rounded-xl bg-slate-950 border border-stone-200 dark:border-slate-700 p-3 flex flex-col items-center justify-center min-h-[240px] select-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.lastX;
              const dy = e.clientY - dragRef.current.lastY;
              dragRef.current.lastX = e.clientX;
              dragRef.current.lastY = e.clientY;
              setPanX((p) => Math.max(-1, Math.min(1, p - dx / 120)));
              setPanY((p) => Math.max(-1, Math.min(1, p - dy / 120)));
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
            onPointerLeave={() => {
              dragRef.current.active = false;
            }}
          >
            <canvas ref={canvasRef} className="rounded-lg shadow-lg max-w-full" />
            <p className="text-[11px] text-slate-400 mt-2">
              Drag preview to adjust framing ·{' '}
              {outputDims ? `Output: ${outputDims.width} × ${outputDims.height} px (${activeOpt.shortLabel})` : 'Loading preview...'}
              {' · '}Source: {formatBytes(file.size)}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold flex-1 min-w-[200px]">
              <ZoomIn className="w-4 h-4 text-stone-500" />
              <span>Zoom ({zoom.toFixed(2)}x)</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-amber-700"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-Center</span>
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processing || !outputDims}
              onClick={handleApplyCrop}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{processing ? 'Cropping & Uploading...' : 'Apply Auto-Crop & Upload'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
