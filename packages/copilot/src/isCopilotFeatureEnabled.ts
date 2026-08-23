import { FeatureFlags } from "@typebot.io/feature-flags/application/FeatureFlags";
import { PostHogFeatureFlagsLayer } from "@typebot.io/feature-flags/infrastructure/PostHogFeatureFlags";
import { UserId } from "@typebot.io/shared-core/domain";
import { Effect } from "effect";
import { isCopilotConfigured } from "./createGeminiModel";

export const isCopilotFeatureEnabled = async (userId: string) => {
  if (!isCopilotConfigured()) return false;

  const enabled = await Effect.runPromise(
    Effect.gen(function* () {
      const featureFlags = yield* FeatureFlags;
      return yield* featureFlags.isEnabled("copilot", {
        userId: UserId.makeUnsafe(userId),
      });
    }).pipe(Effect.provide(PostHogFeatureFlagsLayer)),
  );

  return enabled;
};
