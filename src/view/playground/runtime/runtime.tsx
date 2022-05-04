import React from 'react';

export type InitRuntime = (container: HTMLElement) => void;

export const PlaygroundRuntime: React.FC<{
  initRuntime: InitRuntime;
}> = ({ initRuntime }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      initRuntime(containerRef.current);
    }
  }, [initRuntime]);

  return <div ref={containerRef} />;
};
