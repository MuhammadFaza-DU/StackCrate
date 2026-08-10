'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Eye, EyeOff } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import type { Message } from '@/i18n/types';
import { localizeApiError } from '@/lib/api-error';

const text = (message: Message) => typeof message === 'function' ? message() : message;

export default function SignupPage() {
  const router = useRouter();
  const { dictionary } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName || null }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(localizeApiError(dictionary, data.error, res.status, dictionary.errors.generic));
        return;
      }

      const tokens = data.data as { access_token?: string; refresh_token?: string };
      if (tokens?.access_token && tokens?.refresh_token) {
        // Persist the session so UserProvider sees a logged-in user immediately
        await createClient().auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      }

      router.replace('/');
    } catch {
      setError(text(dictionary.errors.network));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate overflow-hidden">
      <AmbientBackground variant="auth" />
      <div className="relative z-10 max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-center">{text(dictionary.auth.createAccountTitle)}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-display-name" className="text-sm font-medium text-muted-foreground">{text(dictionary.auth.displayName)}</label>
              <Input
                id="signup-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={text(dictionary.auth.displayNamePlaceholder)}
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="text-sm font-medium text-muted-foreground">{text(dictionary.auth.email)}</label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={text(dictionary.auth.emailPlaceholder)}
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="text-sm font-medium text-muted-foreground">{text(dictionary.auth.password)}</label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={text(dictionary.auth.passwordPlaceholder)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={text(showPassword ? dictionary.auth.hidePassword : dictionary.auth.showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <Button variant="warm" type="submit" className="w-full" disabled={loading}>
              {loading ? text(dictionary.auth.creatingAccount) : text(dictionary.auth.signUpButton)}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {text(dictionary.auth.haveAccount)}{' '}
            <a href="/login" className="text-primary hover:underline">{text(dictionary.auth.signInLink)}</a>
          </p>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
