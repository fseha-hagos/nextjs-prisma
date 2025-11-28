'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MoreVertical, Plus } from 'lucide-react';

type Organization = {
  id: string;
  name: string;
};

type Outline = {
  id: string;
  header: string;
  sectionType: string;
  status: string;
  reviewer: string;
  target?: number | null;
  limit?: number | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingOutline, setEditingOutline] = useState<Outline | null>(null);
  const [formData, setFormData] = useState({
    header: '',
    sectionType: 'Table_of_Contents',
    status: 'Pending',
    reviewer: 'Assim',
    target: '',
    limit: '',
  });
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  useEffect(() => {
    // First check session, then fetch organizations
    fetch('/api/auth/session', {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(sessionData => {
        if (!sessionData.user) {
          router.push('/login');
          return;
        }
        
        // Session is valid, now fetch organizations
        return fetch('/api/organizations', {
          credentials: 'include',
        });
      })
      .then(r => {
        if (!r) return; // Already redirected
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
    if (selectedOrgId) {
      fetchOutlines();
      fetchUserRole();
    }
  }, [selectedOrgId]);

  function fetchUserRole() {
    if (!selectedOrgId) return;
    fetch(`/api/organizations/me?orgId=${selectedOrgId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        setCurrentUserRole(data.role || 'member');
      })
      .catch(() => setCurrentUserRole('member'));
  }

  function fetchOutlines() {
    if (!selectedOrgId) return;
    fetch(`/api/outlines?orgId=${selectedOrgId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOutlines(data);
        }
      })
      .catch(err => console.error('Failed to fetch outlines:', err));
  }

  function handleOpenSheet(outline?: Outline) {
    if (outline) {
      setEditingOutline(outline);
      setFormData({
        header: outline.header,
        sectionType: outline.sectionType,
        status: outline.status,
        reviewer: outline.reviewer,
        target: outline.target?.toString() || '',
        limit: outline.limit?.toString() || '',
      });
    } else {
      setEditingOutline(null);
      setFormData({
        header: '',
        sectionType: 'Table_of_Contents',
        status: 'Pending',
        reviewer: 'Assim',
        target: '',
        limit: '',
      });
    }
    setSheetOpen(true);
  }

  function handleCloseSheet() {
    setSheetOpen(false);
    setEditingOutline(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingOutline 
        ? `/api/outlines/${editingOutline.id}`
        : '/api/outlines';
      const method = editingOutline ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          organizationId: selectedOrgId,
          target: formData.target ? parseInt(formData.target) : null,
          limit: formData.limit ? parseInt(formData.limit) : null,
        }),
      });

      if (res.ok) {
        handleCloseSheet();
        fetchOutlines();
      } else {
        alert('Failed to save outline');
      }
    } catch (err) {
      alert('An error occurred');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this outline?')) return;
    const res = await fetch(`/api/outlines/${id}`, { 
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      fetchOutlines();
    } else {
      alert('Failed to delete outline');
    }
  }

  function formatSectionType(type: string) {
    return type.replace(/_/g, ' ');
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
          router.push(`/dashboard?orgId=${id}`);
        }}
        currentUserRole={currentUserRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Outlines</h1>
            <Button onClick={() => handleOpenSheet()}>
              <Plus className="mr-2 h-4 w-4" />
              Add section
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Header</TableHead>
                  <TableHead>Section Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outlines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No outlines found. Click "Add section" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  outlines.map((outline) => (
                    <TableRow key={outline.id}>
                      <TableCell
                        className="cursor-pointer hover:underline"
                        onClick={() => handleOpenSheet(outline)}
                      >
                        {outline.header}
                      </TableCell>
                      <TableCell>{formatSectionType(outline.sectionType)}</TableCell>
                      <TableCell>{outline.status}</TableCell>
                      <TableCell>{outline.reviewer}</TableCell>
                      <TableCell>{outline.target ?? '-'}</TableCell>
                      <TableCell>{outline.limit ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenSheet(outline)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingOutline ? 'Edit Outline' : 'Add Outline'}</SheetTitle>
            <SheetDescription>
              {editingOutline ? 'Update the outline details' : 'Create a new outline section'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="header">Header</Label>
              <Input
                id="header"
                value={formData.header}
                onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionType">Section Type</Label>
              <Select
                id="sectionType"
                value={formData.sectionType}
                onChange={(e) => setFormData({ ...formData, sectionType: e.target.value })}
              >
                <option value="Table_of_Contents">Table of Contents</option>
                <option value="Executive_Summary">Executive Summary</option>
                <option value="Technical_Approach">Technical Approach</option>
                <option value="Design">Design</option>
                <option value="Capabilities">Capabilities</option>
                <option value="Focus_Document">Focus Document</option>
                <option value="Narrative">Narrative</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In_Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewer">Reviewer</Label>
              <Select
                id="reviewer"
                value={formData.reviewer}
                onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
              >
                <option value="Assim">Assim</option>
                <option value="Bini">Bini</option>
                <option value="Mami">Mami</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                type="number"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Input
                id="limit"
                type="number"
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingOutline ? 'Update' : 'Create'}
              </Button>
              {editingOutline && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (editingOutline) {
                      handleDelete(editingOutline.id);
                      handleCloseSheet();
                    }
                  }}
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleCloseSheet}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
