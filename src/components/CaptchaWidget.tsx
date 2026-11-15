import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface CaptchaWidgetProps {
  idPrefix?: string;
  captchaId: string;
  captchaAnswer: string;
  onCaptchaIdChange: (nextId: string) => void;
  onCaptchaAnswerChange: (nextAnswer: string) => void;
  refreshSignal?: number;
  label?: string;
}

export function CaptchaWidget({
  idPrefix = 'captcha',
  captchaId,
  captchaAnswer,
  onCaptchaIdChange,
  onCaptchaAnswerChange,
  refreshSignal = 0,
  label = 'Security CAPTCHA Verification *',
}: CaptchaWidgetProps) {
  const [svgDataUrl, setSvgDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadErr, setLoadErr] = useState<string>('');

  const onIdRef = useRef(onCaptchaIdChange);
  onIdRef.current = onCaptchaIdChange;
  const onAnswerRef = useRef(onCaptchaAnswerChange);
  onAnswerRef.current = onCaptchaAnswerChange;

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const resp = await fetch(`/api/captcha?t=${Date.now()}`, { cache: 'no-store' });
      const data = (await resp.json().catch(() => ({}))) as {
        challengeId?: string;
        svgDataUrl?: string;
        error?: string;
      };
      if (!resp.ok || !data.challengeId || !data.svgDataUrl) {
        throw new Error(data.error || 'Unable to load CAPTCHA image.');
      }
      onIdRef.current(data.challengeId);
      setSvgDataUrl(data.svgDataUrl);
      onAnswerRef.current('');
    } catch (err) {
      setLoadErr((err as Error).message || 'CAPTCHA unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge, refreshSignal]);

  const inputId = `${idPrefix}-captcha-answer`;

  return (
    <div className="rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-800/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-slate-200"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={loadChallenge}
          disabled={loading}
          aria-label="Refresh CAPTCHA"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-slate-300 hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>New Code</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="h-[54px] min-w-[172px] rounded-md border border-stone-300 dark:border-slate-600 bg-white overflow-hidden flex items-center justify-center shrink-0">
          {svgDataUrl ? (
            <img
              src={svgDataUrl}
              alt="CAPTCHA challenge characters"
              data-captcha-id={captchaId}
              className="h-[52px] w-[176px] object-contain select-none"
            />
          ) : (
            <span className="text-[11px] text-stone-500 px-3">
              {loading ? 'Loading...' : loadErr || 'No image'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-[140px]">
          <input
            id={inputId}
            type="text"
            required
            autoComplete="off"
            maxLength={8}
            value={captchaAnswer ?? ''}
            onChange={(e) => onCaptchaAnswerChange(e.target.value.toUpperCase())}
            placeholder="Enter characters shown"
            className="w-full px-3 py-2 text-sm font-mono uppercase tracking-widest rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>
      {loadErr && <p className="text-[11px] text-rose-600 dark:text-rose-400">{loadErr}</p>}
    </div>
  );
}
