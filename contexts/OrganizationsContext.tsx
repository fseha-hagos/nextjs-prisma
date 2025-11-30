'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Organization = {
  id: string;
  name: string;
};

interface OrganizationsContextType {
  organizations: Organization[];
  selectedOrgId: string;
  setSelectedOrgId: (id: string) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
  currentUserRole: string;
  setCurrentUserRole: (role: string) => void;
}

const OrganizationsContext = createContext<OrganizationsContextType | undefined>(undefined);

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [initialized, setInitialized] = useState(false);

  const refreshOrganizations = useCallback(async () => {
    try {
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user) {
        router.push('/login');
        return;
      }

      const orgRes = await fetch('/api/organizations', {
        credentials: 'include',
      });

      if (orgRes.status === 401) {
        router.push('/login');
        return;
      }

      const data = await orgRes.json();
      if (data && Array.isArray(data)) {
        setOrganizations(data);
        
        // Use functional update to check current selectedOrgId
        setSelectedOrgId(currentId => {
          // Only set selectedOrgId if not already set or if current one is invalid
          if (!currentId || !data.find((o: Organization) => o.id === currentId)) {
            if (data.length > 0) {
              // Get orgId from URL if available
              if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const orgIdFromUrl = urlParams.get('orgId');
                if (orgIdFromUrl && data.find((o: Organization) => o.id === orgIdFromUrl)) {
                  return orgIdFromUrl;
                } else {
                  return data[0].id;
                }
              } else {
                return data[0].id;
              }
            }
          }
          return currentId;
        });
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!initialized) {
      refreshOrganizations().finally(() => {
        setLoading(false);
        setInitialized(true);
      });
    }
  }, [initialized, refreshOrganizations]);

  // Sync selectedOrgId with URL
  useEffect(() => {
    if (typeof window !== 'undefined' && initialized && organizations.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const orgIdFromUrl = urlParams.get('orgId');
      
      if (orgIdFromUrl && organizations.find((o: Organization) => o.id === orgIdFromUrl)) {
        if (selectedOrgId !== orgIdFromUrl) {
          setSelectedOrgId(orgIdFromUrl);
        }
      } else if (!orgIdFromUrl && selectedOrgId && organizations.length > 0) {
        // If no orgId in URL but we have a selected one, update URL
        const currentPath = window.location.pathname;
        router.replace(`${currentPath}?orgId=${selectedOrgId}`, { scroll: false });
      }
    }
  }, [organizations, initialized, selectedOrgId, router]);

  // Fetch user role when selectedOrgId changes
  useEffect(() => {
    if (selectedOrgId && initialized) {
      fetch(`/api/organizations/me?orgId=${selectedOrgId}`, {
        credentials: 'include',
      })
        .then(r => r.json())
        .then(data => {
          setCurrentUserRole(data.role || 'member');
        })
        .catch(() => setCurrentUserRole('member'));
    }
  }, [selectedOrgId, initialized]);

  const handleSetSelectedOrgId = useCallback((id: string) => {
    setSelectedOrgId(id);
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      router.push(`${currentPath}?orgId=${id}`, { scroll: false });
    }
  }, [router]);

  return (
    <OrganizationsContext.Provider
      value={{
        organizations,
        selectedOrgId,
        setSelectedOrgId: handleSetSelectedOrgId,
        loading,
        refreshOrganizations,
        currentUserRole,
        setCurrentUserRole,
      }}
    >
      {children}
    </OrganizationsContext.Provider>
  );
}

export function useOrganizations() {
  const context = useContext(OrganizationsContext);
  if (context === undefined) {
    throw new Error('useOrganizations must be used within an OrganizationsProvider');
  }
  return context;
}

