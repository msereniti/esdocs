import './navigationView.css';

// @ts-ignore
import navgationTree from '@setup/navigation/tree.json';
import cx from 'classnames';
import React from 'react';

import type { NavigationNode } from '../../../typings/viewSetup';
import { articleContext } from '../view';
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

  const selected = navigationNode.route === location;
  const selectable = navigationNode.chunk !== undefined;
  const labelPadding = depth * 20 + 'px';
  const labelClassName = cx('es-docs__navigation-label', selected && 'es-docs__navigation-label-selected', !selectable && 'es-docs__navigation-label-disabled');
  const labelStyle = { '--label-padding': labelPadding };

  if (!navigationNode.label) {
    return <>{navigationNode.children.map((navigationNode) => <NavigationList key={navigationNode.id} navigationNode={navigationNode} depth={depth} />)}</>;
  }

  return (
    <li key={navigationNode.id} className={cx('es-docs__navigation-row')}>
      {selectable ? (
        <Link to={navigationNode.route!} className={labelClassName} style={labelStyle}>
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
            <NavigationList key={navigationNode.id} navigationNode={navigationNode} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const Navigation: React.FC = () => {
  const context = React.useContext(articleContext);
  const layout = context.articleViewSetup?.layout;

  if (layout === 'full-width' || layout === 'full-screen') {
    return null;
  }

  const tree = navgationTree[0] as NavigationNode;

  return (
    <nav className="es-docs__navigation">
      <ul className="es-docs__navigation-list">
        <NavigationList navigationNode={tree} depth={0} />
      </ul>
    </nav>
  );
};
