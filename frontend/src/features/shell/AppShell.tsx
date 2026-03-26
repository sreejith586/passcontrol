import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileNavDrawer } from './MobileNavDrawer';

const SIDEBAR_STORAGE_KEY = 'passcontrol-sidebar-collapsed';

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(getStoredCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden shrink-0 lg:flex">
          <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50/80">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onClose={closeMobileNav} />
    </div>
  );
}
