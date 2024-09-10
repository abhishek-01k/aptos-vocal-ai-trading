"use client";
import React, { ReactNode, useState } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PontemWallet } from "@pontem/wallet-adapter-plugin";
import { MartianWallet } from "@martianwallet/aptos-wallet-adapter";
import { OKXWallet } from "@okwallet/aptos-wallet-adapter";
import { Network } from "@aptos-labs/ts-sdk";
import { BitgetWallet } from "@bitget-wallet/aptos-wallet-adapter";
const Provider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  const wallets = [
    new BitgetWallet(),
    new MartianWallet(),
    new PontemWallet(),
    new OKXWallet(),
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        plugins={wallets}
        autoConnect={true}
        dappConfig={{
          network: Network.TESTNET,
          aptosConnectDappId: "57fa42a9-29c6-4f1e-939c-4eefa36d9ff5",
          mizuwallet: {
            manifestURL:
              "https://assets.mz.xyz/static/config/mizuwallet-connect-manifest.json",
          },
        }}
        onError={(error) => {
          console.log("Error", error);
        }}
      >
        {children}
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
};

export default Provider;
