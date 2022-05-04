import React, { PropsWithChildren } from 'react';
import { useLocation as usePathLocation, useRouter } from 'wouter';

const currentLocation = () => {
  return window.location.hash.replace(/^#/, '') || '/';
};

const useHashLocation = () => {
  const [loc, setLoc] = React.useState(currentLocation());

  React.useEffect(() => {
    // this function is called whenever the hash changes
    const handler = () => {
      setLoc(currentLocation());
    };

    // subscribe to hash changes
    window.addEventListener('hashchange', handler);

    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = React.useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [loc, navigate] as [string, (to: string) => void];
};

const mode: 'hash' | 'path' = 'hash';

export const useLocation = () => {
  const [pathUrl, navigateToPath] = usePathLocation();
  const [hashUrl, navigateToHash] = useHashLocation();

  const url = mode === 'hash' ? hashUrl : pathUrl;
  const hashStart = url.lastIndexOf('#');

  const location = hashStart === -1 ? url : url.substring(0, hashStart);
  const hash = hashStart === -1 ? null : url.substring(hashStart);
  const navigateTo = mode === 'hash' ? navigateToHash : navigateToPath;

  return [location, navigateTo, hash] as [location: string, navigateTo: (to: string) => void, lash: string];
};

// export const makeUrl = (url: string) => {
//   if (mode === 'hash') {
//     return '#' + url;
//   }

//   return url;
// };

export const Link = ({ children, to, onClick, ...restProps }: PropsWithChildren<{ to: string }> & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const [, navigate] = useLocation();
  const { base } = useRouter();

  const url = to[0] === '~' ? to.slice(1) : base + to;
  const urlRef = React.useRef(url);

  urlRef.current = url;

  const handleClick = React.useCallback<React.MouseEventHandler<HTMLAnchorElement>>((event) => {
    // ignores the navigation when clicked using right mouse button or
    // by holding a special modifier key: ctrl, command, win, alt, shift
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    navigate(urlRef.current);
    if (onClick) {
      onClick(event);
    }
  }, []);

  return (
    <a {...restProps} href={url} onClick={handleClick}>
      {children}
    </a>
  );
};
