import './styles/index.css';

import React from 'react';
import { render } from 'react-dom';

import { Article } from './article/article';
import { Navigation } from './navigation/navigationView';

render(
  <div className="es-docs__root es-docs-layout">
    <React.Suspense fallback="loading">
      <Navigation />
      <Article />
    </React.Suspense>
  </div>,
  document.querySelector('#root')
);
