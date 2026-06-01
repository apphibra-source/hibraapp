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
import { Attribution } from 'ox/erc8021'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// ── Builder Code (get from base.dev > Settings > Builder Code) ─────────────
// Replace 'YOUR-BUILDER-CODE' with your actual code after registering on base.dev
const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE ?? 'YOUR-BUILDER-CODE'

const DATA_SUFFIX =
  BUILDER_CODE !== 'YOUR-BUILDER-CODE'
    ? Attribution.toDataSuffix({ codes: [BUILDER_CODE] })
    : undefined

// ── Connectors ─────────────────────────────────────────────────────────────
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Browser Wallets',
      wallets: [
        injectedWallet,   // catches MetaMask, Rabby, Brave and any EIP-1193 extension
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
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    ...connectors,
    // Base Account connector — enables Base App wallet connection
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
  // Builder Code attribution — appended to all transactions automatically
  ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
})
