import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppNavLinks } from './AppNavLinks';
import { useNavGroupExpansion } from './use-nav-group-expansion';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { expandedGroups, toggleGroup } = useNavGroupExpansion(pathname);

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col bg-slate-900 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <Link
        to="/dashboard"
        title={collapsed ? 'Dashboard' : undefined}
        aria-label="Go to dashboard"
        className={cn(
          'flex shrink-0 items-center border-b border-slate-700/50 transition-colors',
          'cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/25',
          'hover:bg-slate-800/70',
          collapsed ? 'mx-1 justify-center py-4' : 'gap-2 px-4 py-3'
        )}
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-white" aria-hidden />
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight text-white">
            PassControl
          </span>
        )}
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        <AppNavLinks
          collapsed={collapsed}
          pathname={pathname}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
        />
      </nav>
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'flex items-center gap-3 border-t border-slate-700/50 p-3 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200',
          collapsed && 'justify-center px-2'
        )}
      >
        {collapsed ? (
          <PanelLeft className="h-5 w-5 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="h-5 w-5 shrink-0" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
