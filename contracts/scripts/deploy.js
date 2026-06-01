import { network, artifacts } from 'hardhat'
import { ethers } from 'ethers'
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
const PRIVATE_KEY = env.PRIVATE_KEY
const ALCHEMY_API_KEY = env.ALCHEMY_API_KEY

async function main() {
  // Connect to Base mainnet via Alchemy
  const provider = new ethers.JsonRpcProvider(
    `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  )
  const deployer = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('Deploying with:', deployer.address)
  console.log('Owner will be:', OWNER)

  const balance = await provider.getBalance(deployer.address)
  console.log('Balance:', ethers.formatEther(balance), 'ETH\n')

  if (balance === 0n) {
    throw new Error('Deployer has no ETH. Please fund the wallet first.')
  }

  const contracts = [
    { name: 'BronzeTraderNFT',  label: 'Bronze'  },
    { name: 'SilverTraderNFT',  label: 'Silver'  },
    { name: 'GoldTraderNFT',    label: 'Gold'    },
    { name: 'DiamondTraderNFT', label: 'Diamond' },
  ]

  const deployed = {}

  for (const { name, label } of contracts) {
    console.log(`Deploying ${label}...`)

    const artifact = await artifacts.readArtifact(name)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer)

    const contract = await factory.deploy(OWNER)
    console.log(`  Tx sent: ${contract.deploymentTransaction()?.hash}`)
    await contract.waitForDeployment()

    const address = await contract.getAddress()
    deployed[label] = address
    console.log(`  ✓ ${label}: ${address}`)

    // Wait 3s between deploys to avoid rate limiting
    await new Promise(r => setTimeout(r, 3000))
  }

  console.log('\n── Copy these into your .env.local ─────────────')
  console.log(`NEXT_PUBLIC_NFT_BRONZE=${deployed.Bronze}`)
  console.log(`NEXT_PUBLIC_NFT_SILVER=${deployed.Silver}`)
  console.log(`NEXT_PUBLIC_NFT_GOLD=${deployed.Gold}`)
  console.log(`NEXT_PUBLIC_NFT_DIAMOND=${deployed.Diamond}`)
  console.log('─────────────────────────────────────────────────')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
