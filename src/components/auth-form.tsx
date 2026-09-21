'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { secureLog } from '@/lib/secure-logger';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    secureLog.debug('Login attempt initiated', { email: email.substring(0, 10) + '...' });
    const result = await login(email, password);
    secureLog.debug('Login result received', { success: result.success });

    if (result.success) {
      secureLog.success('Login successful');
      if (result.requiresPasswordChange) {
        secureLog.warn('Password change required');
      }
      router.push('/dashboard');
    } else {
      secureLog.error('Login failed', { error: result.error });
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.error || 'An unexpected error occurred.',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@knexpress.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="h-11 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:bg-white focus-visible:ring-emerald-500/30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-700">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="h-11 rounded-xl border-slate-200 bg-slate-50/80 focus-visible:bg-white focus-visible:ring-emerald-500/30"
        />
      </div>
      <Button
        type="submit"
        className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
      </Button>
    </form>
  );
}
