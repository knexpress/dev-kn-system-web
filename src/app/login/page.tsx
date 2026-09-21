'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthForm } from '@/components/auth-form';
import { LoginBrandPanel } from '@/components/login-brand-panel';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile) {
      router.push('/dashboard');
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
    <div className="grid min-h-screen w-full lg:grid-cols-[1.15fr_0.85fr]">
      <LoginBrandPanel />

      <main className="relative flex items-center justify-center bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 px-5 py-10 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-10 h-52 w-52 rounded-full bg-slate-200/50 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
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
              Sign in
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Access bookings, invoices, and finance tools for your department.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-8">
            <AuthForm />
            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-400">
              <Link
                className="transition hover:text-emerald-700"
                href="/privacy-policy"
              >
                Privacy Policy
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                className="transition hover:text-emerald-700"
                href="/terms-and-conditions"
              >
                Terms and Conditions
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
