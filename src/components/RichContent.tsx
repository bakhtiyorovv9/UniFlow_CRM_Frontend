'use client';

import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export function stripHtml(html: string) {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function RichContent({ html, className = '' }: { html: string; className?: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['h1', 'h2', 'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
      }),
    [html],
  );
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
