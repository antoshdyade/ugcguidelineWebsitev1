import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Code2,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  RemoveFormatting,
  Table,
  Underline,
} from 'lucide-react';
import { validateUploadMeta } from '../lib/cmsLogic';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  uploadBinary?: (file: File) => Promise<string>;
  minHeight?: number;
}

export function RichTextEditor({
  label = 'Page Content Editor',
  value,
  onChange,
  uploadBinary,
  minHeight = 240,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [editorErr, setEditorErr] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'visual' && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p></p>';
    }
  }, [value, mode]);

  const syncFromVisual = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, arg?: string) => {
    if (mode !== 'visual') return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    syncFromVisual();
  };

  const insertHtml = (snippet: string) => {
    if (mode === 'html') {
      onChange(`${value}\n${snippet}`);
      return;
    }
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, snippet);
    syncFromVisual();
  };

  const handleInsertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadBinary) return;
    setEditorErr('');
    const check = validateUploadMeta(file.name, file.type || 'image/jpeg', file.size);
    if (!check.valid || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setEditorErr(check.reason || 'Only JPG, PNG, and WEBP images can be inserted.');
      return;
    }
    setUploadingImg(true);
    try {
      const url = await uploadBinary(file);
      insertHtml(`<p><img src="${url}" alt="${file.name.replace(/"/g, '')}" style="max-width:100%;border-radius:8px;" /></p>`);
    } catch (err) {
      setEditorErr((err as Error).message || 'Image upload failed.');
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-stone-700 dark:text-slate-300">
          {label}
        </label>
        <div className="inline-flex rounded-lg border border-stone-300 dark:border-slate-700 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 font-medium ${
              mode === 'visual'
                ? 'text-white'
                : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300'
            }`}
            style={mode === 'visual' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('html')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 font-medium border-l border-stone-300 dark:border-slate-700 ${
              mode === 'html'
                ? 'text-white'
                : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300'
            }`}
            style={mode === 'html' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>HTML Source</span>
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="rounded-lg border border-stone-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        <div className="px-2 py-1.5 bg-stone-50 dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 flex flex-wrap items-center gap-1">
          {mode === 'visual' && (
            <>
              <button type="button" title="Bold" onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Italic" onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Underline" onClick={() => exec('underline')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />
              <button type="button" title="Section Heading (H2)" onClick={() => exec('formatBlock', '<h2>')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Subheading (H3)" onClick={() => exec('formatBlock', '<h3>')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Heading3 className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Bullet List" onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <List className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Numbered List" onClick={() => exec('insertOrderedList')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Align Left" onClick={() => exec('justifyLeft')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Align Center" onClick={() => exec('justifyCenter')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Clear Formatting" onClick={() => exec('removeFormat')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />
            </>
          )}

          <button
            type="button"
            onClick={() =>
              insertHtml(
                '<table><thead><tr><th>Particulars</th><th>Details</th><th>Remarks</th></tr></thead><tbody><tr><td>Item 1</td><td>Value 1</td><td>Approved</td></tr></tbody></table><p></p>',
              )
            }
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-700"
          >
            <Table className="w-3 h-3" />
            <span>+ Table</span>
          </button>

          <button
            type="button"
            onClick={() => setLinkOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-700"
          >
            <Link2 className="w-3 h-3" />
            <span>+ Link / PDF</span>
          </button>

          {uploadBinary && (
            <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-700 cursor-pointer">
              <ImagePlus className="w-3 h-3" />
              <span>{uploadingImg ? 'Uploading...' : '+ Upload Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInsertImage}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {linkOpen && (
          <div className="p-2.5 bg-amber-50/70 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Link label (e.g. Download Notification)"
              className="px-2 py-1 rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex-1 min-w-[140px]"
            />
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://... or /uploads/file.pdf"
              className="px-2 py-1 rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex-1 min-w-[160px]"
            />
            <button
              type="button"
              onClick={() => {
                if (!linkUrl.trim()) return;
                const safeUrl = linkUrl.trim().replace(/"/g, '&quot;');
                const safeLabel = (linkText.trim() || linkUrl.trim()).replace(/</g, '&lt;');
                insertHtml(`<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a> `);
                setLinkText('');
                setLinkOpen(false);
              }}
              className="px-2.5 py-1 rounded text-white font-semibold"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Insert
            </button>
          </div>
        )}

        {editorErr && (
          <div className="px-3 py-1.5 text-xs bg-rose-50 text-rose-700 border-b border-rose-200">
            {editorErr}
          </div>
        )}

        {mode === 'visual' ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncFromVisual}
            onBlur={syncFromVisual}
            style={{ minHeight: `${minHeight}px` }}
            className="p-3.5 text-sm prose-academic max-w-none focus:outline-none bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100 overflow-y-auto max-h-[420px]"
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight: `${minHeight}px` }}
            className="w-full p-3 text-xs font-mono bg-slate-950 text-emerald-300 focus:outline-none resize-y"
          />
        )}
      </div>
    </div>
  );
}
