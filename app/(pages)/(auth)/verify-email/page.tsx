'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      // Check if verification was already successful (better-auth might redirect here after verification)
      // Try to verify by calling the better-auth endpoint
      const verifyEmail = async () => {
        try {
          // Better-auth might have already processed it, check if we can get user session
          const sessionRes = await fetch('/api/auth/session');
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            if (session?.user?.emailVerified) {
              setStatus('success');
              setMessage('Your email has been verified successfully! You can now sign in.');
              setTimeout(() => {
                router.push('/login?verified=true');
              }, 3000);
              return;
            }
          }
        } catch (err) {
          console.error('Session check error:', err);
        }
        
        setStatus('error');
        setMessage('No verification token provided. Please use the link from your email.');
      };
      verifyEmail();
      return;
    }

    // Verify email using better-auth endpoint
    fetch(`/api/auth/verify-email?token=${token}`, {
      method: 'GET',
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully! You can now sign in.');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setMessage(data.error || data.message || 'Verification failed. The link may have expired or is invalid.');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        console.error('Verification error:', err);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying your email address...'}
            {status === 'success' && 'Verification successful!'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-3 rounded-md border border-green-500/20">
                {message}
              </div>
              <Button onClick={() => router.push('/login')} className="w-full">
                Go to Sign In
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {message}
              </div>
              <div className="space-y-2">
                <Button onClick={() => router.push('/login')} className="w-full" variant="outline">
                  Go to Sign In
                </Button>
                <Button onClick={() => router.push('/signup')} className="w-full" variant="outline">
                  Sign Up Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
            <CardDescription>Verifying your email address...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

