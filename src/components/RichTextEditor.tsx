import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Blocks,
  Code2,
  Copy,
  Eye,
  GripVertical,
  Highlighter,
  ImagePlus,
  Indent,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Outdent,
  Palette,
  Plus,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react';
import { validateUploadMeta } from '../lib/cmsLogic';
import { DEFAULT_MAX_PHOTO_UPLOAD_MB } from '../lib/imageCrop';
import { ImageCropModal } from './ImageCropModal';
import {
  buildStyledTableHtml,
  EDITOR_COMPONENT_BLOCKS,
  FONT_FAMILY_OPTIONS,
  HIGHLIGHT_COLOR_SWATCHES,
  swapTableThemeInHtml,
  TABLE_THEMES,
  TEXT_COLOR_SWATCHES,
  type EditorComponentBlock,
  type TableThemeId,
} from '../lib/editorBlocks';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  uploadBinary?: (file: File) => Promise<string>;
  minHeight?: number;
  maxPhotoMb?: number;
  autoCropEnabled?: boolean;
}

export function RichTextEditor({
  label = 'Page Content Editor',
  value,
  onChange,
  uploadBinary,
  minHeight = 320,
  maxPhotoMb = DEFAULT_MAX_PHOTO_UPLOAD_MB,
  autoCropEnabled = true,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [showBlocks, setShowBlocks] = useState(true);
  const [blockCategory, setBlockCategory] = useState<string>('All');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(4);
  const [tableCols, setTableCols] = useState(3);
  const [tableTheme, setTableTheme] = useState<TableThemeId>('navy');
  const [tableHeader, setTableHeader] = useState(true);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const [customTextColor, setCustomTextColor] = useState('#0F294A');
  const [customBgColor, setCustomBgColor] = useState('#FEF3C7');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedBlockEl, setSelectedBlockEl] = useState<HTMLElement | null>(null);
  const [activeTableEl, setActiveTableEl] = useState<HTMLTableElement | null>(null);
  const [activeCellEl, setActiveCellEl] = useState<HTMLTableCellElement | null>(null);
  const [activeImgEl, setActiveImgEl] = useState<HTMLImageElement | null>(null);
  const [editorErr, setEditorErr] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'visual' && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p></p>';
    }
  }, [value, mode]);

  const syncFromVisual = () => {
    if (editorRef.current) {
      // Remove temporary editor selection class before storing clean HTML
      const cloned = editorRef.current.cloneNode(true) as HTMLDivElement;
      cloned.querySelectorAll('.cms-selected-block').forEach((el) => {
        el.classList.remove('cms-selected-block');
      });
      onChange(cloned.innerHTML);
    }
  };

  const inspectSelectionContext = (targetNode?: Node | null) => {
    if (!editorRef.current) return;
    let node: Node | null = targetNode || null;
    if (!node) {
      const sel = window.getSelection();
      node = sel && sel.rangeCount > 0 ? sel.anchorNode : null;
    }
    const el = node instanceof HTMLElement ? node : node?.parentElement || null;

    editorRef.current.querySelectorAll('.cms-selected-block').forEach((item) => {
      item.classList.remove('cms-selected-block');
    });

    const blockEl = el?.closest('[data-block]') as HTMLElement | null;
    if (blockEl && editorRef.current.contains(blockEl)) {
      blockEl.classList.add('cms-selected-block');
      setSelectedBlockEl(blockEl);
    } else {
      setSelectedBlockEl(null);
    }

    const cellEl = el?.closest('td, th') as HTMLTableCellElement | null;
    const tableEl = el?.closest('table') as HTMLTableElement | null;
    if (tableEl && editorRef.current.contains(tableEl)) {
      setActiveTableEl(tableEl);
      setActiveCellEl(cellEl);
    } else {
      setActiveTableEl(null);
      setActiveCellEl(null);
    }

    if (el instanceof HTMLImageElement && editorRef.current.contains(el)) {
      setActiveImgEl(el);
    } else {
      setActiveImgEl(null);
    }
  };

  const exec = (command: string, arg?: string) => {
    if (mode !== 'visual') return;
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, arg);
    syncFromVisual();
  };

  const applyInlineStyle = (styleProp: 'fontSize' | 'fontFamily' | 'color' | 'backgroundColor', val: string) => {
    if (mode !== 'visual' || !editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      if (styleProp === 'color') exec('foreColor', val);
      if (styleProp === 'backgroundColor') exec('hiliteColor', val);
      return;
    }
    const span = document.createElement('span');
    span.style[styleProp] = val;
    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      sel.removeAllRanges();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      sel.addRange(nextRange);
    } catch {
      if (styleProp === 'color') exec('foreColor', val);
      if (styleProp === 'backgroundColor') exec('hiliteColor', val);
    }
    syncFromVisual();
  };

  const insertHtml = (snippet: string) => {
    if (mode === 'html') {
      onChange(`${value}\n${snippet}`);
      return;
    }
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      document.execCommand('insertHTML', false, snippet);
    } else {
      editorRef.current.insertAdjacentHTML('beforeend', snippet);
    }
    syncFromVisual();
  };

  const handleDropOnCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    const blockId = e.dataTransfer.getData('application/x-cms-block-id');
    const rawHtml = e.dataTransfer.getData('text/html');
    if (!blockId && !rawHtml) return;
    e.preventDefault();
    setIsDragOver(false);

    const block = EDITOR_COMPONENT_BLOCKS.find((b) => b.id === blockId);
    const htmlToInsert = block ? block.html : rawHtml;
    if (!htmlToInsert || !editorRef.current) return;

    // Place caret at drop coordinates when supported, else append cleanly
    const docAny = document as unknown as {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    const sel = window.getSelection();
    if (docAny.caretRangeFromPoint) {
      const dropRange = docAny.caretRangeFromPoint(e.clientX, e.clientY);
      if (dropRange && editorRef.current.contains(dropRange.startContainer) && sel) {
        sel.removeAllRanges();
        sel.addRange(dropRange);
      }
    } else if (docAny.caretPositionFromPoint) {
      const pos = docAny.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos && editorRef.current.contains(pos.offsetNode) && sel) {
        const range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    insertHtml(htmlToInsert);
  };

  const uploadAndInsertImage = async (fileToUpload: File) => {
    if (!uploadBinary) return;
    setEditorErr('');
    const maxBytes = Math.round(Math.max(0.25, maxPhotoMb) * 1024 * 1024);
    const check = validateUploadMeta(
      fileToUpload.name,
      fileToUpload.type || 'image/jpeg',
      fileToUpload.size,
      maxBytes,
    );
    if (!check.valid || !['image/jpeg', 'image/png', 'image/webp'].includes(fileToUpload.type)) {
      setEditorErr(check.reason || 'Only JPG, PNG, and WEBP images can be inserted.');
      return;
    }
    setUploadingImg(true);
    try {
      const url = await uploadBinary(fileToUpload);
      insertHtml(
        `<figure class="cms-block" data-block="image" style="margin:1rem 0;"><img src="${url}" alt="${fileToUpload.name.replace(/"/g, '')}" style="max-width:100%;border-radius:10px;" /><figcaption style="font-size:0.8rem;color:#57534E;margin-top:0.35rem;">${fileToUpload.name.replace(/</g, '&lt;')}</figcaption></figure><p></p>`,
      );
    } catch (err) {
      setEditorErr((err as Error).message || 'Image upload failed.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleInsertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadBinary) return;
    setEditorErr('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setEditorErr('Only JPG, PNG, and WEBP images can be inserted.');
      return;
    }
    if (autoCropEnabled) {
      setPendingCropFile(file);
      return;
    }
    await uploadAndInsertImage(file);
  };

  const modifyActiveTable = (action: 'add-row' | 'add-col' | 'del-row' | 'del-col', nextTheme?: TableThemeId) => {
    if (!activeTableEl || !editorRef.current) return;
    if (nextTheme) {
      const updated = swapTableThemeInHtml(activeTableEl.outerHTML, nextTheme);
      const wrap = document.createElement('div');
      wrap.innerHTML = updated;
      const newTable = wrap.querySelector('table');
      if (newTable && activeTableEl.parentNode) {
        activeTableEl.parentNode.replaceChild(newTable, activeTableEl);
        setActiveTableEl(newTable);
      }
      syncFromVisual();
      return;
    }

    const row = activeCellEl?.closest('tr') as HTMLTableRowElement | null;
    if (action === 'add-row') {
      const targetBody = activeTableEl.tBodies[0] || activeTableEl;
      const colCount = activeTableEl.rows[0]?.cells.length || 3;
      const newRow = targetBody.insertRow(row && row.parentElement === targetBody ? row.sectionRowIndex + 1 : -1);
      for (let i = 0; i < colCount; i += 1) {
        const td = newRow.insertCell();
        td.textContent = `Cell ${i + 1}`;
      }
    } else if (action === 'del-row' && row && activeTableEl.rows.length > 1) {
      row.remove();
      setActiveCellEl(null);
    } else if (action === 'add-col') {
      const insertIdx = activeCellEl ? activeCellEl.cellIndex + 1 : -1;
      Array.from(activeTableEl.rows).forEach((tr) => {
        const isHeaderRow = tr.parentElement?.tagName === 'THEAD';
        if (isHeaderRow) {
          const th = document.createElement('th');
          th.textContent = 'New Column';
          if (insertIdx >= 0 && insertIdx < tr.cells.length) {
            tr.insertBefore(th, tr.cells[insertIdx]);
          } else {
            tr.appendChild(th);
          }
        } else {
          const td = tr.insertCell(insertIdx >= 0 && insertIdx <= tr.cells.length ? insertIdx : -1);
          td.textContent = 'Value';
        }
      });
    } else if (action === 'del-col' && activeCellEl && (activeTableEl.rows[0]?.cells.length || 0) > 1) {
      const colIdx = activeCellEl.cellIndex;
      Array.from(activeTableEl.rows).forEach((tr) => {
        if (tr.cells[colIdx]) tr.cells[colIdx].remove();
      });
      setActiveCellEl(null);
    }
    syncFromVisual();
  };

  const handleBlockAction = (act: 'up' | 'down' | 'duplicate' | 'remove') => {
    if (!selectedBlockEl || !selectedBlockEl.parentNode) return;
    if (act === 'up' && selectedBlockEl.previousElementSibling) {
      selectedBlockEl.parentNode.insertBefore(selectedBlockEl, selectedBlockEl.previousElementSibling);
    } else if (act === 'down' && selectedBlockEl.nextElementSibling) {
      selectedBlockEl.parentNode.insertBefore(selectedBlockEl.nextElementSibling, selectedBlockEl);
    } else if (act === 'duplicate') {
      const clone = selectedBlockEl.cloneNode(true) as HTMLElement;
      clone.classList.remove('cms-selected-block');
      selectedBlockEl.parentNode.insertBefore(clone, selectedBlockEl.nextSibling);
    } else if (act === 'remove') {
      selectedBlockEl.remove();
      setSelectedBlockEl(null);
    }
    syncFromVisual();
  };

  const filteredBlocks =
    blockCategory === 'All'
      ? EDITOR_COMPONENT_BLOCKS
      : EDITOR_COMPONENT_BLOCKS.filter((b) => b.category === blockCategory);

  return (
    <div className="space-y-2">
      {/* Header Row: Label + Drag-Drop Blocks Toggle + Visual/HTML Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-stone-700 dark:text-slate-300">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBlocks((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              showBlocks
                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300'
            }`}
          >
            <Blocks className="w-3.5 h-3.5" />
            <span>{showBlocks ? 'Hide Component Blocks' : 'Drag & Drop Blocks'}</span>
          </button>

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
              <span>Visual Word Editor</span>
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
              <span>HTML &amp; CSS Source</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor Container */}
      <div className="rounded-xl border border-stone-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        {/* Word-Processor Formatting Toolbar */}
        <div className="px-2.5 py-2 bg-stone-50 dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 flex flex-wrap items-center gap-1">
          {mode === 'visual' && (
            <>
              <button type="button" title="Undo" aria-label="Undo" onClick={() => exec('undo')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Redo" aria-label="Redo" onClick={() => exec('redo')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />

              {/* Block Style Select */}
              <select
                aria-label="Text block format"
                defaultValue="p"
                onChange={(e) => {
                  exec('formatBlock', `<${e.target.value}>`);
                  e.target.value = 'p';
                }}
                className="px-2 py-1 text-[11px] font-medium rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              >
                <option value="p">Paragraph</option>
                <option value="h1">Title (H1)</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Subheading 4</option>
                <option value="blockquote">Quote Box</option>
              </select>

              {/* Font Family Select */}
              <select
                aria-label="Font family"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyInlineStyle('fontFamily', e.target.value);
                  e.target.value = '';
                }}
                className="px-2 py-1 text-[11px] font-medium rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 max-w-[130px]"
              >
                <option value="">Font Family...</option>
                {FONT_FAMILY_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Font Size Select */}
              <select
                aria-label="Font size"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyInlineStyle('fontSize', e.target.value);
                  e.target.value = '';
                }}
                className="px-2 py-1 text-[11px] font-medium rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              >
                <option value="">Size...</option>
                <option value="12px">12px Small</option>
                <option value="14px">14px Normal</option>
                <option value="16px">16px Medium</option>
                <option value="20px">20px Large</option>
                <option value="24px">24px Title</option>
                <option value="30px">30px Banner</option>
              </select>

              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />

              <button type="button" title="Bold" aria-label="Bold" onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Italic" aria-label="Italic" onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Underline" aria-label="Underline" onClick={() => exec('underline')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Strikethrough" aria-label="Strikethrough" onClick={() => exec('strikeThrough')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Superscript" aria-label="Superscript" onClick={() => exec('superscript')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Superscript className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Subscript" aria-label="Subscript" onClick={() => exec('subscript')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Subscript className="w-3.5 h-3.5" />
              </button>

              {/* Text Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  title="Text Color"
                  aria-label="Text Color"
                  onClick={() => {
                    setTextColorOpen((v) => !v);
                    setBgColorOpen(false);
                    setTableOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded hover:bg-stone-200 dark:hover:bg-slate-700 text-[11px] font-semibold"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span className="w-2.5 h-2.5 rounded-sm border border-stone-400" style={{ backgroundColor: customTextColor }} />
                </button>
                {textColorOpen && (
                  <div className="absolute left-0 top-full mt-1 z-30 w-52 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg space-y-2">
                    <p className="text-[11px] font-bold text-stone-600 dark:text-slate-300">Text Color</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {TEXT_COLOR_SWATCHES.map((sw) => (
                        <button
                          key={sw.value}
                          type="button"
                          title={sw.label}
                          onClick={() => {
                            setCustomTextColor(sw.value);
                            applyInlineStyle('color', sw.value);
                            setTextColorOpen(false);
                          }}
                          className="w-7 h-7 rounded border border-stone-300"
                          style={{ backgroundColor: sw.value }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-stone-200 dark:border-slate-700 text-[11px]">
                      <span>Custom:</span>
                      <input
                        type="color"
                        value={customTextColor}
                        onChange={(e) => {
                          setCustomTextColor(e.target.value);
                          applyInlineStyle('color', e.target.value);
                        }}
                        className="w-7 h-6 p-0 border-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Background Highlight Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  title="Text Highlight Color"
                  aria-label="Text Highlight Color"
                  onClick={() => {
                    setBgColorOpen((v) => !v);
                    setTextColorOpen(false);
                    setTableOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded hover:bg-stone-200 dark:hover:bg-slate-700 text-[11px] font-semibold"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span className="w-2.5 h-2.5 rounded-sm border border-stone-400" style={{ backgroundColor: customBgColor }} />
                </button>
                {bgColorOpen && (
                  <div className="absolute left-0 top-full mt-1 z-30 w-52 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg space-y-2">
                    <p className="text-[11px] font-bold text-stone-600 dark:text-slate-300">Highlight / Background</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {HIGHLIGHT_COLOR_SWATCHES.map((sw) => (
                        <button
                          key={sw.label}
                          type="button"
                          title={sw.label}
                          onClick={() => {
                            setCustomBgColor(sw.value === 'transparent' ? '#FFFFFF' : sw.value);
                            applyInlineStyle('backgroundColor', sw.value);
                            setBgColorOpen(false);
                          }}
                          className="w-8 h-7 rounded border border-stone-300 text-[10px]"
                          style={{ backgroundColor: sw.value }}
                        >
                          {sw.value === 'transparent' ? 'Ø' : ''}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-stone-200 dark:border-slate-700 text-[11px]">
                      <span>Custom:</span>
                      <input
                        type="color"
                        value={customBgColor}
                        onChange={(e) => {
                          setCustomBgColor(e.target.value);
                          applyInlineStyle('backgroundColor', e.target.value);
                        }}
                        className="w-7 h-6 p-0 border-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />

              <button type="button" title="Bullet List" aria-label="Bullet List" onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <List className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Numbered List" aria-label="Numbered List" onClick={() => exec('insertOrderedList')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Indent" aria-label="Indent" onClick={() => exec('indent')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Indent className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Outdent" aria-label="Outdent" onClick={() => exec('outdent')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Outdent className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />

              <button type="button" title="Align Left" aria-label="Align Left" onClick={() => exec('justifyLeft')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Align Center" aria-label="Align Center" onClick={() => exec('justifyCenter')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Align Right" aria-label="Align Right" onClick={() => exec('justifyRight')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Justify" aria-label="Justify" onClick={() => exec('justifyFull')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Insert Horizontal Line" aria-label="Insert Divider" onClick={() => insertHtml('<hr /><p></p>')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button type="button" title="Clear Formatting" aria-label="Clear Formatting" onClick={() => exec('removeFormat')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700">
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-stone-300 dark:bg-slate-600 mx-0.5" />
            </>
          )}

          {/* Table Designer Trigger */}
          <button
            type="button"
            onClick={() => {
              setTableOpen((v) => !v);
              setLinkOpen(false);
              setTextColorOpen(false);
              setBgColorOpen(false);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-700"
          >
            <Table className="w-3 h-3" />
            <span>+ Table Designer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLinkOpen((v) => !v);
              setTableOpen(false);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-700"
          >
            <Link2 className="w-3 h-3" />
            <span>+ Link / PDF</span>
          </button>

          {uploadBinary && (
            <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-700 cursor-pointer">
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

        {/* Table Designer Popover Bar */}
        {tableOpen && (
          <div className="p-3 bg-sky-50/70 dark:bg-slate-800/90 border-b border-stone-200 dark:border-slate-700 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-stone-800 dark:text-slate-100">Styled Table Designer</strong>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1">
                  Rows:
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Number(e.target.value) || 3)}
                    className="w-14 px-2 py-1 rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  Columns:
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Number(e.target.value) || 3)}
                    className="w-14 px-2 py-1 rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={tableHeader}
                    onChange={(e) => setTableHeader(e.target.checked)}
                  />
                  <span>Header Row</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-stone-600 dark:text-slate-300">Table Design Theme:</span>
              {TABLE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setTableTheme(theme.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${
                    tableTheme === theme.id
                      ? 'ring-2 ring-amber-500 border-amber-600'
                      : 'border-stone-300 dark:border-slate-600'
                  }`}
                  style={{ backgroundColor: theme.previewBg, color: theme.previewText }}
                >
                  <span>{theme.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  insertHtml(buildStyledTableHtml(tableRows, tableCols, tableTheme, tableHeader));
                  setTableOpen(false);
                }}
                className="ml-auto px-3 py-1.5 rounded-md text-white font-semibold"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Insert Designed Table
              </button>
            </div>
          </div>
        )}

        {/* Link / Button Insert Bar */}
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
              Insert Text Link
            </button>
            <button
              type="button"
              onClick={() => {
                if (!linkUrl.trim()) return;
                const safeUrl = linkUrl.trim().replace(/"/g, '&quot;');
                const safeLabel = (linkText.trim() || 'Open Resource').replace(/</g, '&lt;');
                insertHtml(`<a class="cms-btn cms-btn-navy" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a> `);
                setLinkText('');
                setLinkOpen(false);
              }}
              className="px-2.5 py-1 rounded bg-amber-700 text-white font-semibold"
            >
              Insert Styled Button
            </button>
          </div>
        )}

        {/* Contextual Controls when clicking inside a Block, Table, or Image */}
        {mode === 'visual' && (selectedBlockEl || activeTableEl || activeImgEl) && (
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-[11px]">
            {selectedBlockEl && (
              <>
                <span className="font-bold text-amber-900 dark:text-amber-300">Selected Block:</span>
                <button
                  type="button"
                  onClick={() => handleBlockAction('up')}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600"
                >
                  <ArrowUp className="w-3 h-3" /> Move Up
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockAction('down')}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600"
                >
                  <ArrowDown className="w-3 h-3" /> Move Down
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockAction('duplicate')}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockAction('remove')}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200"
                >
                  <Trash2 className="w-3 h-3" /> Remove Block
                </button>
              </>
            )}

            {activeTableEl && (
              <>
                <span className="font-bold text-sky-900 dark:text-sky-300 ml-1">Table Tools:</span>
                <button type="button" onClick={() => modifyActiveTable('add-row')} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600">
                  + Row
                </button>
                <button type="button" onClick={() => modifyActiveTable('add-col')} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600">
                  + Column
                </button>
                <button type="button" onClick={() => modifyActiveTable('del-row')} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600">
                  - Row
                </button>
                <button type="button" onClick={() => modifyActiveTable('del-col')} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600">
                  - Col
                </button>
                <select
                  aria-label="Change Table Theme"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) modifyActiveTable('add-row', e.target.value as TableThemeId);
                    e.target.value = '';
                  }}
                  className="px-2 py-0.5 rounded border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                >
                  <option value="">Switch Table Color...</option>
                  {TABLE_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {activeImgEl && (
              <>
                <span className="font-bold text-stone-700 dark:text-slate-300 ml-1">Image Width:</span>
                {['25%', '50%', '75%', '100%'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      activeImgEl.style.width = w;
                      syncFromVisual();
                    }}
                    className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600"
                  >
                    {w}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {editorErr && (
          <div className="px-3 py-1.5 text-xs bg-rose-50 text-rose-700 border-b border-rose-200">
            {editorErr}
          </div>
        )}

        {/* Top Graphical Block Palette (Full-width shelf so titles never truncate and canvas stays wide) */}
        {showBlocks && (
          <aside className="border-b border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950/60 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                Drag or Click Graphical HTML/CSS Blocks to Insert
              </p>
              <div className="flex flex-wrap gap-1">
                {['All', 'Callouts & Banners', 'Layouts', 'Academic & UGC', 'Interactive'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setBlockCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      blockCategory === cat
                        ? 'bg-slate-900 text-white dark:bg-amber-600'
                        : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
              {filteredBlocks.map((block: EditorComponentBlock) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-cms-block-id', block.id);
                    e.dataTransfer.setData('text/html', block.html);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="group p-2 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: block.accentColor }}
                        />
                        <p className="text-xs font-semibold text-stone-900 dark:text-white leading-tight">
                          {block.title}
                        </p>
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {block.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    title={`Insert ${block.title}`}
                    onClick={() => insertHtml(block.html)}
                    className="shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        <div>
          <div>
            {mode === 'visual' ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromVisual}
                onBlur={syncFromVisual}
                onMouseUp={(e) => inspectSelectionContext(e.target as Node)}
                onKeyUp={() => inspectSelectionContext()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDropOnCanvas}
                style={{ minHeight: `${minHeight}px` }}
                className={`p-4 text-sm cms-prose cms-editor-canvas max-w-none focus:outline-none bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100 overflow-y-auto max-h-[500px] transition-colors ${
                  isDragOver ? 'ring-2 ring-inset ring-amber-500 bg-amber-50/30 dark:bg-amber-950/20' : ''
                }`}
              />
            ) : (
              <textarea
                aria-label="HTML and CSS Source Code"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                style={{ minHeight: `${minHeight}px` }}
                className="w-full h-full p-3.5 text-xs font-mono bg-slate-950 text-emerald-300 focus:outline-none resize-y min-h-[380px]"
              />
            )}
          </div>
        </div>
      </div>

      {pendingCropFile && (
        <ImageCropModal
          file={pendingCropFile}
          initialAspect="4:3"
          maxPhotoMb={maxPhotoMb}
          title="Auto-Crop Inline Editor Photo"
          onCancel={() => setPendingCropFile(null)}
          onConfirm={async (cropped) => {
            setPendingCropFile(null);
            await uploadAndInsertImage(cropped);
          }}
        />
      )}
    </div>
  );
}
