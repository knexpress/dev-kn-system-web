'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
    
    console.log('🔐 Attempting login with:', email);
    const result = await login(email, password);
    console.log('🔐 Login result:', result);

    if (result.success) {
      console.log('✅ Login successful');
      if (result.requiresPasswordChange) {
        console.log('⚠️ Password change required, redirecting to dashboard');
        // Password change modal will show automatically in dashboard
      } else {
        console.log('✅ No password change needed, redirecting to dashboard');
      }
      router.push('/dashboard');
    } else {
      console.error('❌ Login failed:', result.error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.error || 'An unexpected error occurred.',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
      </Button>
    </form>
  );
}