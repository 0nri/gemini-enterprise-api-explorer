'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownTextProps {
  /** Markdown source. May include GFM footnote syntax ("text[^1]" + "[^1]: [label](url)"). */
  text: string;
  className?: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-lg font-semibold mt-3 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
  p: ({ children }) => <p className="my-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-gray-100 rounded px-1 text-xs font-mono">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-xs">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <table className="border border-gray-300 border-collapse my-2">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 px-2 py-1 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
  hr: () => <hr className="my-3 border-gray-200" />,
};

/**
 * Renders markdown (GFM, including footnotes) with plain Tailwind utility
 * styling, with a toggle to view the literal raw source instead. Formatted
 * view is the default on mount.
 */
export function MarkdownText({ text, className }: MarkdownTextProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!text) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setShowRaw((prev) => !prev)}
        className="text-xs text-gray-500 hover:text-gray-800 underline mb-1"
      >
        {showRaw ? 'Show formatted' : 'Show raw'}
      </button>
      {showRaw ? (
        <pre className="whitespace-pre-wrap text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
          {text}
        </pre>
      ) : (
        <div className="text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
