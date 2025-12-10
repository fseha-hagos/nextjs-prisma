'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MoreVertical, Plus, GripVertical, Edit2, Trash2, Loader2, Building2, RefreshCw, ChevronDown, Settings2, User, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Menu } from 'lucide-react';
import { useOrganizations } from '@/contexts/OrganizationsContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  const pathname = usePathname();
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<{ name: string; email: string; image?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('outline');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState({
    header: true,
    sectionType: true,
    status: true,
    target: true,
    limit: true,
    reviewer: true,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === paginatedOutlines.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedOutlines.map(o => o.id)));
    }
  };

  const totalPages = Math.ceil(outlines.length / rowsPerPage);
  const paginatedOutlines = outlines.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 xl:w-72">
      <Sidebar
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        onOrgChange={setSelectedOrgId}
        currentUserRole={currentUserRole}
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
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            {/* Top row: Menu button, tabs, and user menu */}
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Mobile menu button */}
              <div className="flex items-center gap-3 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Tabs */}
              <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="h-9 sm:h-10 bg-muted/50 p-1 inline-flex">
                  <TabsTrigger 
                    value="outline" 
                      className="px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    Outline
                  </TabsTrigger>
                 <TabsTrigger 
                    value="past-performance" 
                      className="px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all relative"
                  >
                      <span className="hidden sm:inline">Past Performance</span>
                      <span className="sm:hidden">Past</span>
                      <Badge variant="secondary" className="ml-1.5 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs font-semibold">1</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              </div>

              {/* User menu - desktop */}
              <div className="hidden md:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 h-auto py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                        <AvatarImage src={user?.image} alt={user?.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden lg:flex flex-col items-start">
                        <span className="text-sm font-semibold text-foreground leading-tight">{user?.name || 'User'}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{user?.email || ''}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 ml-1 text-muted-foreground hidden lg:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
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
                    <DropdownMenuItem>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* User menu - mobile */}
              <div className="flex md:hidden items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                        <AvatarImage src={user?.image} alt={user?.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
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
                    <DropdownMenuItem>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
              <Button onClick={() => handleOpenSheet()} className="gap-2 h-9 sm:h-10 px-3 sm:px-4 shadow-sm">
                  <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Section</span>
                <span className="sm:hidden">Add</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9 sm:h-10 px-3 sm:px-4">
                      <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Customize Columns</span>
                    <span className="sm:hidden">Columns</span>
                    <ChevronDown className="h-4 w-4 hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                      <Checkbox
                        checked={visibleColumns.header}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, header: !!checked }))}
                        className="mr-2"
                      />
                      Header
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                      <Checkbox
                        checked={visibleColumns.sectionType}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, sectionType: !!checked }))}
                        className="mr-2"
                      />
                      Section Type
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                      <Checkbox
                        checked={visibleColumns.status}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, status: !!checked }))}
                        className="mr-2"
                      />
                      Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                      <Checkbox
                        checked={visibleColumns.target}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, target: !!checked }))}
                        className="mr-2"
                      />
                      Target
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                      <Checkbox
                        checked={visibleColumns.limit}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, limit: !!checked }))}
                        className="mr-2"
                      />
                      Limit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                      <Checkbox
                        checked={visibleColumns.reviewer}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, reviewer: !!checked }))}
                        className="mr-2"
                      />
                      Reviewer
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b bg-muted/30">
                      <TableHead className="w-12 sm:w-14 px-3 sm:px-6">
                        <Checkbox
                          checked={selectedRows.size === paginatedOutlines.length && paginatedOutlines.length > 0}
                          onCheckedChange={toggleAllRows}
                          className="border-2"
                        />
                      </TableHead>
                      <TableHead className="w-8 sm:w-10 px-2 sm:px-4"></TableHead>
                      {visibleColumns.header && <TableHead className="font-semibold text-xs sm:text-sm px-3 sm:px-6 py-3 sm:py-4 min-w-[120px]">Header</TableHead>}
                      {visibleColumns.sectionType && <TableHead className="font-semibold text-xs sm:text-sm px-3 sm:px-6 py-3 sm:py-4 min-w-[140px]">Section Type</TableHead>}
                      {visibleColumns.status && <TableHead className="font-semibold text-xs sm:text-sm px-3 sm:px-6 py-3 sm:py-4 min-w-[100px]">Status</TableHead>}
                      {visibleColumns.target && <TableHead className="font-semibold text-xs sm:text-sm px-3 sm:px-6 py-3 sm:py-4 min-w-[80px]">Target</TableHead>}
                      {visibleColumns.limit && <TableHead className="font-semibold text-xs sm:text-sm px-3 sm:px-6 py-3 sm:py-4 min-w-[80px]">Limit</TableHead>}
                      {visibleColumns.reviewer && <TableHead className="font-semibold text-xs sm:text-sm px-3 sm:px-6 py-3 sm:py-4 min-w-[100px]">Reviewer</TableHead>}
                      <TableHead className="w-[60px] sm:w-[80px] px-3 sm:px-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outlinesLoading ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 3} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading outlines...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : outlines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 3} className="text-center py-12">
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
                      paginatedOutlines.map((outline) => (
                        <TableRow 
                          key={outline.id}
                          className={cn(
                            "group cursor-pointer hover:bg-muted/40 transition-all duration-200 border-b",
                            selectedRows.has(outline.id) && "bg-primary/5 hover:bg-primary/10"
                          )}
                          onClick={() => handleOpenSheet(outline)}
                        >
                          <TableCell className="w-12 sm:w-14 px-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(outline.id)}
                              onCheckedChange={() => toggleRowSelection(outline.id)}
                              className="border-2"
                            />
                          </TableCell>
                          <TableCell className="w-8 sm:w-10 px-2 sm:px-4">
                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                          </TableCell>
                          {visibleColumns.header && (
                            <TableCell className="font-medium px-3 sm:px-6 py-3 sm:py-4">
                              <span className="text-xs sm:text-sm">{outline.header}</span>
                            </TableCell>
                          )}
                          {visibleColumns.sectionType && (
                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                              <Badge variant="outline" className="text-[10px] sm:text-xs font-normal">
                                {formatSectionType(outline.sectionType)}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                              <Badge variant={getStatusVariant(outline.status)} className="text-[10px] sm:text-xs">
                                {outline.status.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                          )}
                          {visibleColumns.target && (
                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                              <span className="text-xs sm:text-sm font-medium">{outline.target ?? '-'}</span>
                            </TableCell>
                          )}
                          {visibleColumns.limit && (
                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                              <span className="text-xs sm:text-sm font-medium">{outline.limit ?? '-'}</span>
                            </TableCell>
                          )}
                          {visibleColumns.reviewer && (
                            <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                {outline.reviewer}
                              </span>
                            </TableCell>
                          )}
                          <TableCell onClick={(e) => e.stopPropagation()} className="px-3 sm:px-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-100  transition-opacity"
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
              {/* Bottom Navigation */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t px-4 sm:px-6 py-4 bg-muted/40 backdrop-blur-sm">
                <div className="text-xs sm:text-sm font-medium text-foreground">
                  {selectedRows.size > 0 ? (
                    <span className="text-primary">{selectedRows.size} of {outlines.length} row(s) selected.</span>
                  ) : (
                    <span className="text-muted-foreground">{outlines.length} row(s) total</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">Rows per page</span>
                    <Select
                      value={rowsPerPage.toString()}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 w-[80px] border-2"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 border-2"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 border-2"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 border-2"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 border-2"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
          <SheetHeader className="space-y-3 pb-4 border-b">
            <SheetTitle className="text-xl sm:text-2xl">{editingOutline ? 'Edit Outline' : 'Add Outline'}</SheetTitle>
            <SheetDescription className="text-sm sm:text-base">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button type="submit" className="flex-1 sm:flex-none" disabled={submitLoading}>
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
                  className="flex-1 sm:flex-none"
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
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={handleCloseSheet}>
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
