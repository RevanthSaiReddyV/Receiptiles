import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const environment =
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

const baseConfig: pino.LoggerOptions = {
  level: isProduction ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: "@receipts/web",
    env: environment,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
};

/**
 * Default logger instance for general use.
 * JSON output in production, pretty-printed in development.
 */
const logger = pino(baseConfig);

/**
 * Creates a child logger with additional context bound to every log entry.
 *
 * @example
 * const log = createLogger({ route: "/api/receipts", userId: "usr_123" });
 * log.info("Fetched receipts");
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
