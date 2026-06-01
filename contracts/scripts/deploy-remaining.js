import { artifacts } from 'hardhat'
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

// Already deployed contracts — set these in .env if you want to resume a partial deploy
// e.g. NFT_BRONZE=0x... NFT_SILVER=0x...
const ALREADY_DEPLOYED: Record<string, string> = {
  ...(env.NFT_BRONZE  ? { Bronze:  env.NFT_BRONZE  } : {}),
  ...(env.NFT_SILVER  ? { Silver:  env.NFT_SILVER  } : {}),
  ...(env.NFT_GOLD    ? { Gold:    env.NFT_GOLD    } : {}),
  ...(env.NFT_DIAMOND ? { Diamond: env.NFT_DIAMOND } : {}),
}

async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  )
  const deployer = new ethers.Wallet(PRIVATE_KEY, provider)

  const balance = await provider.getBalance(deployer.address)
  console.log('Balance:', ethers.formatEther(balance), 'ETH\n')

  const remaining = [
    { name: 'GoldTraderNFT',    label: 'Gold'    },
    { name: 'DiamondTraderNFT', label: 'Diamond' },
  ]

  const deployed = { ...ALREADY_DEPLOYED }

  for (const { name, label } of remaining) {
    console.log(`Deploying ${label}...`)
    const artifact = await artifacts.readArtifact(name)
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer)
    const contract = await factory.deploy(OWNER)
    console.log(`  Tx: ${contract.deploymentTransaction()?.hash}`)
    await contract.waitForDeployment()
    const address = await contract.getAddress()
    deployed[label] = address
    console.log(`  ✓ ${label}: ${address}`)
    await new Promise(r => setTimeout(r, 5000))
  }

  console.log('\n── Copy these into your .env.local ─────────────')
  console.log(`NEXT_PUBLIC_NFT_BRONZE=${deployed.Bronze}`)
  console.log(`NEXT_PUBLIC_NFT_SILVER=${deployed.Silver}`)
  console.log(`NEXT_PUBLIC_NFT_GOLD=${deployed.Gold}`)
  console.log(`NEXT_PUBLIC_NFT_DIAMOND=${deployed.Diamond}`)
  console.log('─────────────────────────────────────────────────')
}

main().catch(err => { console.error(err); process.exit(1) })
