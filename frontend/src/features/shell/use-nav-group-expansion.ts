import { useState, useEffect } from 'react';
import { navGroups, isChildActive } from './nav-config';

export function useNavGroupExpansion(pathname: string) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    navGroups.forEach((g) => {
      if (isChildActive(pathname, g)) expanded.add(g.id);
    });
    return expanded;
  });

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      navGroups.forEach((g) => {
        if (isChildActive(pathname, g)) next.add(g.id);
      });
      return next;
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return { expandedGroups, toggleGroup };
}
