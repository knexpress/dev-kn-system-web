'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  DashboardPageShell,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
} from '@/components/dashboard/maglo-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { FinanceSetupDashboard, FinanceSetupStep, SetupStatus } from '@/lib/finance-setup-types';
import { STATUS_LABEL } from '@/lib/finance-setup-types';

const STATUS_TONE: Record<SetupStatus, string> = {
  complete: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
  needs_review: 'bg-amber-50 text-amber-800 ring-amber-200',
  not_applicable: 'bg-slate-100 text-slate-600 ring-slate-200',
  not_started: 'bg-white text-slate-500 ring-slate-200',
};

const CAPS = ['view', 'create', 'approve', 'post', 'pay', 'reverse', 'export', 'manage_setup', 'unlock_period'];
const POLICY_KEYS = ['journals', 'payments', 'discounts', 'refunds', 'credit_notes', 'reversals', 'period_changes'];

export function FinanceSetupApp() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [data, setData] = useState<FinanceSetupDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState('users_permissions');
  const [naReason, setNaReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [openingJson, setOpeningJson] = useState('{\n  "as_of_date": "2026-01-01",\n  "banks": [],\n  "customer_invoices": [],\n  "supplier_bills": [],\n  "ledger_lines": []\n}');
  const [goLiveComments, setGoLiveComments] = useState('');
  const [enableEnforcement, setEnableEnforcement] = useState(false);

  const load = async () => {
    const result = await apiClient.getFinanceSetup();
    if (result.success && result.data) {
      setData(result.data as FinanceSetupDashboard);
    } else {
      toast({ variant: 'destructive', title: 'Could not load Finance Setup', description: result.error });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const steps = useMemo(() => Object.values(data?.steps || {}), [data]);
  const current = data?.steps?.[active];

  const run = async (fn: () => Promise<{ success: boolean; error?: string; message?: string; data?: unknown }>) => {
    setSaving(true);
    try {
      const result = await fn();
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Could not save', description: result.error });
      } else {
        if (result.data && typeof result.data === 'object' && 'steps' in (result.data as object)) {
          setData(result.data as FinanceSetupDashboard);
        } else {
          await load();
        }
        toast({ title: 'Saved', description: result.message || 'Finance setup updated.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardPageShell title="Finance Setup" subtitle="Checking live configuration…">
        <div className="p-6 text-sm text-slate-500">Loading readiness from the books…</div>
      </DashboardPageShell>
    );
  }

  if (!data) {
    return (
      <DashboardPageShell title="Finance Setup">
        <div className="p-6 text-sm text-slate-500">Finance Setup is available to finance administrators.</div>
      </DashboardPageShell>
    );
  }

  const profile = data.setup.business_profile || {};
  const foundations = data.setup.foundations || {};
  const matrix = data.setup.permission_matrix || {};

  return (
    <DashboardPageShell
      eyebrow="Staging readiness"
      title="Finance Setup"
      subtitle="Configure the business, verify opening balances, and approve the books for live use. Progress is calculated from evidence, not checkboxes."
      panel={false}
    >
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(43,38,120,0.25)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Overall required completion</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.overall.percent}%</p>
            <p className="text-xs text-slate-400">
              {data.overall.required_done} of {data.overall.required_total} required steps · {data.overall.optional_done} of {data.overall.optional_total} optional
            </p>
          </div>
          <div className="min-w-[220px] flex-1">
            <Progress value={data.overall.percent} />
          </div>
          <div className="text-sm text-slate-500">
            Trial balance {data.trial_balance.balanced ? 'balances' : 'does not balance'} · AED {data.trial_balance.debit.toFixed(2)} / {data.trial_balance.credit.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2">
          {steps.map((step) => (
            <button
              key={step.key}
              type="button"
              onClick={() => setActive(step.key)}
              className={cn(
                'w-full rounded-2xl border px-4 py-3 text-left transition',
                active === step.key ? 'border-brand-200 bg-brand-50/70' : 'border-slate-100 bg-white hover:border-slate-200'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400">{step.letter}</p>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', STATUS_TONE[step.status])}>
                  {STATUS_LABEL[step.status]}
                </span>
              </div>
              {step.missing?.[0] ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{step.missing[0]}</p> : null}
            </button>
          ))}
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 sm:p-6">
          {current ? (
            <StepHeader step={current} />
          ) : null}

          {active === 'users_permissions' && (
            <section className="space-y-4">
              <EvidenceList step={current} />
              <p className="text-sm text-slate-600">
                Users must be linked to employees and departments. Permission changes are enforced on the API when you turn enforcement on at go-live. You cannot grant yourself a higher role.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="py-2">Role</th>
                      {CAPS.map((cap) => (
                        <th key={cap} className="px-2 py-2 capitalize">{cap.replace('_', ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['SUPERADMIN', 'ADMIN', 'USER'].map((role) => (
                      <tr key={role} className="border-t border-slate-100">
                        <td className="py-2 font-semibold">{role}</td>
                        {CAPS.map((cap) => (
                          <td key={cap} className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(matrix[role]?.[cap])}
                              onChange={(e) => {
                                const next = structuredClone(matrix);
                                next[role] = { ...(next[role] || {}), [cap]: e.target.checked };
                                setData({ ...data, setup: { ...data.setup, permission_matrix: next } });
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                className={erpPrimaryButtonClass()}
                disabled={saving}
                onClick={() => run(() => apiClient.saveFinancePermissions({ permission_matrix: data.setup.permission_matrix }))}
              >
                Save permission matrix
              </Button>
              <Link className="block text-sm text-brand-600" href="/dashboard/users">Open user management</Link>
            </section>
          )}

          {active === 'business_profile' && (
            <section className="grid gap-3 sm:grid-cols-2">
              {[
                ['legal_name', 'Legal name'],
                ['trading_name', 'Trading name'],
                ['address_line1', 'Address'],
                ['city', 'City'],
                ['emirate', 'Emirate'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['vat_trn', 'VAT TRN'],
                ['registration_number', 'Registration number'],
                ['trade_license_no', 'Trade license'],
              ].map(([key, label]) => (
                <Field key={key} label={label} value={profile[key] || ''} onChange={(value) => setData({
                  ...data,
                  setup: { ...data.setup, business_profile: { ...profile, [key]: value } },
                })} />
              ))}
              <div className="sm:col-span-2">
                <Label>Invoice footer</Label>
                <Textarea
                  className={erpOutlineControlClass()}
                  value={profile.invoice_footer || ''}
                  onChange={(e) => setData({
                    ...data,
                    setup: { ...data.setup, business_profile: { ...profile, invoice_footer: e.target.value } },
                  })}
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => run(() => apiClient.saveFinanceSetupProfile(data.setup.business_profile))}>
                  Save profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const token = apiClient.getToken();
                    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                    const res = await fetch(`${base}/finance-setup/document-preview`, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    const html = await res.text();
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(html);
                      w.document.close();
                    }
                  }}
                >
                  Preview sample invoice
                </Button>
              </div>
              <LogoUpload onUploaded={load} />
            </section>
          )}

          {active === 'accounting_foundations' && (
            <section className="grid max-w-xl gap-3">
              <p className="text-sm text-slate-600">Base currency is AED. Multi-currency is not available in this system.</p>
              <Field type="date" label="Accounting start date" value={toDateInput(foundations.accounting_start_date)} onChange={(value) => setFoundations(data, setData, { accounting_start_date: value })} />
              <Field type="date" label="Migration cutoff" value={toDateInput(foundations.migration_cutoff_date)} onChange={(value) => setFoundations(data, setData, { migration_cutoff_date: value })} />
              <Field type="number" label="Financial year start month (1-12)" value={String(foundations.fy_start_month || 1)} onChange={(value) => setFoundations(data, setData, { fy_start_month: Number(value) })} />
              <Field label="Timezone" value={foundations.timezone || 'Asia/Dubai'} onChange={(value) => setFoundations(data, setData, { timezone: value })} />
              <Field label="Invoice prefix" value={foundations.numbering?.invoice || 'INV'} onChange={(value) => setFoundations(data, setData, { numbering: { ...(foundations.numbering || {}), invoice: value } })} />
              <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => run(() => apiClient.saveFinanceFoundations(data.setup.foundations))}>
                Save foundations
              </Button>
              {foundations.locked ? <p className="text-xs text-amber-700">These dates lock after the first posted journal.</p> : null}
            </section>
          )}

          {active === 'chart_of_accounts' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <p className="text-sm text-slate-600">Review the live chart before adding accounts. Required operational mappings:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(data.codes || {}).map(([role, code]) => (
                  <div key={role} className="rounded-xl border border-slate-100 px-3 py-2 text-sm">
                    <span className="text-slate-400">{role}</span>
                    <span className="ml-2 font-mono font-semibold">{String(code)}</span>
                  </div>
                ))}
              </div>
              <Link className="text-sm text-brand-600" href="/dashboard/accounting/chart-of-accounts">Open chart of accounts</Link>
            </section>
          )}

          {active === 'bank_cash' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <p className="text-sm text-slate-600">Link every bank, cash box, petty cash, driver wallet, and clearing account to the correct ledger account. Opening amounts post only through the opening-balances step so they are not counted twice.</p>
              <Link className="text-sm text-brand-600" href="/dashboard/accounting/bank-cash">Open bank & cash</Link>
            </section>
          )}

          {active === 'customers_suppliers' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <div className="flex gap-3 text-sm">
                <Link className="text-brand-600" href="/dashboard/accounting/sales">Customers</Link>
                <Link className="text-brand-600" href="/dashboard/accounting/purchase-orders">Suppliers</Link>
              </div>
              <NotApplicable reason={naReason} setReason={setNaReason} onSave={() => run(() => apiClient.markFinanceStepNotApplicable(active, naReason))} optional={current?.optional} />
            </section>
          )}

          {active === 'pricing_tax' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <p className="text-sm text-amber-700">This step does not make the company tax-compliant. It only records that rates and posting accounts are configured.</p>
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                Sample posting: shipping {String(data.codes.shipping)} · pickup {String(data.codes.pickup)} · delivery {String(data.codes.delivery)} · VAT {String(data.codes.vat)}
              </div>
              <Link className="text-sm text-brand-600" href="/dashboard/price-brackets">Open price brackets</Link>
              <NotApplicable reason={naReason} setReason={setNaReason} onSave={() => run(() => apiClient.markFinanceStepNotApplicable(active, naReason))} optional={current?.optional} />
            </section>
          )}

          {active === 'opening_balances' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <p className="text-sm text-slate-600">Paste a JSON payload, preview it, then approve. Posted migrations can only be corrected by reversal. Duplicate batch IDs will not post twice.</p>
              <Textarea className={cn(erpOutlineControlClass(), 'min-h-[180px] font-mono text-xs')} value={openingJson} onChange={(e) => setOpeningJson(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => {
                  try {
                    const payload = JSON.parse(openingJson);
                    return run(() => apiClient.previewOpeningBalances(payload));
                  } catch {
                    toast({ variant: 'destructive', title: 'Invalid JSON' });
                    return Promise.resolve();
                  }
                }}>Preview & validate</Button>
                <Button variant="outline" disabled={saving} onClick={async () => {
                  const preview = await apiClient.previewOpeningBalances(JSON.parse(openingJson));
                  const batchId = (preview.data as { batch?: { batch_id?: string } })?.batch?.batch_id;
                  if (!preview.success || !batchId) {
                    toast({ variant: 'destructive', title: 'Validate first', description: preview.error });
                    return;
                  }
                  run(() => apiClient.approveOpeningBalances(batchId));
                }}>Approve & post</Button>
              </div>
              <NotApplicable reason={naReason} setReason={setNaReason} onSave={() => run(() => apiClient.markFinanceStepNotApplicable(active, naReason))} optional={current?.optional} />
            </section>
          )}

          {active === 'approval_controls' && (
            <section className="space-y-3">
              <p className="text-sm text-slate-600">Period unlocking is always limited to Admin/Super Admin and needs a reason. Other policies below are stored and used as the intended control set.</p>
              {POLICY_KEYS.map((key) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                  <span className="capitalize">{key.replace('_', ' ')} — separate approver</span>
                  <Switch
                    checked={Boolean(data.setup.approval_policies?.[key]?.require_separate_approver)}
                    onCheckedChange={(checked) => {
                      const next = { ...data.setup.approval_policies, [key]: { ...(data.setup.approval_policies?.[key] || { roles: ['SUPERADMIN', 'ADMIN'] }), require_separate_approver: checked } };
                      setData({ ...data, setup: { ...data.setup, approval_policies: next } });
                    }}
                  />
                </label>
              ))}
              <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => run(() => apiClient.saveFinanceApprovals({ approval_policies: data.setup.approval_policies }))}>
                Save approval policies
              </Button>
            </section>
          )}

          {active === 'integrations' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <p className="text-sm text-slate-600">Credentials stay on the server. A saved token is not the same as a successful connection check.</p>
              <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => run(() => apiClient.checkFinanceDriveConnection())}>
                Check Google Drive connection
              </Button>
              {userProfile?.role === 'SUPERADMIN' ? <Link className="block text-sm text-brand-600" href="/dashboard/users">Change Drive refresh token</Link> : null}
              <NotApplicable reason={naReason} setReason={setNaReason} onSave={() => run(() => apiClient.markFinanceStepNotApplicable(active, naReason))} optional={current?.optional} />
            </section>
          )}

          {active === 'workflow_validation' && (
            <section className="space-y-3">
              <EvidenceList step={current} />
              <p className="text-sm text-slate-600">Automated checks run against isolated data. They do not create live invoices or cash movements. Manual ticks are stored separately and cannot mark this step complete on their own.</p>
              <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => run(() => apiClient.runFinanceWorkflowValidation())}>
                Run automated checks
              </Button>
            </section>
          )}

          {active === 'go_live' && (
            <section className="space-y-4">
              <EvidenceList step={current} />
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                Approving go-live records the finance owner, time, and comments. It does not automatically freeze production. Turn on permission enforcement only if you intend to restrict posting immediately.
              </div>
              <Label>Backup / restore review notes</Label>
              <Textarea className={erpOutlineControlClass()} value={data.setup.backup_review?.notes || ''} onChange={(e) => setData({
                ...data,
                setup: { ...data.setup, backup_review: { ...data.setup.backup_review, notes: e.target.value } },
              })} />
              <Button variant="outline" disabled={saving} onClick={() => run(() => apiClient.saveFinanceBackupReview({ reviewed: true, notes: data.setup.backup_review?.notes }))}>
                Mark backup reviewed
              </Button>
              <Label>Go-live comments</Label>
              <Textarea className={erpOutlineControlClass()} value={goLiveComments} onChange={(e) => setGoLiveComments(e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={enableEnforcement} onCheckedChange={setEnableEnforcement} />
                Also enable permission enforcement
              </label>
              <Button className={erpPrimaryButtonClass()} disabled={saving} onClick={() => run(() => apiClient.approveFinanceGoLive({ comments: goLiveComments, enable_enforcement: enableEnforcement }))}>
                Approve go-live
              </Button>
            </section>
          )}

          {current ? (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <Label>Reviewer comments</Label>
              <Textarea className={erpOutlineControlClass()} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
              <Button className="mt-2" variant="outline" disabled={saving} onClick={() => run(() => apiClient.reviewFinanceStep(active, reviewNote))}>
                Record review
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}

function StepHeader({ step }: { step: FinanceSetupStep }) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
        <Badge className={STATUS_TONE[step.status]}>{STATUS_LABEL[step.status]}</Badge>
        {step.optional ? <Badge variant="secondary">Optional</Badge> : <Badge>Required</Badge>}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {step.responsible_name ? `Responsible: ${step.responsible_name}` : 'No responsible person assigned'}
        {step.updated_at ? ` · Updated ${new Date(step.updated_at).toLocaleString()}` : ''}
        {step.reviewer_name ? ` · Reviewed by ${step.reviewer_name}` : ''}
      </p>
      {step.blocked_by?.length ? (
        <p className="mt-2 text-sm text-amber-700">Finish first: {step.blocked_by.join(', ')}</p>
      ) : null}
    </div>
  );
}

function EvidenceList({ step }: { step?: FinanceSetupStep }) {
  if (!step) return null;
  return (
    <div className="space-y-2 text-sm">
      {step.errors?.map((row) => <p key={row} className="text-red-600">{row}</p>)}
      {step.missing?.map((row) => <p key={row} className="text-amber-700">{row}</p>)}
      {step.warnings?.map((row) => <p key={row} className="text-slate-500">{row}</p>)}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} className={erpOutlineControlClass()} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NotApplicable({ reason, setReason, onSave, optional }: { reason: string; setReason: (v: string) => void; onSave: () => void; optional?: boolean }) {
  if (!optional) return null;
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-3">
      <Label>Not applicable reason</Label>
      <Textarea className={erpOutlineControlClass()} value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button className="mt-2" variant="outline" onClick={onSave}>Mark not applicable</Button>
    </div>
  );
}

function LogoUpload({ onUploaded }: { onUploaded: () => void }) {
  const { toast } = useToast();
  return (
    <div className="sm:col-span-2">
      <Label>Logo</Label>
      <Input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const result = await apiClient.uploadFinanceSetupLogo(file);
          if (result.success) onUploaded();
          else toast({ variant: 'destructive', title: 'Logo upload failed', description: result.error });
        }}
      />
    </div>
  );
}

function toDateInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function setFoundations(data: FinanceSetupDashboard, setData: (d: FinanceSetupDashboard) => void, patch: Record<string, unknown>) {
  setData({
    ...data,
    setup: { ...data.setup, foundations: { ...data.setup.foundations, ...patch } },
  });
}
