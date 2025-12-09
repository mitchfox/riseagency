import React from 'react';

// Simple markdown renderer for bold, italic, and basic formatting
export function renderMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let key = 0;
  
  // Match **bold** and *italic* patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (match[2]) {
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

// Render full content with line breaks and markdown (strips headers)
export function MarkdownContent({ content, className = '' }: { content: string; className?: string }) {
  const lines = content.split('\n');
  
  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, i) => {
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        // Strip any headers - just render as bold paragraph
        if (line.match(/^#{1,4}\s/)) {
          const text = line.replace(/^#{1,4}\s/, '');
          return <p key={i} className="font-semibold">{renderMarkdown(text)}</p>;
        }
        // Check for bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <div key={i} className="flex gap-2"><span>•</span><span>{renderMarkdown(line.slice(2))}</span></div>;
        }
        // Check for numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s/);
        if (numberedMatch) {
          return <div key={i} className="flex gap-2"><span>{numberedMatch[1]}.</span><span>{renderMarkdown(line.slice(numberedMatch[0].length))}</span></div>;
        }
        return <p key={i}>{renderMarkdown(line)}</p>;
      })}
    </div>
  );
}

// Simple inline text with markdown (for single-line descriptions)
export function MarkdownText({ text, className = '' }: { text: string; className?: string }) {
  return <span className={className}>{renderMarkdown(text)}</span>;
}
