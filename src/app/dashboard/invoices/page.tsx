import { redirect } from 'next/navigation';

export default function InvoicesPage() {
  redirect('/dashboard/accounting/sales?tab=shipments');
}
