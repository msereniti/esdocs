import './article.css';

import * as asyncRoutes from '@setup/navigation/loaders.js';
import resolveUrl from '@setup/navigation/resolveUrl.json';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import usePromise from 'react-promise-suspense';

import { useLocation } from '../navigation/utils';
import { getMdxProps } from '../utils/mdxProps';

const loadArticle = (id: string) =>
  id in asyncRoutes ? asyncRoutes[id as keyof typeof asyncRoutes]() : undefined;

const ArticleBody: React.FC<{ articleId: string }> = ({ articleId }) => {
  const articleModule = usePromise(loadArticle, [articleId]);
  const article = articleModule.default(getMdxProps());

  return <>{article}</>;
};

export const Article: React.FC = () => {
  const [location] = useLocation();
  const articleId = resolveUrl[location];

  if (!articleId) {
    return <>404</>;
  }

  return (
    <article className="es-docs__article">
      <React.Suspense fallback={'Loading'}>
        <ErrorBoundary
          FallbackComponent={({ error }) => {
            return (
              <div>
                <div>Error occured while rendering article</div>
                <div>{error.message}</div>
              </div>
            );
          }}
          resetKeys={[articleId]}
        >
          <ArticleBody articleId={articleId} />
        </ErrorBoundary>
      </React.Suspense>
    </article>
  );
};
