import { createConfig, http, createStorage, cookieStorage } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  injectedWallet,
  rabbyWallet,
  trustWallet,
  okxWallet,
  phantomWallet,
  braveWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { baseAccount } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// ── Connectors ─────────────────────────────────────────────────────────────
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Browser Wallets',
      wallets: [
        injectedWallet,
        rabbyWallet,
        braveWallet,
        phantomWallet,
        trustWallet,
        okxWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Hibra',
    projectId,
  }
)

// ── Config ─────────────────────────────────────────────────────────────────
// Note: ERC-8021 builder code attribution is applied manually in useSwapExecution.ts
// because wagmi 3.x does not support dataSuffix in createConfig.
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    ...connectors,
    baseAccount({
      appName: 'Hibra',
      appLogoUrl: 'https://hibra.app/hibra-logo.svg',
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
    ),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'
    ),
  },
})
