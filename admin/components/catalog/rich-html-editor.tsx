'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type RichHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
};

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export function RichHtmlEditor({
  value,
  onChange,
  placeholder = 'İçerik yazın…',
  label,
}: RichHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    const el = editorRef.current;
    if (!el || preview) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value, preview]);

  const emit = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html === '<br>' ? '' : html);
  }, [onChange]);

  const insertTable = () => {
    exec(
      'insertHTML',
      '<table><thead><tr><th>Özellik</th><th>Değer</th></tr></thead><tbody><tr><td></td><td></td></tr></tbody></table><p></p>',
    );
    emit();
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    exec('createLink', url);
    setLinkUrl('');
    emit();
  };

  const btn =
    'rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40';

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-sm font-medium text-slate-700">{label}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-2 py-1.5">
        <button type="button" className={btn} onClick={() => { exec('formatBlock', 'h2'); emit(); }} disabled={preview}>
          H2
        </button>
        <button type="button" className={btn} onClick={() => { exec('formatBlock', 'h3'); emit(); }} disabled={preview}>
          H3
        </button>
        <button type="button" className={btn} onClick={() => { exec('bold'); emit(); }} disabled={preview}>
          Bold
        </button>
        <button type="button" className={btn} onClick={() => { exec('italic'); emit(); }} disabled={preview}>
          Italic
        </button>
        <button type="button" className={btn} onClick={() => { exec('insertUnorderedList'); emit(); }} disabled={preview}>
          Liste
        </button>
        <button type="button" className={btn} onClick={() => { exec('insertOrderedList'); emit(); }} disabled={preview}>
          Numara
        </button>
        <button type="button" className={btn} onClick={insertTable} disabled={preview}>
          Tablo
        </button>
        <div className="flex items-center gap-1">
          <input
            className="w-40 rounded border border-slate-200 px-2 py-1 text-xs"
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            disabled={preview}
          />
          <button type="button" className={btn} onClick={applyLink} disabled={preview || !linkUrl.trim()}>
            Link
          </button>
        </div>
        <button
          type="button"
          className={`${btn} ml-auto ${preview ? 'bg-[#f0f5f8] text-[#16324f]' : ''}`}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Düzenle' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div
          className="prose prose-sm max-w-none rounded-b-lg border border-slate-200 bg-white p-4 text-slate-800 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1"
          dangerouslySetInnerHTML={{ __html: value || `<p class="text-slate-400">${placeholder}</p>` }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline
          data-placeholder={placeholder}
          className="min-h-[160px] rounded-b-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#1b6b8f]/30 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1"
          onInput={emit}
          onBlur={emit}
        />
      )}
    </div>
  );
}
