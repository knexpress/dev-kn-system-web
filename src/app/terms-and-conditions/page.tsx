import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms and Conditions | KNEX',
  description:
    'Terms and Conditions for using the KNEX logistics and finance platform.',
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 px-4 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-slate-200">
            <Image
              src="/KNEXPRESSGREEN.png"
              alt="KN Express"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <article className="space-y-8 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-10">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80">
              Legal
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Terms and Conditions
            </h1>
            <p className="text-sm text-slate-500">Effective date: 29 April 2026</p>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              These Terms and Conditions govern access to and use of the KNEX platform and
              related services.
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-sm leading-6 text-slate-500">
              By accessing or using KNEX, you confirm that you are authorized to act on behalf
              of your organization and agree to these Terms and our Privacy Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">2. Service Scope</h2>
            <p className="text-sm leading-6 text-slate-500">
              KNEX provides tools for logistics workflow management, invoice processing,
              assignment tracking, reporting, and operational communication.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">3. Account Responsibilities</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
              <li>You must provide accurate registration and business data.</li>
              <li>You are responsible for safeguarding account credentials.</li>
              <li>
                You must promptly notify KNEX of unauthorized use or suspected compromise.
              </li>
              <li>You are responsible for activities carried out under your account.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Acceptable Use</h2>
            <p className="text-sm leading-6 text-slate-500">
              You may not use the platform for unlawful, fraudulent, abusive, or
              security-threatening activity. Attempts to disrupt service, reverse-engineer
              protected components, or bypass security controls are prohibited.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">5. Data and Compliance</h2>
            <p className="text-sm leading-6 text-slate-500">
              Users must ensure that all personal and business data submitted to KNEX is
              collected and used lawfully. KNEX processes data according to applicable UAE law
              and internal security controls.
            </p>
            <p className="text-sm leading-6 text-slate-500">
              Parties shall comply with relevant UAE legal frameworks, including Federal
              Decree-Law No. 45 of 2021 (Personal Data Protection) and other mandatory
              commercial and electronic transaction requirements applicable to their business
              activities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">6. Availability and Changes</h2>
            <p className="text-sm leading-6 text-slate-500">
              We aim for high availability but do not guarantee uninterrupted access at all
              times. We may update, suspend, or improve platform features for security,
              maintenance, or business needs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">7. Intellectual Property</h2>
            <p className="text-sm leading-6 text-slate-500">
              All rights in the KNEX platform, software, branding, and related materials remain
              the property of KNEX or its licensors. No license is granted except the limited
              right to use the service as intended.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">8. Limitation of Liability</h2>
            <p className="text-sm leading-6 text-slate-500">
              To the fullest extent permitted by law, KNEX is not liable for indirect,
              incidental, special, or consequential damages arising from service use,
              interruption, or data loss. Direct liability is limited to amounts paid for the
              service in the applicable period, where permitted by law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">9. Termination</h2>
            <p className="text-sm leading-6 text-slate-500">
              We may suspend or terminate access for breaches of these Terms, legal
              requirements, security threats, or prolonged inactivity, subject to applicable
              law and contractual obligations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">10. Governing Law</h2>
            <p className="text-sm leading-6 text-slate-500">
              These Terms are governed by the laws and regulations in force in the United Arab
              Emirates. Disputes are subject to the competent courts of the UAE unless another
              forum is agreed in writing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">11. Contact</h2>
            <p className="text-sm leading-6 text-slate-500">
              Legal and compliance enquiries: legal@knex.ae
            </p>
          </section>

          <footer className="border-t border-slate-100 pt-4 text-sm text-slate-500">
            <p>
              Related legal page:{' '}
              <Link
                className="font-medium text-emerald-700 underline-offset-2 hover:underline"
                href="/privacy-policy"
              >
                Privacy Policy
              </Link>
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
}
