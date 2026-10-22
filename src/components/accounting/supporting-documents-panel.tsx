'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { fmtDateTime } from './erp-format';

export type AttachmentKind =
  | 'purchase-order'
  | 'sales-invoice'
  | 'supplier-payment'
  | 'petty-cash'
  | 'invoice-note'
  | 'journal'
  | 'shipment-invoice';

function apiOrigin() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
}

export function SupportingDocumentsPanel({
  kind,
  id,
  documents = [],
  onChange,
}: {
  kind: AttachmentKind;
  id?: string;
  documents?: any[];
  onChange?: (docs: any[]) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<any[]>(Array.isArray(documents) ? documents : []);

  useEffect(() => {
    setDocs(Array.isArray(documents) ? documents : []);
  }, [documents]);

  const upload = async (files: File[]) => {
    if (!id || !files.length) return;
    setBusy(true);
    const result = await apiClient.uploadAccountingAttachments(kind, id, files.slice(0, 5));
    setBusy(false);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not attach files',
        description: result.error || 'Try PDF, image, Word, or Excel (10MB each).',
      });
      return;
    }
    const next = (result.data as any[]) || [];
    setDocs(next);
    onChange?.(next);
    toast({ title: 'Documents attached' });
  };

  const remove = async (docId: string) => {
    if (!id) return;
    setBusy(true);
    const result = await apiClient.deleteAccountingAttachment(kind, id, docId);
    setBusy(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not remove file', description: result.error });
      return;
    }
    const next = (result.data as any[]) || [];
    setDocs(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Supporting documents</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-xl text-xs"
          disabled={!id || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Add files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            void upload(files);
          }}
        />
      </div>
      {docs.length === 0 ? (
        <p className="text-[11px] text-slate-400">
          Attach supplier invoices, receipts, or scans — available on drafts and unpaid records.
        </p>
      ) : (
        <ul className="space-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2">
          {docs.map((doc) => (
            <li key={String(doc._id || doc.filename)} className="flex items-center justify-between gap-2 text-xs">
              <a
                href={`${apiOrigin()}${doc.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-2 text-sky-700 hover:underline"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate">{doc.original_name || 'Document'}</span>
                {doc.uploaded_at ? (
                  <span className="shrink-0 text-slate-400">· {fmtDateTime(doc.uploaded_at)}</span>
                ) : null}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={busy}
                onClick={() => void remove(String(doc._id))}
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
