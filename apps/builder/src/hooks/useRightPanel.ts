import { parseAsStringLiteral, useQueryState } from "nuqs";

const rightPanels = ["preview", "variables", "copilot"] as const;

export const useRightPanel = () =>
  useQueryState<(typeof rightPanels)[number]>(
    "rightPanel",
    parseAsStringLiteral(rightPanels),
  );
