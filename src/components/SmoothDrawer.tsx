import React from 'react';

interface SmoothDrawerProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  'data-testid'?: string;
}

export function SmoothDrawer({
  open,
  children,
  className = '',
  innerClassName = '',
  id,
  'data-testid': testId,
}: SmoothDrawerProps) {
  return (
    <div
      id={id}
      data-testid={testId}
      data-open={open ? 'true' : 'false'}
      aria-hidden={!open}
      className={`smooth-drawer ${open ? '' : 'pointer-events-none'} ${className}`}
    >
      <div className={`smooth-drawer-inner ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}
