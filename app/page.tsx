'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          // User is logged in, redirect to dashboard
          router.replace('/dashboard');
        } else {
          // User is not logged in, redirect to login
          router.replace('/login');
        }
      })
      .catch(() => {
        // On error, redirect to login
        router.replace('/login');
      })
      .finally(() => {
        setChecking(false);
      });
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">{checking ? 'Checking authentication...' : 'Redirecting...'}</div>
    </div>
  );
}
