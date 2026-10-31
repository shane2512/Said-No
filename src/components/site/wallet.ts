"use client";

import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";

/** The visitor's own wallet. The server never signs; it only checks, builds and broadcasts. Client-only module. */
export const dAppKit = createDAppKit({
  networks: ["testnet", "mainnet"],
  defaultNetwork: "testnet",
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` }),
  slushWalletConfig: { appName: "Said-No" },
  // A throwaway wallet for local testing only.
  enableBurnerWallet: process.env.NODE_ENV !== "production",
});

declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
