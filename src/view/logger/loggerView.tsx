import './loggerView.css';

import cx from 'classnames';
import React from 'react';

import { Log, logsApi } from './logger';

export const LoggerView: React.FC<{ loggerId: string }> = ({ loggerId }) => {
  const [logs, setLogs] = React.useState<Log[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(
    /** TBD: More efficient state update */
    () => logsApi.subscribe(loggerId, (logs) => setLogs(logs)),
    [loggerId]
  );
  React.useEffect(() => {
    containerRef.current?.scrollBy({ top: containerRef.current.scrollHeight });
  }, [logs]);

  /** Virtualization */
  return (
    <div className="es-docs__logger-container" ref={containerRef}>
      {logs.map((log, index) => (
        <pre
          className={cx(
            'es-docs__logger-row',
            `es-docs__logger-row-level-${log.level}`
          )}
          key={`${index}-${log.level}-${log.text}`}
        >
          {log.text}
        </pre>
      ))}
    </div>
  );
};
