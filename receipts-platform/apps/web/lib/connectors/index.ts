import type { PosConnector } from "./types";
import { squareConnector } from "./square";
import { shopifyConnector } from "./shopify";
import { cloverConnector } from "./clover";

export type { PosConnector, ConnectorCredentials, FetchOrdersOptions, PosOrder, PosOrderItem } from "./types";

export const connectors: Record<string, PosConnector> = {
  square: squareConnector,
  shopify: shopifyConnector,
  clover: cloverConnector,
};

export function getConnector(provider: string): PosConnector {
  const connector = connectors[provider];
  if (!connector) throw new Error(`Unknown POS provider: ${provider}`);
  return connector;
}
