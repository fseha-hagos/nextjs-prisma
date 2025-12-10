'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Plus, 
  LogIn, 
  LogOut,
  ChevronDown,
  Check,
  User,
  Settings2
} from 'lucide-react';
import { useState } from 'react';
import { useOrganizations } from '@/contexts/OrganizationsContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
  organizations: Array<{ id: string; name: string }>;
  selectedOrgId: string | null;
  onOrgChange: (orgId: string) => void;
  currentUserRole?: string;
  onClose?: () => void;
  user?: { name: string; email: string; image?: string } | null;
}

export function Sidebar({ organizations, selectedOrgId, onOrgChange, currentUserRole, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const { resetContext } = useOrganizations();

  const handleSignOut = async () => {
    // Reset context immediately to clear all state
    resetContext();
    // Sign out from server
    await fetch('/api/auth/sign-out', { method: 'POST' });
    // Redirect to login
    router.push('/login');
  };

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  return (
    <div className="flex h-full w-full flex-col border-r bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-sm">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6 bg-sidebar/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Platform</h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* User Profile */}
        {user && (
          <div className="space-y-2">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-accent/50 transition-colors">
                  <Avatar className="h-8 w-8 border-2 border-sidebar-border shadow-sm">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col items-start min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate w-full">{user.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{user.email || ''}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Organization Selector */}
        <div className="space-y-2">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Organization
          </h3>
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full flex items-center justify-between rounded-lg border border-sidebar-border bg-background/50 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{selectedOrg?.name || 'Select organization'}</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                orgDropdownOpen && "rotate-180"
              )} />
            </button>
            
            {orgDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-sidebar-border bg-popover shadow-lg">
                <div className="p-1">
                  {organizations.map(org => (
                    <button
                      key={org.id}
                      onClick={() => {
                        onOrgChange(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        selectedOrgId === org.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="flex-1 text-left truncate">{org.name}</span>
                      {selectedOrgId === org.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            View
          </h3>
          <Link
            href={`/dashboard?orgId=${selectedOrgId}`}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              pathname === '/dashboard'
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Table</span>
          </Link>
          <Link
            href={`/team?orgId=${selectedOrgId}`}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              pathname === '/team'
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Team Info / Setup</span>
          </Link>
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-sidebar-border p-4 space-y-2 bg-sidebar/50">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            router.push('/organization/create');
            onClose?.();
          }}
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            router.push('/organization/join');
            onClose?.();
          }}
        >
          <LogIn className="h-4 w-4" />
          Join Organization
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

