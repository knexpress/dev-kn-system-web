'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthForm } from '@/components/auth-form';
import { LoginBrandPanel } from '@/components/login-brand-panel';
import { Loader2, ShieldCheck, Workflow, Users } from 'lucide-react';

export default function HomePage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile) {
      router.replace('/dashboard');
    }
  }, [userProfile, loading, router]);

  if (loading || (!loading && userProfile)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_0.95fr]">
      <LoginBrandPanel />

      <main className="relative flex items-center justify-center overflow-y-auto bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 px-5 py-10 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-10 h-52 w-52 rounded-full bg-slate-200/50 blur-3xl" />

        <div className="relative z-10 w-full max-w-xl space-y-6">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-lg shadow-emerald-900/20 ring-1 ring-slate-200 lg:hidden">
              <Image
                src="/KNEXPRESSGREEN.png"
                alt="KN Express"
                width={56}
                height={56}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80">
              KNEX Finance and Logistics System
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              KNEX is an internal operations platform that centralizes booking requests,
              delivery assignment, invoice lifecycle, audit logs, and reporting for
              logistics and finance teams.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-7">
            <AuthForm />
            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-400">
              <Link className="transition hover:text-emerald-700" href="/privacy-policy">
                Privacy Policy
              </Link>
              <span aria-hidden="true">·</span>
              <Link className="transition hover:text-emerald-700" href="/terms-and-conditions">
                Terms and Conditions
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)]">
              <Workflow className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-sm font-semibold text-slate-900">What it does</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Bookings, delivery, invoices, and audit trails in one controlled workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)]">
              <Users className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-sm font-semibold text-slate-900">Who uses it</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Operations, finance, compliance, and authorized administrators.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-sm font-semibold text-slate-900">Trust</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Role-based access, security logging, and documented legal policies.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
