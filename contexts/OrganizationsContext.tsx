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
      setLoading(true);
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user) {
        router.push('/login');
        setLoading(false);
        return;
      }

      const orgRes = await fetch('/api/organizations', {
        credentials: 'include',
      });

      if (orgRes.status === 401) {
        router.push('/login');
        setLoading(false);
        return;
      }

      if (!orgRes.ok) {
        const errorData = await orgRes.json().catch(() => ({}));
        console.error('Failed to fetch organizations:', orgRes.status, orgRes.statusText, errorData);
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const data = await orgRes.json();
      
      console.log('Organizations API response status:', orgRes.status);
      console.log('Organizations API response data:', data);
      console.log('Is array?', Array.isArray(data));
      
      // Check if response is an error object
      if (data && data.error) {
        console.error('API returned error:', data.error);
        setOrganizations([]);
        setLoading(false);
        return;
      }
      
      if (data && Array.isArray(data)) {
        console.log('Setting organizations:', data.length, 'organizations');
        // Always update organizations state, even if empty
        // Use a new array reference to ensure React detects the change
        setOrganizations([...data]);
        
        // Use functional update to check current selectedOrgId
        setSelectedOrgId(currentId => {
          // If user has organizations, ensure first one is always selected on first load
          if (data.length > 0) {
            // Get orgId from URL if available
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const orgIdFromUrl = urlParams.get('orgId');
              if (orgIdFromUrl && data.find((o: Organization) => o.id === orgIdFromUrl)) {
                return orgIdFromUrl;
              }
            }
            // If no current selection or current selection is invalid, use first organization
            if (!currentId || !data.find((o: Organization) => o.id === currentId)) {
              return data[0].id; // First organization becomes active/default
            }
          }
          return currentId;
        });
      } else {
        // If data is not an array, log error and set empty array
        console.error('Organizations data is not an array:', data);
        setOrganizations([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setOrganizations([]);
      setLoading(false);
      // Don't redirect to login on network errors, just show empty state
      if (err instanceof Error && err.message.includes('fetch')) {
        return;
      }
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

  // Force refresh if we have a session but no organizations (handles login case)
  // This runs once after initialization if organizations are still empty
  useEffect(() => {
    if (initialized && organizations.length === 0 && !loading) {
      // Small delay to ensure session cookies are set after login
      const timer = setTimeout(() => {
        // Check if we have a valid session
        fetch('/api/auth/session', { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            // If we have a session but no organizations, refresh
            if (data.user) {
              console.log('Session detected but no organizations, refreshing...');
              refreshOrganizations();
            }
          })
          .catch(() => {
            // Ignore errors
          });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialized]); // Only depend on initialized to avoid loops

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

