/**
 * Dynamic connector plugin registry — connectors self-register at module load.
 * Runtime status/stats live in DB (connector_registry); code is the plugin source.
 */

import type {
  VerifiedAuctionConnector,
  VerifiedConnectorDefinition,
} from "@/lib/connectors/framework/types";
import { VERIFIED_AUCTION_CONNECTORS } from "@/lib/connectors/framework/registry";

const plugins = new Map<string, VerifiedAuctionConnector>();

export function registerConnectorPlugin(connector: VerifiedAuctionConnector): void {
  plugins.set(connector.definition.id, connector);
}

export function getRegisteredConnectorPlugins(): VerifiedAuctionConnector[] {
  return [...plugins.values()];
}

export function getRegisteredConnectorPlugin(
  id: string,
): VerifiedAuctionConnector | null {
  return plugins.get(id) ?? null;
}

/** Bootstrap: register all framework connectors exactly once. */
let bootstrapped = false;
export function bootstrapConnectorPlugins(): VerifiedAuctionConnector[] {
  if (!bootstrapped) {
    for (const c of VERIFIED_AUCTION_CONNECTORS) {
      registerConnectorPlugin(c);
    }
    bootstrapped = true;
  }
  return getRegisteredConnectorPlugins();
}

export type ConnectorRegistrySnapshot = {
  connectorId: string;
  definition: VerifiedConnectorDefinition;
  registeredInCode: boolean;
  dbStatus?: string | null;
  dbHealth?: string | null;
  lastSuccessfulRunAt?: string | null;
};
