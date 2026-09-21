import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | KNEX',
  description:
    'Privacy Policy for KNEX logistics and finance operations in the UAE.',
};

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500">Effective date: 29 April 2026</p>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              This Privacy Policy explains how KNEX collects, uses, stores, and protects
              personal data when you use our logistics and finance system.
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">1. Data Controller</h2>
            <p className="text-sm leading-6 text-slate-500">
              KNEX is the data controller for personal data processed through this platform.
              For privacy enquiries, deletion requests, or compliance notices, contact us at:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
              <li>Email: privacy@knex.ae</li>
              <li>Support Email: support@knex.ae</li>
              <li>Service Area: United Arab Emirates</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">2. Data We Collect</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
              <li>Identity data (name, job title, company name).</li>
              <li>Contact data (phone number, email, billing address).</li>
              <li>
                Operational data (shipment requests, invoice data, payment references,
                assignment history).
              </li>
              <li>
                Technical data (IP address, browser information, session logs, security logs).
              </li>
              <li>
                Communications data (support tickets, approval notes, and audit comments).
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              3. Why We Process Personal Data
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
              <li>To provide logistics, invoicing, and account management.</li>
              <li>To authenticate users and secure accounts.</li>
              <li>To generate financial and operational records.</li>
              <li>To detect fraud, abuse, or unauthorized activity.</li>
              <li>To comply with UAE legal and regulatory obligations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">4. Legal Basis</h2>
            <p className="text-sm leading-6 text-slate-500">
              We process personal data where necessary for contract performance, compliance
              with legal obligations, legitimate business interests, and user consent where
              required.
            </p>
            <p className="text-sm leading-6 text-slate-500">
              Our data practices are aligned with applicable UAE frameworks, including Federal
              Decree-Law No. 45 of 2021 on the Protection of Personal Data and related
              implementing regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              5. Data Sharing and Processors
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              We share data only with authorized personnel, vetted service providers, and
              trusted infrastructure partners needed to operate the platform, including cloud
              hosting and monitoring services.
            </p>
            <p className="text-sm leading-6 text-slate-500">
              We do not sell personal data. Data transfers are limited to lawful operational
              purposes and protected by contractual and technical safeguards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">6. Retention and Deletion</h2>
            <p className="text-sm leading-6 text-slate-500">
              We retain records for as long as needed for service delivery, auditing,
              accounting, legal defense, and compliance obligations. When retention periods
              end, data is securely deleted or anonymized.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">7. Your Rights</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
              <li>Request access to your personal data.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request erasure where legally applicable.</li>
              <li>Object to or restrict certain processing activities.</li>
              <li>Request a copy of your data where applicable.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">8. Security Controls</h2>
            <p className="text-sm leading-6 text-slate-500">
              We maintain administrative, technical, and physical controls to protect data
              confidentiality, integrity, and availability. These include access control,
              encryption in transit, logging, and periodic security review.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">9. Contact and Complaints</h2>
            <p className="text-sm leading-6 text-slate-500">
              If you have any privacy concerns, contact privacy@knex.ae first so we can
              resolve your request quickly. You may also escalate unresolved concerns to
              competent UAE authorities where applicable.
            </p>
          </section>

          <footer className="border-t border-slate-100 pt-4 text-sm text-slate-500">
            <p>
              Related legal page:{' '}
              <Link
                className="font-medium text-emerald-700 underline-offset-2 hover:underline"
                href="/terms-and-conditions"
              >
                Terms and Conditions
              </Link>
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
}
