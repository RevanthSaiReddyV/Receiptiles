import type { CustomerConnector } from "./types";
import { paypalConnector } from "./paypal";
import { shopifyCustomerConnector } from "./shopify-customer";

export type {
  CustomerConnector,
  CustomerCredentials,
  FetchTransactionsOptions,
  CustomerTransaction,
  CustomerTransactionItem,
} from "./types";

export const customerConnectors: Record<string, CustomerConnector> = {
  paypal: paypalConnector,
  "shopify-customer": shopifyCustomerConnector,
};

export function getCustomerConnector(provider: string): CustomerConnector {
  const connector = customerConnectors[provider];
  if (!connector) throw new Error(`Unknown customer connector: ${provider}`);
  return connector;
}

export function listCustomerConnectors(): CustomerConnector[] {
  return Object.values(customerConnectors);
}
