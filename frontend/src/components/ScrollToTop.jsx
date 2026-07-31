import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Resets scroll position on navigation, except when landing on an in-page anchor. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
