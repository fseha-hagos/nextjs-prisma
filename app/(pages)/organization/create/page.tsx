'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizations } from '@/contexts/OrganizationsContext';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

export default function CreateOrg() {
  const router = useRouter();
  const { refreshOrganizations } = useOrganizations();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshOrganizations();
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to refresh:', err);
      // Still navigate to dashboard even if refresh fails
      router.push('/dashboard');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const r = await fetch('/api/organizations', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name })
      });
      
      if (r.ok) {
        const data = await r.json();
        // Refresh organizations in context to include the new one
        try {
          await refreshOrganizations();
        } catch (refreshError) {
          console.error('Failed to refresh organizations after creation:', refreshError);
          // Continue anyway - the organization was created successfully
          // The context will refresh on next page load
        }
        // Use router.refresh() to force Next.js to refresh the page data
        router.refresh();
        // Redirect to dashboard with the new organization ID
        router.push(`/dashboard?orgId=${data.id}`);
      } else {
        const data = await r.json();
        setError(data.error || 'Failed to create organization');
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
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
          <CardDescription>
            Create a new organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                disabled={loading}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
          <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh & Go to Dashboard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
