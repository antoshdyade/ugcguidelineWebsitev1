import type { SiteSettings } from '../types/cms';

export type AspectRatioPreset = '16:9' | '4:3' | '3:2' | '1:1' | 'original';

export interface AspectRatioOption {
  id: AspectRatioPreset;
  label: string;
  shortLabel: string;
  ratio: number | null;
  targetMaxEdge: number;
}

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '16:9', label: '16:9 Banner / Slide', shortLabel: '16:9', ratio: 16 / 9, targetMaxEdge: 1600 },
  { id: '4:3', label: '4:3 Gallery / Lab / Card', shortLabel: '4:3', ratio: 4 / 3, targetMaxEdge: 1200 },
  { id: '3:2', label: '3:2 Event / Campus', shortLabel: '3:2', ratio: 3 / 2, targetMaxEdge: 1200 },
  { id: '1:1', label: '1:1 Portrait / Logo', shortLabel: '1:1', ratio: 1, targetMaxEdge: 800 },
  { id: 'original', label: 'Original Ratio', shortLabel: 'Original', ratio: null, targetMaxEdge: 1600 },
];

export const DEFAULT_MAX_PHOTO_UPLOAD_MB = 2;
export const DEFAULT_MAX_DOCUMENT_UPLOAD_MB = 10;

export function getAspectOption(preset?: AspectRatioPreset): AspectRatioOption {
  return ASPECT_RATIO_OPTIONS.find((opt) => opt.id === preset) || ASPECT_RATIO_OPTIONS[1];
}

export function clampUploadLimitMb(
  value: unknown,
  fallback: number,
  minMb = 0.25,
  maxMb = 50,
): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(maxMb, Math.max(minMb, Math.round(num * 100) / 100));
}

export function getUploadSizeLimitMb(
  settings: Partial<Pick<SiteSettings, 'maxPhotoUploadMb' | 'maxDocumentUploadMb'>> | null | undefined,
  kind: 'photo' | 'document',
): number {
  if (kind === 'photo') {
    return clampUploadLimitMb(settings?.maxPhotoUploadMb, DEFAULT_MAX_PHOTO_UPLOAD_MB, 0.25, 25);
  }
  return clampUploadLimitMb(settings?.maxDocumentUploadMb, DEFAULT_MAX_DOCUMENT_UPLOAD_MB, 0.5, 50);
}

export function getUploadSizeLimitBytes(
  settings: Partial<Pick<SiteSettings, 'maxPhotoUploadMb' | 'maxDocumentUploadMb'>> | null | undefined,
  kind: 'photo' | 'document',
): number {
  return Math.round(getUploadSizeLimitMb(settings, kind) * 1024 * 1024);
}

export function isImageFileMeta(filename: string, mimeType?: string): boolean {
  const mime = (mimeType || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') {
    return true;
  }
  const ext = (filename || '').trim().toLowerCase().split('.').pop() || '';
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
}

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Computes an aspect-ratio-preserving crop rectangle inside [0, srcWidth] x [0, srcHeight].
 * At zoom = 1 and pan = (0, 0), selects the largest centered region matching targetRatio.
 * panX / panY are normalized offsets in [-1, 1].
 */
export function computeAutoCropRect(
  srcWidth: number,
  srcHeight: number,
  targetRatio: number | null,
  zoom = 1,
  panX = 0,
  panY = 0,
): CropRect {
  const safeW = Math.max(1, Math.round(srcWidth));
  const safeH = Math.max(1, Math.round(srcHeight));
  const safeZoom = Math.min(4, Math.max(1, Number.isFinite(zoom) ? zoom : 1));
  const normX = Math.min(1, Math.max(-1, Number.isFinite(panX) ? panX : 0));
  const normY = Math.min(1, Math.max(-1, Number.isFinite(panY) ? panY : 0));

  const effectiveRatio = targetRatio && targetRatio > 0 ? targetRatio : safeW / safeH;

  let baseW = safeW;
  let baseH = baseW / effectiveRatio;
  if (baseH > safeH) {
    baseH = safeH;
    baseW = baseH * effectiveRatio;
  }

  const sw = Math.max(1, Math.min(safeW, baseW / safeZoom));
  const sh = Math.max(1, Math.min(safeH, baseH / safeZoom));

  const maxOffsetX = Math.max(0, safeW - sw);
  const maxOffsetY = Math.max(0, safeH - sh);

  const sx = Math.max(0, Math.min(maxOffsetX, (maxOffsetX / 2) * (1 + normX)));
  const sy = Math.max(0, Math.min(maxOffsetY, (maxOffsetY / 2) * (1 + normY)));

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.max(1, Math.round(sw)),
    sh: Math.max(1, Math.round(sh)),
  };
}

/**
 * Computes bounded export dimensions while preserving exact crop aspect ratio.
 */
export function computeOutputDimensions(
  cropWidth: number,
  cropHeight: number,
  maxEdge = 1600,
): { width: number; height: number } {
  const w = Math.max(1, cropWidth);
  const h = Math.max(1, cropHeight);
  const cap = Math.max(64, maxEdge);
  const longest = Math.max(w, h);
  if (longest <= cap) {
    return { width: Math.round(w), height: Math.round(h) };
  }
  const scale = cap / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}
