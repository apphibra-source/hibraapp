/**
 * Verify all 4 Hibra NFT contracts on Basescan.
 * Run with: npx hardhat run scripts/verify.js --network base
 *
 * Required in contracts/.env:
 *   OWNER_ADDRESS=0x...       (the address passed as constructor arg during deploy)
 *   BASESCAN_API_KEY=...      (get free at https://basescan.org/register)
 *   NFT_BRONZE=0x...          (deployed contract addresses)
 *   NFT_SILVER=0x...
 *   NFT_GOLD=0x...
 *   NFT_DIAMOND=0x...
 */

import { verifyContract } from '@nomicfoundation/hardhat-verify/verify'
import hre from 'hardhat'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(__dirname, '../.env'), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const OWNER = env.OWNER_ADDRESS
if (!OWNER) throw new Error('OWNER_ADDRESS is not set in contracts/.env')

const CONTRACTS = [
  { name: 'BronzeTraderNFT',  address: env.NFT_BRONZE  ?? '' },
  { name: 'SilverTraderNFT',  address: env.NFT_SILVER  ?? '' },
  { name: 'GoldTraderNFT',    address: env.NFT_GOLD    ?? '' },
  { name: 'DiamondTraderNFT', address: env.NFT_DIAMOND ?? '' },
].filter(c => c.address !== '')

async function main() {
  if (CONTRACTS.length === 0) {
    console.error('No contract addresses set. Add NFT_BRONZE, NFT_SILVER, NFT_GOLD, NFT_DIAMOND to contracts/.env')
    process.exit(1)
  }

  console.log('Verifying contracts on Base mainnet...\n')

  for (const { name, address } of CONTRACTS) {
    console.log(`Verifying ${name} at ${address}...`)
    try {
      await verifyContract(
        {
          address,
          constructorArgs: [OWNER],
          contract: `contracts/${name}.sol:${name}`,
          provider: 'etherscan',
        },
        hre
      )
      console.log(`  ✓ ${name} verified\n`)
    } catch (err) {
      const msg = err?.message ?? String(err)
      if (msg.includes('Already Verified') || msg.includes('already verified') || msg.includes('NOTOK')) {
        console.log(`  ✓ ${name} already verified\n`)
      } else {
        console.error(`  ✗ ${name} failed:`, msg.slice(0, 200), '\n')
      }
    }
  }

  console.log('Done. Check https://basescan.org to confirm.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
