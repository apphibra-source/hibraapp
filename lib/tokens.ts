import type { Token } from '@/types'
import { TOKEN_ADDRESSES } from './contracts/addresses'

// ── Logo sources ───────────────────────────────────────────────────────────────
// coin-images.coingecko.com = stable CoinGecko CDN (tested 200)
const CG = (id: string) => `https://coin-images.coingecko.com/coins/images/${id}`

// Trust Wallet Ethereum chain assets (for tokens bridged from Ethereum)
const TW_ETH = (addr: string) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${addr}/logo.png`

export const SUPPORTED_TOKENS: Token[] = [
  // ── Native & Wrapped ────────────────────────────────────────────────────────
  {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18, symbol: 'ETH', name: 'Ethereum',
    // Trust Wallet ETH info logo — stable GitHub raw URL
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18, symbol: 'WETH', name: 'Wrapped Ether',
    logoURI: TW_ETH('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
  },

  // ── Stablecoins ─────────────────────────────────────────────────────────────
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6, symbol: 'USDC', name: 'USD Coin',
    logoURI: CG('6319/small/usdc.png'),
  },
  {
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6, symbol: 'USDT', name: 'Tether USD',
    logoURI: CG('325/small/Tether.png'),
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18, symbol: 'DAI', name: 'Dai Stablecoin',
    logoURI: CG('9956/small/Badge_Dai.png'),
  },
  {
    address: '0x820C137fa70C8691f0e44Dc420a5e53c168921Dc',
    decimals: 18, symbol: 'USDS', name: 'USDS Stablecoin',
    logoURI: CG('39926/small/usds.png'),
  },
  {
    address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
    decimals: 18, symbol: 'USDe', name: 'USDe',
    logoURI: CG('33613/small/usde.png'),
  },
  {
    address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
    decimals: 6, symbol: 'EURC', name: 'EURC',
    logoURI: CG('26045/small/euro-coin.png'),
  },
  {
    // crvUSD — Curve's own GitHub (CoinGecko 403s for this one)
    address: '0xDBFeFD2e8460a6Ee4955A68582F85708BAEA60A3',
    decimals: 18, symbol: 'crvUSD', name: 'Curve.Fi USD',
    logoURI: 'https://raw.githubusercontent.com/curvefi/curve-assets/main/images/assets/0xf939e0a03fb07f59a73314e73794be0e57ac1b4e.png',
  },

  // ── BTC variants ────────────────────────────────────────────────────────────
  {
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8, symbol: 'cbBTC', name: 'Coinbase BTC',
    logoURI: CG('40143/small/cbbtc.webp'),
  },
  {
    address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
    decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC',
    logoURI: TW_ETH('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'),
  },

  // ── Staked ETH ──────────────────────────────────────────────────────────────
  {
    address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
    decimals: 18, symbol: 'wstETH', name: 'Wrapped stETH',
    logoURI: CG('18834/small/wstETH.png'),
  },
  {
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    decimals: 18, symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH',
    logoURI: CG('27008/small/cbeth.png'),
  },
  {
    address: '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c',
    decimals: 18, symbol: 'rETH', name: 'Rocket Pool ETH',
    logoURI: CG('20764/small/reth.png'),
  },
  {
    address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A',
    decimals: 18, symbol: 'weETH', name: 'Wrapped eETH',
    logoURI: CG('33033/small/weETH.png'),
  },

  // ── DeFi / Ecosystem ────────────────────────────────────────────────────────
  {
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18, symbol: 'AERO', name: 'Aerodrome',
    logoURI: CG('31745/small/token.png'),
  },
  {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    decimals: 18, symbol: 'AAVE', name: 'Aave',
    logoURI: CG('12645/small/AAVE.png'),
  },
  {
    address: '0xD08a2917653d4E460893203471f0000826fb4034',
    decimals: 18, symbol: 'CRV', name: 'Curve DAO Token',
    logoURI: CG('12124/small/Curve.png'),
  },
  {
    // ENA — Trust Wallet has it under Ethereum chain address
    address: '0x58538e6A46E07434d7E7375Bc268D3cb839C0133',
    decimals: 18, symbol: 'ENA', name: 'ENA',
    logoURI: TW_ETH('0x57e114B691Db790C35207b2e685D4A43181e6061'),
  },
  {
    address: '0x6921B130D297cc43754afba22e5EAc0FBf8Db75b',
    decimals: 18, symbol: 'doginme', name: 'doginme',
    logoURI: CG('36174/small/doginme.jpg'),
  },
  {
    address: '0xA88594D404727625A9437C3f886C7643872296AE',
    decimals: 18, symbol: 'WELL', name: 'Moonwell',
    logoURI: CG('26133/small/WELL.png'),
  },
  {
    address: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
    decimals: 18, symbol: 'BRETT', name: 'Brett',
    logoURI: CG('35529/small/brett.png'),
  },
  {
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    decimals: 6, symbol: 'USDbC', name: 'USD Base Coin',
    logoURI: CG('31272/small/usdbc.png'),
  },
  {
    address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b',
    decimals: 18, symbol: 'VIRTUAL', name: 'Virtual Protocol',
    logoURI: CG('34057/small/virtual.jpg'),
  },
  {
    address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
    decimals: 18, symbol: 'DEGEN', name: 'Degen',
    logoURI: CG('34515/small/android-chrome-512x512.png'),
  },
  {
    address: '0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71',
    decimals: 18, symbol: 'MOG', name: 'Mog Coin',
    logoURI: CG('31059/small/mog.png'),
  },
  {
    address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
    decimals: 18, symbol: 'TOSHI', name: 'Toshi',
    logoURI: CG('31126/small/toshi.png'),
  },
  {
    address: '0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239',
    decimals: 18, symbol: 'YFI', name: 'yearn.finance',
    logoURI: TW_ETH('0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e'),
  },
  {
    address: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
    decimals: 18, symbol: 'tBTC', name: 'tBTC v2',
    logoURI: TW_ETH('0x18084fbA666a33d37592fA2633fD49a74DD93a88'),
  },
  {
    address: '0x3bB4445D30AC020a84c1b5A8A2C6248ebC9779D0',
    decimals: 18, symbol: 'SNX', name: 'Synthetix',
    logoURI: TW_ETH('0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F'),
  },
  {
    address: '0xE3B53AF74a4BF62Ae5511055290838050bf764Df',
    decimals: 18, symbol: 'STG', name: 'Stargate Finance',
    logoURI: CG('24413/small/STG_LOGO.png'),
  },
  {
    address: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85',
    decimals: 18, symbol: 'SEAM', name: 'Seamless Protocol',
    logoURI: CG('32177/small/seamless.png'),
  },
  {
    address: '0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376',
    decimals: 6, symbol: 'USD+', name: 'USD+',
    logoURI: CG('25757/small/USD__logo.png'),
  },
  {
    address: '0x9DF4Ac62F9E435DbCD85E06c990a7f0ea32739a9',
    decimals: 18, symbol: 'PENDLE', name: 'Pendle',
    logoURI: CG('15069/small/Pendle_Logo_Normal-03.png'),
  },
  {
    address: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
    decimals: 18, symbol: 'ZRO', name: 'LayerZero',
    logoURI: CG('28206/small/ftxG9_TJ_400x400.jpeg'),
  },
  {
    // LINK on Base — use Ethereum chain logo from Trust Wallet
    address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196',
    decimals: 18, symbol: 'LINK', name: 'ChainLink Token',
    logoURI: TW_ETH('0x514910771AF9Ca656af840dff83E8264EcF986CA'),
  },
  {
    address: '0x1111111111166b7FE7bd91427724B487980aFc69',
    decimals: 18, symbol: 'ZORA', name: 'Zora',
    logoURI: CG('54693/small/zora.jpg'),
  },
]

// Deduplicate by address
const seen = new Set<string>()
export const TOKENS = SUPPORTED_TOKENS.filter((t) => {
  const key = t.address.toLowerCase()
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

export const ETH_TOKEN = SUPPORTED_TOKENS[0]
export const USDC_TOKEN = SUPPORTED_TOKENS[2]

export function getTokenByAddress(address: string): Token | undefined {
  return SUPPORTED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  )
}

export function isNativeETH(address: string): boolean {
  return address === TOKEN_ADDRESSES.ETH
}
