// @ts-ignore
import navgationTree from '@setup/navigation/tree.json';
import React from 'react';

import type { NavigationNode } from '../../../typings/viewSetup';
import { Link, useLocation } from '../navigation/utils';

const ContentList: React.FC<{ nodes: NavigationNode[] }> = ({ nodes }) => {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>
          {node.chunk ? <Link to={node.route!}>{node.label}</Link> : <label>{node.label}</label>}
          {node.children.length > 0 && <ContentList nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
};

export const ContentTable: React.FC = () => {
  const [location] = useLocation();

  const subTree = React.useMemo(() => {
    const traverse = (node: NavigationNode, parent: NavigationNode): NavigationNode | undefined => {
      if (node.route === location) {
        if (node.children.length > 0) return node;
        else return parent;
      }

      for (const child of node.children) {
        const match = traverse(child, node);
        if (match) return match;
      }
    };

    return traverse({ children: navgationTree }, navgationTree);
  }, [location, navgationTree]);

  if (!subTree) {
    return null;
  }

  return <ContentList nodes={subTree.children} />;
};
