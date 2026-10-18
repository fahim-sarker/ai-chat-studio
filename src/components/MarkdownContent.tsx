'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import CodeBlock from './CodeBlock';

const components: Components = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ className, children }) => (
    <code
      className={`${className ?? ''} rounded bg-neutral-700 px-1.5 py-0.5 font-mono text-[0.85em]`}
    >
      {children}
    </code>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mt-4 mb-3 text-xl font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 mb-2 text-lg font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-2 text-base font-semibold">{children}</h3>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-neutral-600 pl-4 text-neutral-300">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 underline hover:text-blue-300"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-neutral-700" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-neutral-700 bg-neutral-800 px-3 py-2 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-neutral-700 px-3 py-2">{children}</td>
  ),
};

interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownContent);
