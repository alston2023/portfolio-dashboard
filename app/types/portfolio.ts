export type AssetClass = "Stock" | "ETF" | "Crypto";
export type MarketRegion = "Taiwan" | "US" | "Crypto";
export type Currency = "TWD" | "USD";
export type PriceSource = "auto" | "manual";
export type TransactionSide = "Buy" | "Sell";

export interface AssetRef {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  marketRegion: MarketRegion;
  market: string;
  currency: Currency;
  provider: "twse" | "finnhub" | "coingecko" | "manual";
  providerId: string;
}

export interface Quote {
  ticker: string;
  price: number;
  currency: Currency;
  change: number | null;
  changePercent: number | null;
  timestamp: string;
  source: string;
  isDelayed: boolean;
}

export interface Position extends AssetRef {
  id: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  priceSource: PriceSource;
  lastPriceAt: string | null;
  quoteChange: number | null;
  quoteChangePercent: number | null;
  quoteError: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  side: TransactionSide;
  ticker: string;
  quantity: number;
  price: number;
  currency: Currency;
  fees: number;
  notes: string;
}

export interface WatchlistItem extends AssetRef {
  id: string;
  currentPrice: number;
  targetEntry: number;
  priceSource: PriceSource;
  lastPriceAt: string | null;
  quoteChangePercent: number | null;
  quoteError: string | null;
}

export interface PortfolioSettings {
  baseCurrency: Currency;
  usdTwdRate: number;
  fxSource: PriceSource;
  fxLastUpdated: string | null;
  fxError: string | null;
  twdCash: number;
  usdCash: number;
}

export interface PortfolioSnapshot {
  dateTime: string;
  portfolioValue: number;
  investedAmount: number;
}

export interface PortfolioData {
  schemaVersion: 3;
  positions: Position[];
  watchlist: WatchlistItem[];
  transactions: Transaction[];
  settings: PortfolioSettings;
  portfolioHistory: PortfolioSnapshot[];
  cachedQuotes: Record<string, Quote>;
}

export type AppPage = "Overview" | "Portfolio" | "Watchlist" | "Transactions" | "Settings";
