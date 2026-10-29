export type Network = "testnet" | "mainnet";

export type NetworkConfig = {
  network: Network;
  tatumGrpcUrl: string;
  memwalServerUrl: string;
};

const CONFIGS: Record<Network, NetworkConfig> = {
  testnet: {
    network: "testnet",
    tatumGrpcUrl: "https://sui-testnet-grpc.gateway.tatum.io",
    memwalServerUrl: "https://relayer-staging.memory.walrus.xyz",
  },
  mainnet: {
    network: "mainnet",
    tatumGrpcUrl: "https://sui-mainnet-grpc.gateway.tatum.io",
    memwalServerUrl: "https://relayer.memory.walrus.xyz",
  },
};

/** Unknown or missing values fall back to testnet so nothing touches mainnet by accident. */
export function getNetworkConfig(value: string | undefined): NetworkConfig {
  return value === "mainnet" ? CONFIGS.mainnet : CONFIGS.testnet;
}
