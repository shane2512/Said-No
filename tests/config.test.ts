import { describe, it, expect } from "vitest";
import { getNetworkConfig } from "@/lib/config";

describe("getNetworkConfig", () => {
  it("points testnet at Tatum's testnet gRPC gateway and the Memory staging relayer", () => {
    expect(getNetworkConfig("testnet")).toEqual({
      network: "testnet",
      tatumGrpcUrl: "https://sui-testnet-grpc.gateway.tatum.io",
      memwalServerUrl: "https://relayer-staging.memory.walrus.xyz",
    });
  });

  it("points mainnet at Tatum's mainnet gRPC gateway and the Memory relayer", () => {
    expect(getNetworkConfig("mainnet")).toEqual({
      network: "mainnet",
      tatumGrpcUrl: "https://sui-mainnet-grpc.gateway.tatum.io",
      memwalServerUrl: "https://relayer.memory.walrus.xyz",
    });
  });

  it("defaults to testnet when the setting is missing or unknown", () => {
    expect(getNetworkConfig(undefined).network).toBe("testnet");
    expect(getNetworkConfig("devnet").network).toBe("testnet");
  });
});
