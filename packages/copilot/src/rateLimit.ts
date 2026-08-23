import { createRateLimiter } from "@typebot.io/auth/helpers/createRateLimiter";

export const COPILOT_DAILY_REQUEST_LIMIT = 50;

const rateLimiter = createRateLimiter({
  requests: COPILOT_DAILY_REQUEST_LIMIT,
  window: "1 d",
  prefix: "copilot",
});

type MemoryUsageEntry = {
  count: number;
  resetAt: number;
};

const memoryUsageByUserId = new Map<string, MemoryUsageEntry>();

const getUtcDayResetTimestamp = () => {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return tomorrow.getTime();
};

const getMemoryUsageEntry = (userId: string) => {
  const now = Date.now();
  const existingEntry = memoryUsageByUserId.get(userId);

  if (!existingEntry || existingEntry.resetAt <= now) {
    const freshEntry = {
      count: 0,
      resetAt: getUtcDayResetTimestamp(),
    };
    memoryUsageByUserId.set(userId, freshEntry);
    return freshEntry;
  }

  return existingEntry;
};

export const getCopilotRateLimitStatus = (userId: string) => {
  const entry = getMemoryUsageEntry(userId);
  const remaining = Math.max(0, COPILOT_DAILY_REQUEST_LIMIT - entry.count);

  return {
    remaining,
    limit: COPILOT_DAILY_REQUEST_LIMIT,
  };
};

export const consumeCopilotRateLimit = async (userId: string) => {
  const entry = getMemoryUsageEntry(userId);

  if (entry.count >= COPILOT_DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: COPILOT_DAILY_REQUEST_LIMIT,
    };
  }

  if (rateLimiter) {
    const redisResult = await rateLimiter.limit(userId);
    if (!redisResult.success) {
      return {
        allowed: false,
        remaining: redisResult.remaining,
        limit: COPILOT_DAILY_REQUEST_LIMIT,
      };
    }
  }

  entry.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, COPILOT_DAILY_REQUEST_LIMIT - entry.count),
    limit: COPILOT_DAILY_REQUEST_LIMIT,
  };
};
