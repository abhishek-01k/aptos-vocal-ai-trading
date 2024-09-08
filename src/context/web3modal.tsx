"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieStorage, createStorage, State, WagmiProvider } from "wagmi";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { base, mainnet, optimism, sepolia } from "wagmi/chains";
import { createWeb3Modal } from "@web3modal/wagmi/react";

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_APP_PROJECT_ID as string;

// 3. Create a metadata object
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com", // origin must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};
const queryClient = new QueryClient();

const chains = [mainnet, optimism, base] as const;
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: true, // true by default
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

// 5. Create a Web3Modal instance
createWeb3Modal({
  metadata,
  wagmiConfig: config,
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
});

export function Web3Modal({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
