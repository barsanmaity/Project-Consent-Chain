'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: 'ConsentChain',
  projectId: '92f20646f8d7100910f563044ca2a446', 
  chains: [sepolia],
  transports: {
    // ✅ HARDCODED: This guarantees the connection works instantly.
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/PMowrq8E3MiErUQrfnGu6'), 
  },
  ssr: true, 
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}