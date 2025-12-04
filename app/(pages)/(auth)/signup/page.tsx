'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const resp = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name || email.split('@')[0],
          email, 
          password,
        })
      });
      
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        
        // Check if email verification is required
        if (data.requiresVerification || data.message?.includes('verify')) {
          // Show success message about email verification
          setError('');
          setSuccess('Account created successfully! Please check your email inbox (and spam folder) for a verification link. You\'ll need to verify your email before you can sign in.');
          // Clear form
          setName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          // Don't redirect - let user read the message and check their email
        } else {
          // If verification is not required (shouldn't happen with our config), proceed with sign-in
          const signInResp = await fetch('/api/auth/sign-in/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
          });
          
          if (signInResp.ok) {
            await new Promise(resolve => setTimeout(resolve, 100));
            router.push('/dashboard');
          } else {
            const signInData = await signInResp.json().catch(() => ({}));
            setError(signInData.error || signInData.message || 'Account created but sign-in failed. Please try logging in.');
          }
        }
      } else {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || data.message || `Signup failed. Please try again.`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your information to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-3 rounded-md border border-green-500/20 space-y-2">
                <p className="font-semibold">✓ Account Created Successfully!</p>
                <p>{success}</p>
                <div className="mt-3 pt-3 border-t border-green-500/20">
                  <p className="text-xs text-green-600 dark:text-green-500">
                    After verifying your email, you can{' '}
                    <Link href="/login" className="underline font-semibold">
                      sign in here
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !!success}>
              {loading ? 'Creating account...' : success ? 'Check Your Email' : 'Sign up'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
