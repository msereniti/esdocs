import './article.css';

// @ts-ignore
import * as asyncRoutes from '@setup/navigation/loaders.js';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AwaitBoundary, useAwait } from 'react-use-await';

import type { PortableViewSetup } from '../../core/configuration/configuration';
import { useLocation } from '../navigation/utils';
import { getMdxProps, MdxProps } from '../utils/mdxProps';
import { articleContext } from '../view';

const loadArticle = (id: string): Promise<{ __esDocsArticleView: React.FC<MdxProps>; __esDocsArticleSetup: PortableViewSetup }> =>
  id in asyncRoutes ? asyncRoutes[id]() : undefined;

const ArticleBody: React.FC = () => {
  const context = React.useContext(articleContext);
  const articleModule = useAwait(loadArticle, context.articleId!);
  const { __esDocsArticleView, __esDocsArticleSetup } = articleModule;
  const articleView = React.useMemo(() => __esDocsArticleView(getMdxProps()), [__esDocsArticleView]);

  React.useEffect(() => {
    if (__esDocsArticleSetup !== context.articleViewSetup) {
      context.setArticleViewSetup(__esDocsArticleSetup);
    }
  }, [__esDocsArticleSetup, context.articleViewSetup, context.setArticleViewSetup]);

  return <>{articleView}</>;
};

export const Article: React.FC = () => {
  const context = React.useContext(articleContext);

  if (!context.articleId) {
    return <>404</>;
  }

  return (
    <article className="es-docs__article">
      <ErrorBoundary
        FallbackComponent={({ error }) => {
          return (
            <div>
              <div>Error occured while rendering article</div>
              <div>{error.message}</div>
            </div>
          );
        }}
        resetKeys={[context.articleId]}
      >
        <ArticleBody />
      </ErrorBoundary>
    </article>
  );
};
