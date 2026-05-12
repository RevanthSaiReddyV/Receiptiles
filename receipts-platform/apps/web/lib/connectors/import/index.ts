import type { ImportConnector } from "./types";
import { amazonImportConnector } from "./amazon";
import { walmartImportConnector } from "./walmart";
import { shopImportConnector } from "./shop";

export type { ImportConnector, ImportedOrder, ImportedOrderItem } from "./types";

export const importConnectors: Record<string, ImportConnector> = {
  amazon: amazonImportConnector,
  walmart: walmartImportConnector,
  shop: shopImportConnector,
};

export function getImportConnector(provider: string): ImportConnector {
  const connector = importConnectors[provider];
  if (!connector) throw new Error(`Unknown import provider: ${provider}`);
  return connector;
}

export function listImportConnectors(): ImportConnector[] {
  return Object.values(importConnectors);
}
