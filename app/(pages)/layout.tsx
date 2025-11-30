'use client';
import { OrganizationsProvider } from '@/contexts/OrganizationsContext';

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizationsProvider>{children}</OrganizationsProvider>;
}

