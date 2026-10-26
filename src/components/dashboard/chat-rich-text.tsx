'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TOKEN =
  /(\*\*[^*]+?\*\*)|(\[[^\]]+\]\([^)\s]+\))|(`?\/dashboard\/[A-Za-z0-9\-/_?=&%.]+`?)|(https?:\/\/[^\s)]+)/g;

function cleanPath(raw: string) {
  return raw.replace(/^`|`$/g, '').replace(/[.,;:]+$/, '');
}

function isAppPath(href: string) {
  return href.startsWith('/dashboard');
}

function ChatLink({
  href,
  children,
  onUserBubble,
}: {
  href: string;
  children: ReactNode;
  onUserBubble?: boolean;
}) {
  const path = cleanPath(href);
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'font-semibold underline underline-offset-2',
        onUserBubble ? 'text-white decoration-white/70 hover:decoration-white' : 'text-brand-600 hover:text-brand-700'
      )}
    >
      {children}
    </a>
  );
}

function renderSegment(segment: string, onUserBubble?: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  const matches = segment.matchAll(TOKEN);

  for (const match of matches) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(segment.slice(last, index));
    const token = match[0];

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${index}-b`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('[')) {
      const parsed = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (parsed) {
        nodes.push(
          <ChatLink key={`${index}-md`} href={parsed[2]} onUserBubble={onUserBubble}>
            {parsed[1]}
          </ChatLink>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.includes('/dashboard/')) {
      const path = cleanPath(token);
      const label = path.replace('/dashboard/', '').replace(/\?.*$/, '').replace(/[-/]/g, ' ') || path;
      nodes.push(
        <ChatLink key={`${index}-p`} href={path} onUserBubble={onUserBubble}>
          {isAppPath(path) ? label.replace(/\b\w/g, (c) => c.toUpperCase()) : path}
        </ChatLink>
      );
    } else {
      nodes.push(
        <ChatLink key={`${index}-u`} href={token} onUserBubble={onUserBubble}>
          {token}
        </ChatLink>
      );
    }

    last = index + token.length;
  }

  if (last < segment.length) nodes.push(segment.slice(last));
  return nodes;
}

function isBulletLine(line: string) {
  return /^\s*[-*•]\s+\S/.test(line);
}

function stripBullet(line: string) {
  return line.replace(/^\s*[-*•]\s+/, '');
}

export function ChatRichText({
  text,
  onUserBubble,
}: {
  text: string;
  onUserBubble?: boolean;
}) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    if (isBulletLine(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && isBulletLine(lines[i])) {
        items.push(stripBullet(lines[i]));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-1.5 list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderSegment(item, onUserBubble)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const line = lines[i];
    const prevWasText = i > 0 && !isBulletLine(lines[i - 1]);
    blocks.push(
      <span key={`p-${i}`}>
        {prevWasText && <br />}
        {renderSegment(line, onUserBubble)}
      </span>
    );
    i += 1;
  }

  return <>{blocks}</>;
}
