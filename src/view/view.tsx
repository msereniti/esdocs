import './styles/index.css';

// @ts-ignore
import resolveUrl from '@setup/navigation/resolveUrl.json';
import React from 'react';
import { AwaitBoundary } from 'react-use-await';

import type { PortableViewSetup } from '../core/configuration/configuration';
import { Article } from './article/article';
import { Header } from './header/header';
import { Navigation } from './navigation/navigationView';
import { useLocation } from './navigation/utils';

type ArticleContext = {
  articleId?: string;
  articleViewSetup?: PortableViewSetup;
  setArticleViewSetup: (viewSetup: PortableViewSetup) => void;
};
const noop = () => {
  /* noop */
};
const contextInitValue: ArticleContext = { setArticleViewSetup: noop };
export const articleContext = React.createContext<ArticleContext>(contextInitValue);

export const App = () => {
  const [context, setContext] = React.useState<ArticleContext>(contextInitValue);
  const [location] = useLocation();
  React.useEffect(() => {
    setContext((context) => ({ ...context, articleId: resolveUrl[location ?? 'index'], articleViewSetup: { layout: 'default' } }));
  }, [location]);
  const setArticleViewSetup = React.useCallback(
    (articleViewSetup: PortableViewSetup) => {
      setContext((context) => ({ ...context, articleViewSetup }));
    },
    [setContext]
  );
  context.setArticleViewSetup = setArticleViewSetup;

  return (
    <articleContext.Provider value={context}>
      <div className="es-docs__root">
        <Header />
        <div className="es-docs-layout">
          <Navigation />
          <AwaitBoundary loading="loading">
            <Article />
          </AwaitBoundary>
        </div>
      </div>
    </articleContext.Provider>
  );
};
