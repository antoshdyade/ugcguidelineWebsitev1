import React, { useState } from 'react';
import { Crop, Image as ImageIcon, Upload } from 'lucide-react';
import { validateUploadMeta } from '../lib/cmsLogic';
import {
  DEFAULT_MAX_PHOTO_UPLOAD_MB,
  type AspectRatioPreset,
} from '../lib/imageCrop';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadBinary: (file: File) => Promise<string>;
  placeholder?: string;
  aspectRatio?: AspectRatioPreset;
  maxPhotoMb?: number;
  autoCropEnabled?: boolean;
}

export function ImageUploader({
  label,
  value,
  onChange,
  uploadBinary,
  placeholder = '/uploads/...',
  aspectRatio = '4:3',
  maxPhotoMb = DEFAULT_MAX_PHOTO_UPLOAD_MB,
  autoCropEnabled = true,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  const maxBytes = Math.round(Math.max(0.25, maxPhotoMb) * 1024 * 1024);

  const performUpload = async (fileToUpload: File) => {
    setError('');
    const check = validateUploadMeta(
      fileToUpload.name,
      fileToUpload.type || 'image/jpeg',
      fileToUpload.size,
      maxBytes,
    );
    if (!check.valid) {
      setError(check.reason || 'Image blocked by upload size/security limit.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBinary(fileToUpload);
      onChange(url);
    } catch (err) {
      setError((err as Error).message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPG, PNG, or WEBP image.');
      return;
    }

    if (autoCropEnabled) {
      // Security filename/MIME check prior to cropper; size will be enforced post-crop as well
      const metaCheck = validateUploadMeta(file.name, file.type, 1024, maxBytes);
      if (!metaCheck.valid) {
        setError(metaCheck.reason || 'Unsupported image file.');
        return;
      }
      setPendingCropFile(file);
      return;
    }

    await performUpload(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
          {label}
        </label>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 dark:text-slate-400">
          {autoCropEnabled && <Crop className="w-3 h-3 text-amber-700 dark:text-amber-400" />}
          <span>
            {autoCropEnabled ? `Auto-Crop ${aspectRatio} · ` : ''}Max {maxPhotoMb} MB
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-stone-400" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <label
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer shrink-0 transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : autoCropEnabled ? 'Upload & Crop' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            <input
              type="text"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              aria-label={`${label} URL`}
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      </div>

      {pendingCropFile && (
        <ImageCropModal
          file={pendingCropFile}
          initialAspect={aspectRatio}
          maxPhotoMb={maxPhotoMb}
          title={`Crop ${label}`}
          onCancel={() => setPendingCropFile(null)}
          onConfirm={async (cropped) => {
            setPendingCropFile(null);
            await performUpload(cropped);
          }}
        />
      )}
    </div>
  );
}
