import { defineConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-ethers'
import hardhatVerify from '@nomicfoundation/hardhat-verify'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(__dirname, '.env'), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

export default defineConfig({
  plugins: [hardhatVerify],
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
      viaIR: true,
    },
  },
  networks: {
    base: {
      type: 'http',
      chainType: 'generic',
      url: `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`,
      accounts: [env.PRIVATE_KEY],
      chainId: 8453,
    },
    baseSepolia: {
      type: 'http',
      chainType: 'generic',
      url: `https://base-sepolia.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`,
      accounts: [env.PRIVATE_KEY],
      chainId: 84532,
    },
  },
  verify: {
    etherscan: {
      apiKey: env.BASESCAN_API_KEY ?? '',
      customChains: [
        {
          network: 'base',
          chainId: 8453,
          urls: {
            apiURL: 'https://api.basescan.org/api',
            browserURL: 'https://basescan.org',
          },
        },
        {
          network: 'baseSepolia',
          chainId: 84532,
          urls: {
            apiURL: 'https://api-sepolia.basescan.org/api',
            browserURL: 'https://sepolia.basescan.org',
          },
        },
      ],
    },
  },
})
