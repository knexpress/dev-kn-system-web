'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Legacy /login route — login now lives at `/` */
export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}
