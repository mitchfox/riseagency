import { Link, LinkProps } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedPath } from '@/lib/localizedRoutes';

interface LocalizedLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

export function LocalizedLink({ to, children, ...props }: LocalizedLinkProps) {
  const { language } = useLanguage();
  const localizedPath = getLocalizedPath(to, language);
  
  return (
    <Link to={localizedPath} {...props}>
      {children}
    </Link>
  );
}
