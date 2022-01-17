import React from 'react';
import usePromise from 'react-promise-suspense';

import { loadPlaygroundRuntime } from '../../utils/loadPlaygroundRuntime';

export const PlaygroundRuntime: React.FC<{
  playgroundId: string;
  framework: string;
}> = ({ playgroundId, framework }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const initRuntime = usePromise(loadPlaygroundRuntime, [
    playgroundId,
    framework,
  ]);

  React.useEffect(() => {
    if (containerRef.current) {
      initRuntime(containerRef.current);
    }
  }, [initRuntime]);

  return <div ref={containerRef} />;
};
