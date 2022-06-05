import React from 'react';
import ReactJsxRuntime from 'react/jsx-runtime';
// @ts-ignore
import { render } from 'react-dom';

(window as any).require = (moduleName: string) => {
  if (moduleName === 'react') return React;
  if (moduleName === 'react/jsx-runtime') return ReactJsxRuntime;

  throw new Error(`External module ${moduleName} is not added to view root chunk`);
};

import { App } from './view';

render(<App />, document.querySelector('#root'));
