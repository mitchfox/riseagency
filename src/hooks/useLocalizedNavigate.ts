import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedPath } from '@/lib/localizedRoutes';

export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const localizedNavigate = (path: string, options?: { replace?: boolean }) => {
    const localizedPath = getLocalizedPath(path, language);
    navigate(localizedPath, options);
  };

  return localizedNavigate;
}
