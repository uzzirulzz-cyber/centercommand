'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import AdminShell from '../../components/AdminShell';
import { SessionProvider } from '../../components/SessionProvider';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  // Re-apply the administrator's saved dashboard skin on every admin page.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pb_layout');
      if (saved) document.documentElement.dataset.pbLayout = saved;
    } catch { /* storage blocked — default skin applies */ }
  }, []);
  // The admin sign-in screen renders outside the authenticated shell.
  if (pathname.startsWith('/admin/signin')) return children;
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
