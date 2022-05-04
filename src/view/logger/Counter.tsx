import React from 'react';

import { logsApi } from './logger';

export const LoggerCounter: React.FC<{ loggerId: string }> = ({ loggerId }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => logsApi.subscribe(loggerId, (logs) => setCount(logs.length)), [loggerId]);

  return <>{count}</>;
};
