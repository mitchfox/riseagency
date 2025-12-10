import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedPath } from '@/lib/localizedRoutes';

interface LocalizedLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

export function LocalizedLink({ to, children, ...props }: LocalizedLinkProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const localizedPath = getLocalizedPath(to, language);
  
  // Force full page navigation to ensure language context is preserved
  const handleClick = (e: React.MouseEvent) => {
    // Allow default Link behavior - React Router will handle it
    // Language context should persist as we stay on same subdomain
  };
  
  return (
    <Link to={localizedPath} {...props}>
      {children}
    </Link>
  );
}
