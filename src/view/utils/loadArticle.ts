import { loadMdx } from './loadMdx';

export const loadArticle = (articleId: string) => loadMdx(`./articles/${articleId}.js`);
