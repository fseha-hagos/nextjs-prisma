'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  resetContext: () => void;
  currentUserRole: string;
  setCurrentUserRole: (role: string) => void;
}

const OrganizationsContext = createContext<OrganizationsContextType | undefined>(undefined);

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [initialized, setInitialized] = useState(false);
  const isUserInitiatedChange = useRef(false);

  const resetContext = useCallback(() => {
    setOrganizations([]);
    setSelectedOrgId('');
    setCurrentUserRole('member');
    setInitialized(false);
    setLoading(true);
  }, []);

  const refreshOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      
      if (!sessionRes.ok) {
        console.error('Failed to fetch session:', sessionRes.status);
        // Only reset if we're not already on a public route
        if (typeof window !== 'undefined') {
          const pathname = window.location.pathname;
          if (pathname !== '/login' && pathname !== '/signup') {
            resetContext();
          }
        } else {
          resetContext();
        }
        return;
      }
      
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user) {
        // Only reset and redirect if we're not already on a public route
        if (typeof window !== 'undefined') {
          const pathname = window.location.pathname;
          if (pathname !== '/login' && pathname !== '/signup') {
            resetContext();
            router.push('/login');
          }
        } else {
          resetContext();
          router.push('/login');
        }
        return;
      }

      const orgRes = await fetch('/api/organizations', {
        credentials: 'include',
      });

      if (orgRes.status === 401) {
        // Only reset and redirect if we're not already on a public route
        if (typeof window !== 'undefined') {
          const pathname = window.location.pathname;
          if (pathname !== '/login' && pathname !== '/signup') {
            resetContext();
            router.push('/login');
          }
        } else {
          resetContext();
          router.push('/login');
        }
        return;
      }

      if (!orgRes.ok) {
        const errorData = await orgRes.json().catch(() => ({}));
        console.error('Failed to fetch organizations:', orgRes.status, orgRes.statusText, errorData);
        // Don't clear organizations on error - keep existing state
        // Only clear if it's a 403 (forbidden) or 404 (not found)
        if (orgRes.status === 403 || orgRes.status === 404) {
          setOrganizations([]);
        }
        setLoading(false);
        throw new Error(errorData.error || `Failed to fetch organizations: ${orgRes.statusText}`);
      }

      const data = await orgRes.json();
      
      console.log('Organizations API response status:', orgRes.status);
      console.log('Organizations API response data:', data);
      console.log('Is array?', Array.isArray(data));
      
      // Check if response is an error object
      if (data && data.error) {
        console.error('API returned error:', data.error);
        // Don't clear organizations on error - keep existing state
        setLoading(false);
        throw new Error(data.error);
      }
      
      if (data && Array.isArray(data)) {
        console.log('Setting organizations:', data.length, 'organizations');
        // Always update organizations state, even if empty
        // Use a new array reference to ensure React detects the change
        // Only set organizations if we have a valid session
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
      // Don't clear organizations on network errors - keep existing state
      setLoading(false);
      // Re-throw the error so callers can handle it
      throw err;
    }
  }, [router, resetContext]);

  useEffect(() => {
    if (!initialized) {
      // Don't refresh on public routes (login, signup)
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (pathname === '/login' || pathname === '/signup') {
          setLoading(false);
          setInitialized(true);
          return;
        }
      }
      refreshOrganizations().finally(() => {
        setLoading(false);
        setInitialized(true);
      });
    }
  }, [initialized, refreshOrganizations]);

  // Reset context when session changes (handles logout)
  // Only check on visibility change and only if we're on a protected route
  useEffect(() => {
    const checkSession = async () => {
      // Don't check session on public routes (login, signup)
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (pathname === '/login' || pathname === '/signup') {
          return;
        }
      }

      try {
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (!sessionData.user && initialized) {
            // Session expired or user logged out - reset only once
            resetContext();
          }
        }
      } catch (err) {
        // Ignore errors during session check
      }
    };

    // Only check on visibility change, not periodically
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized) {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialized, resetContext]);

  // Only refresh once on initialization - don't keep refreshing if user has no organizations
  // This prevents unnecessary API calls when user legitimately has 0 organizations

  // Sync selectedOrgId with URL (only when URL changes externally, not on user-initiated changes)
  useEffect(() => {
    if (typeof window !== 'undefined' && initialized && organizations.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const orgIdFromUrl = urlParams.get('orgId');
      
      // Skip if this is a user-initiated change (we just updated the URL)
      if (isUserInitiatedChange.current) {
        isUserInitiatedChange.current = false;
        return;
      }
      
      if (orgIdFromUrl && organizations.find((o: Organization) => o.id === orgIdFromUrl)) {
        // Only update state if URL has a different orgId than current state
        // This handles browser back/forward navigation
        if (selectedOrgId !== orgIdFromUrl) {
          setSelectedOrgId(orgIdFromUrl);
        }
      } else if (!orgIdFromUrl && selectedOrgId && organizations.length > 0) {
        // If no orgId in URL but we have a selected one, update URL
        router.replace(`${pathname}?orgId=${selectedOrgId}`, { scroll: false });
      }
    }
  }, [organizations, initialized, router, pathname, selectedOrgId]);

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
    // Mark this as a user-initiated change to prevent URL sync from interfering
    isUserInitiatedChange.current = true;
    // Update state first
    setSelectedOrgId(id);
    // Then update URL
    router.replace(`${pathname}?orgId=${id}`, { scroll: false });
  }, [router, pathname]);

  return (
    <OrganizationsContext.Provider
      value={{
        organizations,
        selectedOrgId,
        setSelectedOrgId: handleSetSelectedOrgId,
        loading,
        refreshOrganizations,
        resetContext,
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

