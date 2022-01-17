import jsonStringify from 'json-stringify-safe';

import { uniqueId } from '../../core/utils/uniqueId';

type DisposeSubscription = () => void;
type LoggerId = string;
export type Log = {
  text: string;
  level: 'default' | 'verbose' | 'info' | 'warning' | 'error' | 'system';
  /** Tbd: implement css styling */
  // chunks: { text: string; styles: string }[]
};
type LogsSubscriber = (logs: Log[]) => void;
type LogsStore = {
  logs: {
    [loggerId: LoggerId]: Log[];
  };
  subscribers: {
    [loggerId: LoggerId]: LogsSubscriber[];
  };
};
type LogsApi = {
  subscribe: (
    loggerId: LoggerId,
    subscriber: LogsSubscriber
  ) => DisposeSubscription;
  publishChanges: (loggerId: string) => void;
};

const logsStore: LogsStore = {
  logs: {},
  subscribers: {},
};

const stringify = (...data: any[]) =>
  data
    .map((chunk) =>
      typeof chunk === 'object' ? jsonStringify(chunk, null, 2) : String(chunk)
    )
    .join(' ');

export const logsApi: LogsApi = {
  subscribe: (loggerId, subscriber) => {
    logsStore.subscribers[loggerId] = logsStore.subscribers[loggerId] || [];
    logsStore.subscribers[loggerId].push(subscriber);
    subscriber([...(logsStore.logs[loggerId] || [])]);

    return () => {
      logsStore.subscribers[loggerId] = logsStore.subscribers[loggerId].filter(
        (x) => x !== subscriber
      );
    };
  },
  publishChanges: (loggerId) => {
    logsStore.subscribers[loggerId]?.forEach((subscriber) =>
      subscriber([...logsStore.logs[loggerId]])
    );
  },
};

type Logger = typeof console & {
  loggerId: LoggerId;
};

export const makeLogger = (loggerId = uniqueId('logger')): Logger => {
  const counters: Record<string, number> = {};
  const lastCountersLogs: Record<string, Log> = {};
  const timers: Record<string, { start: number; end?: number }> = {};

  logsStore.logs[loggerId] = logsStore.logs[loggerId] || [];

  const addLog = (log: Log) => {
    logsStore.logs[loggerId].push(log);
    logsApi.publishChanges(loggerId);
  };
  const clearLogs = () => {
    logsStore.logs[loggerId] = [];
    addLog({
      text: 'Logs were cleared',
      level: 'system',
    });
  };
  const countLogs = (label = 'default', setValue?: number): void => {
    if (setValue === undefined) {
      counters[label] = (counters[label] || 0) + 1;
    } else {
      counters[label] = setValue;
    }
    const log: Log = {
      text: `${label}: ${counters[label]}`,
      level: 'default',
    };

    const lastCounterLog = lastCountersLogs[loggerId];
    const lastLogIndex = logsStore.logs[loggerId].length - 1;

    if (
      lastCounterLog &&
      logsStore.logs[loggerId][lastLogIndex] === lastCounterLog
    ) {
      logsStore.logs[loggerId][lastLogIndex] = log;
    } else {
      logsStore.logs[loggerId].push(log);
    }

    lastCountersLogs[loggerId] = log;
    logsApi.publishChanges(loggerId);
  };

  /** TBD: full console logger implementation */
  const handleUnimplemented = (
    method: Exclude<keyof typeof console, 'Console'>,
    ...args: any[]
  ) => {
    addLog({
      text: `console.${method} is not implemented in EsDocs playground console yet, so ${method} redirected to browser console as is`,
      level: 'warning',
    });
    // eslint-disable-next-line no-console
    (console[method] as any)(...args);
  };
  const handleDeprecated = (
    method: 'profile' | 'profileEnd' | 'timeStamp',
    ...args: any[]
  ) => {
    addLog({
      text: `console.${method} is deprecated and will not be implemented in EsDocs playground console yet, so ${method} redirected to browser console as is`,
      level: 'warning',
    });
    // eslint-disable-next-line no-console
    (console[method] as any)(...args);
  };

  const logger: Logger = {
    loggerId,
    assert: (condition?: boolean, ...data: any[]): void => {
      if (!condition) {
        logger.error(...data);
      }
    },
    clear: (): void => {
      clearLogs();
    },
    count: (label = 'default'): void => {
      countLogs(label);
    },
    countReset: (label = 'default'): void => {
      countLogs(label, 0);
    },
    debug: (...data: any[]): void => {
      addLog({
        text: stringify(...data),
        level: 'verbose',
      });
    },
    dir: (item?: any, options?: any): void => {
      handleUnimplemented('dir', item, options);
    },
    dirxml: (...data: any[]): void => {
      handleUnimplemented('dirxml', ...data);
    },
    error: (...data: any[]): void => {
      addLog({
        text: stringify(...data),
        level: 'error',
      });
    },
    group: (...data: any[]): void => {
      handleUnimplemented('group', ...data);
    },
    groupCollapsed: (...data: any[]): void => {
      handleUnimplemented('groupCollapsed', ...data);
    },
    groupEnd: (): void => {
      handleUnimplemented('groupEnd');
    },
    info: (...data: any[]): void => {
      addLog({
        text: stringify(...data),
        level: 'info',
      });
    },
    log: (...data: any[]): void => {
      addLog({
        text: stringify(...data),
        level: 'default',
      });
    },
    table: (tabularData?: any, properties?: string[]): void => {
      handleUnimplemented('table', tabularData, properties);
    },
    time: (label = 'default'): void => {
      timers[label] = { start: Date.now(), end: undefined };
    },
    timeEnd: (label = 'default'): void => {
      if (!timers[label]) {
        logger.warn(`Timer ${label} doesn't exist`);
      } else {
        timers[label].end = Date.now();

        logger.log(`${label}: ${timers[label].end! - timers[label].start} ms`);
      }
    },
    timeLog: (label = 'default', ...data: any[]): void => {
      if (!timers[label]) {
        logger.warn(`Timer ${label} doesn't exist`);
      } else {
        logger.log(`${label}: ${Date.now() - timers[label].start} ms`, ...data);
      }
    },
    timeStamp: (label?: string): void => {
      handleDeprecated('timeStamp', label);
    },
    trace: (...data: any[]): void => {
      handleUnimplemented('trace', ...data);
    },
    warn: (...data: any[]): void => {
      addLog({
        text: stringify(...data),
        level: 'warning',
      });
    },
    // eslint-disable-next-line no-console
    Console: console.Console,
    profile: (label?: string): void => {
      handleDeprecated('profile', label);
    },
    profileEnd: (label?: string): void => {
      handleDeprecated('profileEnd', label);
    },
  };

  return logger;
};
