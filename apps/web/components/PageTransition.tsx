'use client';

import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldDisableTransition =
    pathname.startsWith('/admin') || pathname.startsWith('/tecnicos') || pathname.startsWith('/cliente');
  const className = shouldDisableTransition ? undefined : 'fx-page';

  return (
    <div key={pathname} className={className}>
      {children}
    </div>
  );
}
