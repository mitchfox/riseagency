import React from 'react';
import { useRoleSubdomain, RoleSubdomain } from '@/hooks/useRoleSubdomain';

interface SubdomainLinkProps {
  role: Exclude<RoleSubdomain, null>;
  children: React.ReactNode;
  className?: string;
}

export const SubdomainLink = ({ role, children, className }: SubdomainLinkProps) => {
  const { getRoleUrl } = useRoleSubdomain();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = getRoleUrl(role);
    // Check if it's an external URL (starts with http) or internal route
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      // For localhost, use internal navigation
      window.location.href = url;
    }
  };
  
  return (
    <a href={getRoleUrl(role)} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};
