'use client';

import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const className = pathname.startsWith('/admin') ? undefined : 'fx-page';

  return (
    <div key={pathname} className={className}>
      {children}
    </div>
  );
}
