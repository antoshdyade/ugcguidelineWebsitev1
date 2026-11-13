import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, Search, X } from 'lucide-react';
import { filterDocuments, formatBytes } from '../lib/cmsLogic';
import type { CmsDocument } from '../types/cms';

interface QuickLinksRepositoryProps {
  documents: CmsDocument[];
  initialQuery?: string;
}

const DOC_CATEGORIES = [
  'All',
  'Fee Structure',
  'Academic Calendar',
  'Syllabus',
  'UGC & AICTE Approvals',
  'NAAC / NBA / NIRF',
  'Annual Reports & Audits',
  'Circulars & Forms',
];

export function QuickLinksRepository({ documents, initialQuery = '' }: QuickLinksRepositoryProps) {
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [query, setQuery] = useState<string>(initialQuery);
  const [previewDoc, setPreviewDoc] = useState<CmsDocument | null>(null);

  const filtered = useMemo(
    () => filterDocuments(documents, selectedCat, query),
    [documents, selectedCat, query],
  );

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
            UGC Self-Disclosure · Unrestricted Public Access
          </p>
          <h1 className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1">
            Quick Links &amp; Downloadable Document Repository
          </h1>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter documents by title or filename..."
            aria-label="Filter downloadable documents"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Category Filter Segmented Controls */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Document category filters">
        {DOC_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              selectedCat === cat
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            style={selectedCat === cat ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-500 dark:text-slate-400">
            No documents match your current filter. Try clearing the search box or choosing &ldquo;All&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/70 text-left text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Document Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold tabular-nums">Size</th>
                  <th className="py-3 px-4 font-semibold tabular-nums">Uploaded</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {filtered.map((doc) => {
                  const isExternal = doc.sourceType === 'external' || /^https?:\/\//i.test(doc.fileUrl);
                  return (
                    <tr key={doc.id} className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-stone-900 dark:text-white">{doc.title}</p>
                            <p className="text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
                              {isExternal ? `External Link · ${doc.fileName}` : doc.fileName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 dark:text-slate-300 whitespace-nowrap">
                        {doc.category}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-stone-600 dark:text-slate-400 whitespace-nowrap">
                        {isExternal ? 'External URL' : formatBytes(doc.fileSizeBytes)}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-stone-600 dark:text-slate-400 whitespace-nowrap">
                        {doc.uploadedAt}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {!isExternal && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                          )}
                          {isExternal ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Link</span>
                            </a>
                          ) : (
                            <a
                              href={doc.fileUrl}
                              download={doc.fileName}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline PDF Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewDoc.title}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-700 w-full max-w-4xl h-[82vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">{previewDoc.title}</h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  {previewDoc.category} ·{' '}
                  {previewDoc.sourceType === 'external' ? 'External Document Link' : formatBytes(previewDoc.fileSizeBytes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Open / Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  aria-label="Close document preview"
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={previewDoc.fileUrl}
              title={previewDoc.title}
              className="w-full flex-1 bg-stone-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
