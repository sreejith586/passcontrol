import { useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link, useLocation } from 'react-router-dom';
import { X, ShieldCheck } from 'lucide-react';
import { AppNavLinks } from './AppNavLinks';
import { useNavGroupExpansion } from './use-nav-group-expansion';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { pathname } = useLocation();
  const { expandedGroups, toggleGroup } = useNavGroupExpansion(pathname);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      onCloseRef.current();
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-[100] flex w-56 max-w-[85vw] flex-col bg-slate-900 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onEscapeKeyDown={onClose}
          onInteractOutside={onClose}
        >
          <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 px-3 py-3">
            <Link
              to="/dashboard"
              onClick={onClose}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <ShieldCheck className="h-5 w-5 shrink-0 text-white" aria-hidden />
              <span className="truncate text-sm font-semibold tracking-tight text-white">
                PassControl
              </span>
            </Link>
            <Dialog.Close asChild>
              <button
                type="button"
                className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
            <AppNavLinks
              collapsed={false}
              pathname={pathname}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
