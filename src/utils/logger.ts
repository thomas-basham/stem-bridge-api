type LogMeta = unknown;

const formatMessage = (level: string, message: string, meta?: LogMeta) => {
  return JSON.stringify({
    level,
    message,
    meta,
    timestamp: new Date().toISOString()
  });
};

export const logger = {
  info: (message: string, meta?: LogMeta) => {
    console.info(formatMessage("info", message, meta));
  },
  warn: (message: string, meta?: LogMeta) => {
    console.warn(formatMessage("warn", message, meta));
  },
  error: (message: string, meta?: LogMeta) => {
    console.error(formatMessage("error", message, meta));
  },
  http: (message: string, meta?: LogMeta) => {
    console.info(formatMessage("http", message, meta));
  }
};
