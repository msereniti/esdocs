import './loggerView.css';

import cx from 'classnames';
import { Console } from 'console-feed';
import Downshift from 'downshift';
import React from 'react';

import { Log, logsApi } from './logger';

export const LoggerView: React.FC<{ loggerId: string }> = ({ loggerId }) => {
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [executeValue, setExecuteValue] = React.useState('');

  const handleExecuteValueChagne = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => setExecuteValue(event.target.value), [setExecuteValue]);
  const handleInputKeydown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        logsApi.execute(loggerId, executeValue);
        setExecuteValue('');
      }
    },
    [loggerId, executeValue, setExecuteValue]
  );

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
      <Console logs={logs} variant="light" />
      <div className="es-docs__logger_input-container">
        <div className="es-docs__logger_input-prefix">{'>'}</div>
        <input value={executeValue} onChange={handleExecuteValueChagne} onKeyDown={handleInputKeydown} className="es-docs__logger_input" />
      </div>
    </div>
  );
};
