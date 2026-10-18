'use client';

import { isValidElement, useState } from 'react';
import type { ReactNode } from 'react';

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

function getLanguage(node: ReactNode): string {
  if (isValidElement<{ className?: string }>(node)) {
    const match = /language-([\w-]+)/.exec(node.props.className ?? '');
    return match?.[1] ?? '';
  }
  return '';
}

interface CodeBlockProps {
  children: ReactNode;
}

export default function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = getLanguage(children);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(extractText(children).replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (for example on an insecure origin).
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-700 px-3 py-1.5 text-xs text-neutral-400">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="rounded px-2 py-0.5 hover:bg-neutral-800 hover:text-white"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">{children}</pre>
    </div>
  );
}
