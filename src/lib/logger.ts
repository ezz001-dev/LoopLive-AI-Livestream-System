/**
 * Utility for reporting errors and logs to the Ops Console.
 */

interface LogData {
  message: string;
  level?: "error" | "warn" | "info";
  stack?: string;
  component?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
}

export async function reportError(data: LogData) {
  try {
    // Add default metadata if not provided
    const metadata = {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      timestamp: new Date().toISOString(),
      ...data.metadata,
    };

    const response = await fetch("/api/ops/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        metadata,
      }),
    });

    if (!response.ok) {
        console.warn("[Logger] Failed to report error to server", await response.text());
    }
  } catch (err) {
    console.error("[Logger] Error reporting failed:", err);
  }
}

export const logger = {
  error: (message: string, options: Omit<LogData, "message" | "level"> = {}) => 
    reportError({ message, level: "error", ...options }),
  warn: (message: string, options: Omit<LogData, "message" | "level"> = {}) => 
    reportError({ message, level: "warn", ...options }),
  info: (message: string, options: Omit<LogData, "message" | "level"> = {}) => 
    reportError({ message, level: "info", ...options }),
};
