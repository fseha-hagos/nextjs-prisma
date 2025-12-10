'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Trash2, Loader2, UserPlus, Building2, Menu } from 'lucide-react';
import { useOrganizations } from '@/contexts/OrganizationsContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export default function TeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { organizations, selectedOrgId, setSelectedOrgId, loading: orgsLoading, currentUserRole } = useOrganizations();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; image?: string } | null>(null);

  const isOwner = currentUserRole === 'owner';
  const currentOrgName = organizations.find(o => o.id === selectedOrgId)?.name || '';

  // Fetch user data
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser({
            name: data.user.name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || '',
            image: data.user.image || undefined,
          });
        }
      })
      .catch(err => console.error('Failed to fetch user:', err));
  }, []);

  useEffect(() => {
    if (selectedOrgId && !orgsLoading) {
      fetchMembers();
    }
  }, [selectedOrgId, orgsLoading]);

  function fetchMembers() {
    if (!selectedOrgId) return;
    setMembersLoading(true);
    fetch(`/api/organizations/members?orgId=${selectedOrgId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMembers(data);
        }
      })
      .catch(err => console.error('Failed to fetch members:', err))
      .finally(() => setMembersLoading(false));
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
      });
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch('/api/organizations/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId: selectedOrgId,
          email: inviteForm.email.trim().toLowerCase(),
          role: inviteForm.role,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Store email before clearing form
        const invitedEmail = inviteForm.email.trim();
        
        setInviteSheetOpen(false);
        setInviteForm({ email: '', role: 'member' });
        setEmailError('');
        fetchMembers();
        
        // Show specific messages based on what happened
        if (data.message === 'Member added successfully') {
          toast({
            variant: 'success',
            title: 'Member Added',
            description: `${invitedEmail} has been added to the organization`,
          });
        } else if (data.message === 'Member already exists') {
          toast({
            variant: 'success',
            title: 'Already a Member',
            description: `${invitedEmail} is already a member of this organization`,
          });
        } else if (data.message?.includes('Invitation created') || data.message?.includes('Invitation updated')) {
          // Check if email was actually sent
          if (data.emailSent === false) {
            toast({
              variant: 'destructive',
              title: 'Invitation Created but Email Failed',
              description: `Invitation was created but email failed to send: ${data.emailError || 'Unknown error'}. You can share the invitation link manually.`,
            });
          } else {
            toast({
              variant: 'success',
              title: 'Invitation Sent ✓',
              description: `Invitation sent to ${invitedEmail}. They will receive an email to join the organization.`,
            });
          }
        } else {
          toast({
            variant: 'success',
            title: 'Success',
            description: data.message || 'Action completed successfully',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to invite member',
        });
      }
    } catch (err) {
      console.error('Invite error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while inviting the member. Please try again.',
      });
    } finally {
      setInviteLoading(false);
    }
  }

  function handleRemoveMemberClick(memberId: string) {
    setMemberToDelete(memberId);
    setDeleteDialogOpen(true);
  }

  async function handleRemoveMember() {
    if (!memberToDelete) return;
    setDeleteDialogOpen(false);
    setRemoveLoading(memberToDelete);
    try {
      const res = await fetch(`/api/organizations/members/${memberToDelete}?orgId=${selectedOrgId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchMembers();
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Member removed successfully',
        });
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to remove member',
        });
      }
    } catch (err) {
      console.error('Remove member error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while removing the member',
      });
    } finally {
      setRemoveLoading(null);
      setMemberToDelete(null);
    }
  }

  // Only show full page loading on initial organizations load
  if (orgsLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4">
            <div className="rounded-full bg-muted p-6 w-20 h-20 mx-auto flex items-center justify-center">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No organizations yet</h2>
              <p className="text-muted-foreground">
                Get started by creating your first organization or joining an existing one.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => router.push('/organization/create')} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
              <Button onClick={() => router.push('/organization/join')} variant="outline" size="lg">
                Join Organization
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 xl:w-72">
        <Sidebar
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          onOrgChange={setSelectedOrgId}
          currentUserRole={currentUserRole}
          user={user}
        />
      </div>
      
      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-sm">
          <Sidebar
            organizations={organizations}
            selectedOrgId={selectedOrgId}
            onOrgChange={(orgId) => {
              setSelectedOrgId(orgId);
              setSidebarOpen(false);
            }}
            currentUserRole={currentUserRole}
            onClose={() => setSidebarOpen(false)}
            user={user}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-9 w-9 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Team Info / Setup</h1>
                {currentOrgName && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{currentOrgName}</p>
                )}
              </div>
            </div>
            {isOwner && (
              <Button onClick={() => setInviteSheetOpen(true)} className="gap-2 h-9 sm:h-10 px-3 sm:px-4">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite Member</span>
                <span className="sm:hidden">Invite</span>
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="p-6">
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Joined</TableHead>
                      {isOwner && <TableHead className="w-[100px] font-semibold">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          {isOwner && <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>}
                        </TableRow>
                      ))
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isOwner ? 5 : 4} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-3">
                              <UserPlus className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">No team members</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {isOwner ? 'Invite members to join your organization' : 'No members found'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">
                            {member.user?.name || 'N/A'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.user?.email || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(member.joinedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          {isOwner && (
                            <TableCell>
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMemberClick(member.id)}
                              disabled={removeLoading === member.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {removeLoading === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Sheet open={inviteSheetOpen} onOpenChange={(open) => {
        setInviteSheetOpen(open);
        if (!open) {
          setInviteForm({ email: '', role: 'member' });
          setEmailError('');
        }
      }}>
        <SheetContent className="sm:max-w-[540px]">
          <SheetHeader className="space-y-3 pb-4 border-b">
            <SheetTitle className="text-2xl">Invite Team Member</SheetTitle>
            <SheetDescription className="text-base">
              Send an invitation to a new member to join this organization
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleInviteMember} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setInviteForm({ ...inviteForm, email });
                  
                  // Real-time email validation
                  if (email && email.length > 0) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                      setEmailError('Please enter a valid email address');
                    } else {
                      setEmailError('');
                    }
                  } else {
                    setEmailError('');
                  }
                }}
                placeholder="user@example.com"
                className={cn("h-10", emailError && "border-destructive focus-visible:ring-destructive")}
                required
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Role</Label>
              <Select
                id="role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="h-10"
              >
                <option value="member">Member</option>
                {/* Only one owner is allowed per organization. Owners invite members as "member". */}
              </Select>
            </div>
            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" className="flex-1" disabled={inviteLoading}>
                {inviteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteSheetOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Team Member"
        description="Are you sure you want to remove this member from the organization? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}

