'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrganizations } from '@/contexts/OrganizationsContext';

function InviteContent() {
  const router = useRouter();
  const params = useParams();
  const { refreshOrganizations } = useOrganizations();
  const invitationId = params?.invitationId as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs-auth'>('loading');
  const [message, setMessage] = useState('');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      setMessage('Invalid invitation link. No invitation ID provided.');
      return;
    }

    const acceptInvitation = async () => {
      try {
        console.log('📧 Accepting invitation:', invitationId);

        // First, check if user is authenticated
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        });

        if (!sessionRes.ok || !(await sessionRes.json()).user) {
          // User not logged in - redirect to login with invitation ID
          setStatus('needs-auth');
          setMessage('Please sign in or create an account to accept this invitation.');
          return;
        }

        // Get invitation details first
        const inviteDetailsRes = await fetch(`/api/organizations/invite/${invitationId}`, {
          credentials: 'include',
        });

        if (inviteDetailsRes.ok) {
          const inviteData = await inviteDetailsRes.json();
          if (inviteData.organization) {
            setOrgName(inviteData.organization.name);
          }
        }

        // Accept the invitation
        const response = await fetch('/api/organizations/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: invitationId }),
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          setMessage(`Successfully joined ${orgName || 'the organization'}!`);
          
          // Refresh organizations list
          await refreshOrganizations();
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setStatus('error');
          setMessage(
            errorData.error || 
            errorData.message || 
            'Failed to accept invitation. The link may have expired or is invalid.'
          );
        }
      } catch (error: any) {
        console.error('Invitation acceptance error:', error);
        setStatus('error');
        setMessage('An error occurred while accepting the invitation. Please try again.');
      }
    };

    acceptInvitation();
  }, [invitationId, router, refreshOrganizations, orgName]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your invitation...'}
            {status === 'success' && 'Invitation accepted!'}
            {status === 'error' && 'Unable to accept invitation'}
            {status === 'needs-auth' && 'Sign in required'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {status === 'needs-auth' && (
            <div className="space-y-4">
              <div className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-sm p-3 rounded-md border border-blue-500/20">
                {message}
              </div>
              <div className="space-y-2">
                <Button onClick={() => router.push(`/login?redirect=/invite/${invitationId}`)} className="w-full">
                  Sign In
                </Button>
                <Button 
                  onClick={() => router.push(`/signup?redirect=/invite/${invitationId}`)} 
                  className="w-full" 
                  variant="outline"
                >
                  Create Account
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-3 rounded-md border border-green-500/20">
                {message}
              </div>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {message}
              </div>
              <div className="space-y-2">
                <Button onClick={() => router.push('/dashboard')} className="w-full" variant="outline">
                  Go to Dashboard
                </Button>
                <Button onClick={() => router.push('/login')} className="w-full" variant="outline">
                  Sign In
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
            <CardDescription>Processing your invitation...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}

