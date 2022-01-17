import './navigationView.css';

import navgationTree from '@setup/navigation/tree.json';
import cx from 'classnames';
import React from 'react';

import { Link, useLocation } from './utils';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

const NavigationList: React.FC<{
  navigationNode: NavigationNode;
  depth: number;
}> = ({ navigationNode, depth }) => {
  const [location] = useLocation();

  const selected = navigationNode.url === location;
  const selectable = navigationNode.hasArticle;
  const labelPadding = depth * 20 + 'px';
  const labelClassName = cx(
    'es-docs__navigation-label',
    selected && 'es-docs__navigation-label-selected',
    !selectable && 'es-docs__navigation-label-disabled'
  );
  const labelStyle = { '--label-padding': labelPadding };

  return (
    <li key={navigationNode.id} className={cx('es-docs__navigation-row')}>
      {selectable ? (
        <Link
          to={navigationNode.url}
          className={labelClassName}
          style={labelStyle}
        >
          {navigationNode.label}
        </Link>
      ) : (
        <label className={labelClassName} style={labelStyle}>
          {navigationNode.label}
        </label>
      )}
      {navigationNode.children.length > 0 && (
        <ul className="es-docs__navigation-list">
          {navigationNode.children.map((navigationNode) => (
            <NavigationList
              key={navigationNode.id}
              navigationNode={navigationNode}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const Navigation: React.FC = () => {
  return (
    <nav className="es-docs__navigation">
      <Link
        to={navgationTree.url}
        className="es-docs__navigation-head es-docs__navigation-label es-docs__navigation-label-disabled"
      >
        Navigation
      </Link>
      <ul className="es-docs__navigation-list">
        {navgationTree.children.map((navigationNode) => (
          <NavigationList
            key={navigationNode.id}
            navigationNode={navigationNode}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  );
};
