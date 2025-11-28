'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  organizations: Array<{ id: string; name: string }>;
  selectedOrgId: string | null;
  onOrgChange: (orgId: string) => void;
  currentUserRole?: string;
}

export function Sidebar({ organizations, selectedOrgId, onOrgChange, currentUserRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Workspace</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          <div className="px-3 py-2">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Organization</h3>
            <select
              value={selectedOrgId || ''}
              onChange={(e) => onOrgChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <nav className="space-y-1">
            <Link
              href={`/dashboard?orgId=${selectedOrgId}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === '/dashboard' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span>Table</span>
            </Link>
            <Link
              href={`/team?orgId=${selectedOrgId}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === '/team' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span>Team</span>
            </Link>
          </nav>
        </div>
      </div>
      <div className="border-t p-4">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/organization/create')}
          >
            Create Organization
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/organization/join')}
          >
            Join Organization
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

