'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type NavLinkProps = {
  to: string;
  end?: boolean;
  title?: string;
  onClick?: () => void;
  className: string | ((state: { isActive: boolean }) => string);
  children: ReactNode;
};

export function NavLink({ to, end = false, title, onClick, className, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Link
      href={to}
      title={title}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className}
    >
      {children}
    </Link>
  );
}
