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

function welcome(firstName?: string, department?: string) {
  const name = firstName || 'there';
  const desk = department ? ` your ${department} desk` : ' KNEX Finance';
  return `Hi ${name} — ask me anything about${desk}. I can walk you through invoice requests, quotations, payments, credit notes, journals, VAT201, and the rest of the Maglo workspace.`;
}

export function KnexAiChat({ open, onOpenChange, firstName, department }: KnexAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessages((prev) =>
      prev.length
        ? prev
        : [{ id: 'welcome', role: 'assistant', content: welcome(firstName, department) }]
    );
  }, [open, firstName, department]);

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
                Ask about invoices, journals, VAT, and the rest of Finance.
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
              placeholder="Ask how to record a payment, post a journal…"
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
