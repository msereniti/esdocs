// import type * as PropTypes from 'prop-types';
import React from 'react';

import type { SerializedNode } from '../../core/typings/serializer';
import type { SerializedType } from '../../core/typings/typings';

const stringifyTypeNode = (node: SerializedNode): string => (Array.isArray(node) ? node.map(stringifyTypeNode).join(' ') : typeof node === 'string' ? node : node.displayText);

type Inspectable = SerializedType;

export const TsInspector: React.FC<{ title?: boolean; inspect: Inspectable }> = ({ inspect }) => {
  return (
    <div className="es-docs__ts-inspector">
      {/* <code>
        {inspect.entity} {inspect.name} {inspect.entity === 'interface' && inspect.inheritance && `extends ${stringifyTypeNode(inspect.inheritance)}`}
      </code> */}
      {inspect.properties.length > 0 && (
        <table cellSpacing="0" cellPadding="0">
          <thead>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </thead>
          <tbody>
            {inspect.properties.map((property) => (
              <tr key={property.name}>
                <td>{property.name}</td>
                <td>
                  {property.type.join(' ')}
                  {!property.isOptional && <span className="es-docs__ts-inspector-required-prop">*</span>}
                </td>
                <td>{property.params.default}</td>
                <td>{property.params.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
