'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MoreVertical, Plus, GripVertical, Edit2, Trash2, Loader2, Building2, RefreshCw } from 'lucide-react';
import { useOrganizations } from '@/contexts/OrganizationsContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  const { toast } = useToast();
  const { organizations, selectedOrgId, setSelectedOrgId, loading: orgsLoading, currentUserRole, refreshOrganizations } = useOrganizations();
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [outlinesLoading, setOutlinesLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingOutline, setEditingOutline] = useState<Outline | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [outlineToDelete, setOutlineToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    header: '',
    sectionType: 'Table_of_Contents',
    status: 'Pending',
    reviewer: 'Assim',
    target: '',
    limit: '',
  });
  const [orgName, setOrgName] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refresh organizations when page becomes visible (handles tab switching, etc.)
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible' && organizations.length > 0) {
        refreshOrganizations().catch(err => {
          console.error('Failed to refresh organizations on visibility change:', err);
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshOrganizations, organizations.length]);


  useEffect(() => {
    if (selectedOrgId && !orgsLoading) {
      fetchOutlines();
    }
  }, [selectedOrgId, orgsLoading]);

  function fetchOutlines() {
    if (!selectedOrgId) return;
    setOutlinesLoading(true);
    fetch(`/api/outlines?orgId=${selectedOrgId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOutlines(data);
        }
      })
      .catch(err => console.error('Failed to fetch outlines:', err))
      .finally(() => setOutlinesLoading(false));
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
    setSubmitLoading(true);
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
        toast({
          variant: 'success',
          title: 'Success',
          description: editingOutline ? 'Outline updated successfully' : 'Outline created successfully',
        });
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to save outline',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while saving the outline',
      });
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleDeleteClick(id: string) {
    setOutlineToDelete(id);
    setDeleteDialogOpen(true);
  }

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


  async function handleDelete() {
    if (!outlineToDelete) return;
    setDeleteDialogOpen(false);
    setDeleteLoading(outlineToDelete);
    try {
      const res = await fetch(`/api/outlines/${outlineToDelete}`, { 
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchOutlines();
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Outline deleted successfully',
        });
      } else {
        const data = await res.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete outline',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while deleting the outline',
      });
    } finally {
      setDeleteLoading(null);
      setOutlineToDelete(null);
    }
  }

  function formatSectionType(type: string) {
    return type.replace(/_/g, ' ');
  }

  function getStatusVariant(status: string): "default" | "success" | "warning" | "info" {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'success';
      case 'in_progress':
      case 'in process':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
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

  // Render create organization form if user has no organizations
  if (!orgsLoading && organizations.length === 0) {
    async function handleCreateOrg(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setCreateError('');
      setCreateLoading(true);
      
      try {
        const r = await fetch('/api/organizations', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ name: orgName })
        });
        
        if (r.ok) {
          const data = await r.json();
          // Refresh organizations in context to include the new one
          try {
            await refreshOrganizations();
          } catch (refreshError) {
            console.error('Failed to refresh organizations after creation:', refreshError);
          }
          router.refresh();
          router.push(`/dashboard?orgId=${data.id}`);
        } else {
          const data = await r.json();
          setCreateError(data.error || 'Failed to create organization');
        }
      } catch (err) {
        setCreateError('An error occurred. Please try again.');
      } finally {
        setCreateLoading(false);
      }
    }

    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Organization</CardTitle>
              <CardDescription>
                Create a new organization to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                {createError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                    {createError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    name="orgName"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Enter organization name"
                    disabled={createLoading}
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" disabled={createLoading} className="flex-1">
                    {createLoading ? 'Creating...' : 'Create Organization'}
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Go to Dashboard'}
            </Button>
          </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        onOrgChange={setSelectedOrgId}
        currentUserRole={currentUserRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Table</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your outline sections and track progress
              </p>
            </div>
            <Button onClick={() => handleOpenSheet()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Section
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="p-6">
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-semibold">Header</TableHead>
                      <TableHead className="font-semibold">Section Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Target</TableHead>
                      <TableHead className="font-semibold">Limit</TableHead>
                      <TableHead className="font-semibold">Reviewer</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outlinesLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading outlines...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : outlines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-3">
                              <Plus className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">No outlines found</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Click "Add Section" to create your first outline
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      outlines.map((outline) => (
                        <TableRow 
                          key={outline.id}
                          className="group cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleOpenSheet(outline)}
                        >
                          <TableCell className="w-8">
                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TableCell>
                          <TableCell className="font-medium">
                            {outline.header}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatSectionType(outline.sectionType)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(outline.status)}>
                              {outline.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{outline.target ?? '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{outline.limit ?? '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {outline.reviewer}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenSheet(outline)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={deleteLoading === outline.id ? undefined : () => handleDeleteClick(outline.id)}
                                  className={cn(
                                    "text-destructive focus:text-destructive",
                                    deleteLoading === outline.id && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {deleteLoading === outline.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-[540px]">
          <SheetHeader className="space-y-3 pb-4 border-b">
            <SheetTitle className="text-2xl">{editingOutline ? 'Edit Outline' : 'Add Outline'}</SheetTitle>
            <SheetDescription className="text-base">
              {editingOutline ? 'Update the outline details below' : 'Fill in the details to create a new outline section'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="header" className="text-sm font-medium">Header</Label>
              <Input
                id="header"
                value={formData.header}
                onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                placeholder="Enter outline header"
                className="h-10"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sectionType" className="text-sm font-medium">Section Type</Label>
                <Select
                  id="sectionType"
                  value={formData.sectionType}
                  onChange={(e) => setFormData({ ...formData, sectionType: e.target.value })}
                  className="h-10"
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
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-10"
                >
                  <option value="Pending">Pending</option>
                  <option value="In_Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewer" className="text-sm font-medium">Reviewer</Label>
              <Select
                id="reviewer"
                value={formData.reviewer}
                onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                className="h-10"
              >
                <option value="Assim">Assim</option>
                <option value="Bini">Bini</option>
                <option value="Mami">Mami</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target" className="text-sm font-medium">Target</Label>
                <Input
                  id="target"
                  type="number"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  placeholder="Optional"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit" className="text-sm font-medium">Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                  placeholder="Optional"
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" className="flex-1" disabled={submitLoading}>
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingOutline ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingOutline ? 'Update Outline' : 'Create Outline'
                )}
              </Button>
              {editingOutline && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setOutlineToDelete(editingOutline.id);
                    setDeleteDialogOpen(true);
                    handleCloseSheet();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Outline"
        description="Are you sure you want to delete this outline? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
