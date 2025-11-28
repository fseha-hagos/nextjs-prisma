'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Trash2 } from 'lucide-react';

type Organization = {
  id: string;
  name: string;
};

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
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [currentOrgName, setCurrentOrgName] = useState('');

  useEffect(() => {
    fetch('/api/organizations')
      .then(r => {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        return r.json();
      })
      .then(data => {
        if (data) {
          setOrganizations(data);
          const orgIdFromUrl = searchParams.get('orgId');
          if (orgIdFromUrl && data.find((o: Organization) => o.id === orgIdFromUrl)) {
            setSelectedOrgId(orgIdFromUrl);
          } else if (data.length > 0) {
            setSelectedOrgId(data[0].id);
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch organizations:', err);
        router.push('/login');
      });
  }, [router, searchParams]);

  useEffect(() => {
    if (selectedOrgId && organizations.length > 0) {
      fetchMembers();
      fetchUserRole();
      fetchOrgName();
    }
  }, [selectedOrgId, organizations]);

  function fetchOrgName() {
    if (!selectedOrgId) return;
    const org = organizations.find(o => o.id === selectedOrgId);
    if (org) {
      setCurrentOrgName(org.name);
    }
  }

  function fetchUserRole() {
    if (!selectedOrgId) return;
    fetch(`/api/organizations/me?orgId=${selectedOrgId}`)
      .then(r => r.json())
      .then(data => {
        setIsOwner(data.role === 'owner');
      })
      .catch(() => setIsOwner(false));
  }

  function fetchMembers() {
    if (!selectedOrgId) return;
    fetch(`/api/organizations/members?orgId=${selectedOrgId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMembers(data);
        }
      })
      .catch(err => console.error('Failed to fetch members:', err));
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/organizations/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: selectedOrgId,
        email: inviteForm.email,
        role: inviteForm.role,
      }),
    });
    if (res.ok) {
      setInviteSheetOpen(false);
      setInviteForm({ email: '', role: 'member' });
      fetchMembers();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to invite member');
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    const res = await fetch(`/api/organizations/members/${memberId}?orgId=${selectedOrgId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      fetchMembers();
    } else {
      alert('Failed to remove member');
    }
  }

  if (organizations.length === 0) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">You don't have any organizations yet.</p>
            <Button onClick={() => router.push('/organization/create')}>
              Create Your First Organization
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        onOrgChange={(id) => {
          setSelectedOrgId(id);
          router.push(`/team?orgId=${id}`);
        }}
        currentUserRole={isOwner ? 'owner' : 'member'}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Team</h1>
              {currentOrgName && (
                <p className="text-sm text-muted-foreground mt-1">{currentOrgName}</p>
              )}
            </div>
            {isOwner && (
              <Button onClick={() => setInviteSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isOwner && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4} className="text-center text-muted-foreground py-8">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user?.name || 'N/A'}</TableCell>
                      <TableCell>{member.user?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          member.role === 'owner' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {member.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </main>
      </div>

      <Sheet open={inviteSheetOpen} onOpenChange={setInviteSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Team Member</SheetTitle>
            <SheetDescription>
              Invite a new member to join this organization
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleInviteMember} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Send Invite
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
    </div>
  );
}

