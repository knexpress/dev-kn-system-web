'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { KnexSkullLottie } from '@/components/dashboard/knex-skull-lottie';
import { ChatRichText } from '@/components/dashboard/chat-rich-text';

type ChatRole = 'user' | 'assistant';
type ChatMessage = { id: string; role: ChatRole; content: string };

type KnexAiChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName?: string;
  department?: string;
};

const DESK_WELCOME: Record<string, string> = {
  Sales: 'CRM, customer tracking, TrueID booking, booking forms, invoice requests, clients, and rejected requests',
  Operations: 'booking forms, cargo status, invoice requests, quotations, and rejected requests',
  Finance: 'invoice requests, quotations, shipment invoices, payments, credit notes, journals, VAT201, and finance setup',
  HR: 'your HR home dashboard and how to get help from the right desk',
  Management: 'company overview, clients, quotations, accounting reports, delivery assignments, employees, booking requests, and logs',
  IT: 'every Maglo module, including users, employees, logs, finance setup, and Empost retries',
  Auditor: 'cargo status, all requests, accounting reports, and the audit report',
};

const DESK_HINT: Record<string, string> = {
  Sales: 'Ask about CRM, tracking, TrueID booking, and Sales shipments.',
  Operations: 'Ask about cargo, booking forms, quotations, and invoice requests.',
  Finance: 'Ask about invoices, journals, VAT, and the rest of Finance.',
  HR: 'Ask about your HR workspace.',
  Management: 'Ask about company overview, reports, and management screens.',
  IT: 'Ask about any Maglo module, users, or Empost.',
  Auditor: 'Ask about cargo status, requests, and the audit report.',
};

const DESK_PLACEHOLDER: Record<string, string> = {
  Sales: 'Ask how to book a shipment, open CRM, or track a customer…',
  Operations: 'Ask how to review cargo, build a quote, or check a booking…',
  Finance: 'Ask how to record a payment, post a journal…',
  HR: 'Ask what you can open on the HR desk…',
  Management: 'Ask about reports, employees, or company overview…',
  IT: 'Ask about users, finance setup, or Empost…',
  Auditor: 'Ask how to search the audit report…',
};

function welcome(firstName?: string, department?: string) {
  const name = firstName || 'there';
  const desk = department ? ` your ${department} desk` : ' your KNEX desk';
  const topics = (department && DESK_WELCOME[department]) || 'the screens on your desk';
  return `Hi ${name} — ask me anything about${desk}. I can walk you through ${topics}.`;
}

export function KnexAiChat({ open, onOpenChange, firstName, department }: KnexAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextWelcome: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: welcome(firstName, department),
    };
    setMessages((prev) => {
      if (!prev.length) return [nextWelcome];
      return prev.map((message) => (message.id === 'welcome' ? nextWelcome : message));
    });
  }, [firstName, department]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const nextUser: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const history = [...messages.filter((m) => m.id !== 'welcome'), nextUser];
    setDraft('');
    setError(null);
    setMessages((prev) => [...prev, nextUser]);
    setSending(true);

    const result = await apiClient.chatWithAssistant({
      messages: history.map(({ role, content }) => ({ role, content })),
      firstName,
      department,
    });

    setSending(false);
    const problem =
      result.data?.reply ||
      result.error ||
      'the Finance backend did not respond to the chat request.';
    const reply = result.success && result.data?.reply
      ? result.data.reply
      : `KNEX Assistant is not working right now. Ask your IT Ali Abdullah to check: ${problem}`;
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'assistant', content: reply },
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-950">
              <KnexSkullLottie className="h-full w-full" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold tracking-tight text-slate-900">
                KNEX Assistant
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-400">
                {DESK_HINT[department || ''] || 'Ask about the screens on your desk.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-50 text-slate-700 ring-1 ring-slate-100'
                )}
              >
                <ChatRichText text={message.content} onUserBubble={message.role === 'user'} />
              </div>
            </div>
          ))}
          {sending && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-400 ring-1 ring-slate-100">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          )}
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-slate-100 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-200/80">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={DESK_PLACEHOLDER[department || ''] || 'Ask about a screen on your desk…'}
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white disabled:opacity-40"
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
