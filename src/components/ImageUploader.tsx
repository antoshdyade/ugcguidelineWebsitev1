import React, { useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { validateUploadMeta } from '../lib/cmsLogic';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadBinary: (file: File) => Promise<string>;
  placeholder?: string;
}

export function ImageUploader({
  label,
  value,
  onChange,
  uploadBinary,
  placeholder = '/uploads/...',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const check = validateUploadMeta(file.name, file.type || 'image/jpeg', file.size);
    if (!check.valid) {
      setError(check.reason || 'Unsupported image file.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPG, PNG, or WEBP image.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBinary(file);
      onChange(url);
    } catch (err) {
      setError((err as Error).message || 'Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
        {label}
      </label>
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
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer shrink-0 transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
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
    </div>
  );
}
