import './header.css';

import React from 'react';

import { Link } from '../navigation/utils';
import { articleContext } from '../view';

export const Header: React.FC = () => {
  const context = React.useContext(articleContext);
  const layout = context.articleViewSetup?.layout;

  if (layout === 'full-screen') {
    return null;
  }

  return (
    <header className="es-docs__header">
      <Link to={'/'}>Documentation</Link>
    </header>
  );
};
