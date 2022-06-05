import React from 'react';
// @ts-ignore
import ReactDOM from 'react-dom';

export const SandboxCss: React.FC<{ children: React.ReactNode}> = ({ children }) => {
  const shadowDomChildRef = React.useRef<HTMLDivElement | null>(null);
  const [inititated, setInitiated] = React.useState(false);
  const handleContainerRef = React.useCallback((instance: HTMLDivElement) => {
    if (!instance) return;

    const shadowDom = instance.attachShadow({ mode: 'open' });
    const shadowDomChild = document.createElement('div');

    shadowDom.appendChild(shadowDomChild);
    shadowDomChildRef.current = shadowDomChild;
    setInitiated(true);
  }, []);

  return (
    <>
      <div ref={handleContainerRef} />
      {inititated && ReactDOM.createPortal(children, shadowDomChildRef.current!)}
    </>
  );
};
