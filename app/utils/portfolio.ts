import type { AssetClass, Currency, MarketRegion, PortfolioData, Position, Quote, WatchlistItem } from "../types/portfolio";

export const INITIAL_DATA: PortfolioData = {
  schemaVersion: 3,
  positions: [], watchlist: [], transactions: [],
  settings: { baseCurrency: "TWD", usdTwdRate: 0, fxSource: "manual", fxLastUpdated: null, fxError: "Set a manual USD/TWD rate or enable automatic FX.", twdCash: 0, usdCash: 0 },
  portfolioHistory: [], cachedQuotes: {},
};

export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const finite = (value: number) => Number.isFinite(value) ? value : 0;
const usableFx = (rate: number) => Number.isFinite(rate) && rate > 0 ? rate : 0;
export const toTwd = (value: number, currency: Currency, rate: number) => currency === "USD" ? finite(value) * usableFx(rate) : finite(value);
export const fromTwd = (value: number, currency: Currency, rate: number) => currency === "USD" ? (usableFx(rate) ? finite(value) / rate : 0) : finite(value);

export function positionMetrics(position: Pick<Position, "quantity" | "averageCost" | "currentPrice" | "currency">, rate: number) {
  const cost = toTwd(finite(position.quantity) * finite(position.averageCost), position.currency, rate);
  const marketValue = toTwd(finite(position.quantity) * finite(position.currentPrice), position.currency, rate);
  const profitLoss = marketValue - cost;
  return { cost, marketValue, profitLoss, returnPct: cost > 0 ? (profitLoss / cost) * 100 : null };
}

export function getMetrics(data: PortfolioData) {
  const { usdTwdRate, twdCash, usdCash, baseCurrency } = data.settings;
  const rows = data.positions.map((position) => ({ position, ...positionMetrics(position, usdTwdRate) }));
  const investedTwd = rows.reduce((sum, row) => sum + row.cost, 0);
  const holdingsTwd = rows.reduce((sum, row) => sum + row.marketValue, 0);
  const cashTwd = finite(twdCash) + finite(usdCash) * usableFx(usdTwdRate);
  const totalTwd = holdingsTwd + cashTwd;
  const profitLossTwd = rows.reduce((sum, row) => sum + row.profitLoss, 0);
  const todayKnown = rows.filter((row) => row.position.quoteChange !== null);
  const todayPlTwd = todayKnown.reduce((sum, row) => sum + toTwd(row.position.quantity * (row.position.quoteChange ?? 0), row.position.currency, usdTwdRate), 0);
  const convert = (value: number) => fromTwd(value, baseCurrency, usdTwdRate);
  return { rows, invested: convert(investedTwd), holdings: convert(holdingsTwd), cash: convert(cashTwd), total: convert(totalTwd), profitLoss: convert(profitLossTwd), returnPct: investedTwd > 0 ? (profitLossTwd / investedTwd) * 100 : null, todayPl: convert(todayPlTwd), todayPlAvailable: todayKnown.length > 0, totalTwd, investedTwd };
}

export function getAllocation(data: PortfolioData, dimension: "assetClass" | "marketRegion") {
  const metrics = getMetrics(data); const amounts = new Map<string, number>();
  for (const row of metrics.rows) { const key = row.position[dimension]; const amount = fromTwd(row.marketValue, data.settings.baseCurrency, data.settings.usdTwdRate); amounts.set(key, (amounts.get(key) ?? 0) + amount); }
  if (metrics.cash > 0) amounts.set("Cash", metrics.cash);
  return [...amounts].map(([label, amount]) => ({ label, amount, pct: metrics.total > 0 ? amount / metrics.total * 100 : 0 }));
}

export function getPerformanceLeaders(data: PortfolioData) {
  const rows = getMetrics(data).rows;
  const winner = rows.filter((row) => row.returnPct !== null && row.returnPct > 0).sort((a, b) => (b.returnPct ?? 0) - (a.returnPct ?? 0))[0] ?? null;
  const loser = rows.filter((row) => row.returnPct !== null && row.returnPct < 0).sort((a, b) => (a.returnPct ?? 0) - (b.returnPct ?? 0))[0] ?? null;
  return { winner, loser };
}

export function watchlistDistance(currentPrice: number, targetPrice: number) { return Number.isFinite(currentPrice) && currentPrice > 0 && Number.isFinite(targetPrice) && targetPrice > 0 ? (currentPrice - targetPrice) / targetPrice * 100 : null; }
export function findDuplicatePosition(positions: Position[], asset: Pick<Position, "ticker" | "marketRegion">, excludeId?: string) { return positions.find((position) => position.id !== excludeId && position.ticker.toUpperCase() === asset.ticker.toUpperCase() && position.marketRegion === asset.marketRegion); }
export function shouldRecordSnapshot(last: PortfolioData["portfolioHistory"][number] | undefined, totalTwd: number, now: number) { if (!Number.isFinite(totalTwd) || totalTwd <= 0) return false; if (!last) return true; const elapsed = now - new Date(last.dateTime).getTime(); const changed = Math.abs(totalTwd - last.portfolioValue) / Math.max(last.portfolioValue, 1) >= .001; return elapsed >= 30 * 60_000 && changed; }

export function formatMoney(value: number, currency: Currency, digits?: number) { const maximumFractionDigits = digits ?? (currency === "TWD" ? 0 : 2); const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits, minimumFractionDigits: maximumFractionDigits }).format(finite(value)); return `${currency === "USD" ? "US$" : "NT$"}${formatted}`; }
export const formatPct = (value: number | null) => value === null || !Number.isFinite(value) ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
export const formatQuantity = (value: number, crypto = false) => new Intl.NumberFormat("en-US", { maximumFractionDigits: crypto ? 8 : 6 }).format(finite(value));
export const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Never";

const safeString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const safeNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
const oldClass = (value: unknown): AssetClass => value === "ETF" ? "ETF" : value === "Crypto" ? "Crypto" : "Stock";
const oldRegion = (item: Record<string, unknown>): MarketRegion => {
  const market = safeString(item.market).trim().toUpperCase(); const currency = safeString(item.currency).trim().toUpperCase(); const assetType = safeString(item.assetType ?? item.assetClass).trim().toUpperCase();
  if (["TWSE", "TPEX"].includes(market)) return "Taiwan";
  if (["NASDAQ", "NYSE", "AMEX"].includes(market)) return "US";
  if (market === "CRYPTO") return "Crypto";
  if (currency === "TWD") return "Taiwan";
  if (currency === "USD") return assetType === "CRYPTO" ? "Crypto" : "US";
  if (assetType === "TAIWAN STOCK") return "Taiwan";
  if (assetType === "CRYPTO") return "Crypto";
  return "US";
};

export function migratePortfolioData(value: unknown): PortfolioData | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion === 3) return validateV3(raw) ? raw as unknown as PortfolioData : null;
  if (![1, 2].includes(Number(raw.version ?? raw.schemaVersion)) || !Array.isArray(raw.positions) || !Array.isArray(raw.watchlist) || !Array.isArray(raw.transactions) || !raw.settings || typeof raw.settings !== "object") return null;
  try {
    const settings = raw.settings as Record<string, unknown>;
    const positions: Position[] = raw.positions.map((item) => { const old = item as Record<string, unknown>; const ticker = safeString(old.ticker).toUpperCase(); return { id: safeString(old.id, createId()), ticker, name: safeString(old.name, ticker), assetClass: oldClass(old.assetType ?? old.assetClass), marketRegion: oldRegion(old), market: safeString(old.market, "Manual"), currency: old.currency === "TWD" ? "TWD" : "USD", provider: "manual", providerId: ticker, quantity: safeNumber(old.quantity), averageCost: safeNumber(old.averageCost), currentPrice: safeNumber(old.currentPrice, safeNumber(old.manualPrice)), priceSource: "manual", lastPriceAt: null, quoteChange: null, quoteChangePercent: null, quoteError: null, createdAt: safeString(old.createdAt, new Date().toISOString()) }; });
    const watchlist: WatchlistItem[] = raw.watchlist.map((item) => { const old = item as Record<string, unknown>; const ticker = safeString(old.ticker).toUpperCase(); return { id: safeString(old.id, createId()), ticker, name: safeString(old.name, ticker), assetClass: oldClass(old.assetType ?? old.assetClass), marketRegion: oldRegion(old), market: safeString(old.market, "Manual"), currency: old.currency === "TWD" ? "TWD" : "USD", provider: "manual", providerId: ticker, currentPrice: safeNumber(old.currentPrice, safeNumber(old.manualPrice)), targetEntry: safeNumber(old.targetEntry), priceSource: "manual", lastPriceAt: null, quoteChangePercent: null, quoteError: null }; });
    const history = Array.isArray(raw.history) ? raw.history.map((point) => { const old = point as Record<string, unknown>; return { dateTime: `${safeString(old.date)}T12:00:00.000Z`, portfolioValue: safeNumber(old.portfolioValue), investedAmount: 0 }; }).filter((point) => point.portfolioValue > 0 && !Number.isNaN(new Date(point.dateTime).getTime())) : [];
    const rate = safeNumber(settings.usdTwdRate);
    return { schemaVersion: 3, positions, watchlist, transactions: structuredClone(raw.transactions) as PortfolioData["transactions"], settings: { baseCurrency: settings.baseCurrency === "USD" ? "USD" : "TWD", usdTwdRate: rate, fxSource: "manual", fxLastUpdated: null, fxError: rate > 0 ? null : "Set a manual USD/TWD rate or enable automatic FX.", twdCash: safeNumber(settings.twdCash), usdCash: safeNumber(settings.usdCash) }, portfolioHistory: history, cachedQuotes: {} };
  } catch { return null; }
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const validAsset = (value: unknown) => isRecord(value) && typeof value.ticker === "string" && typeof value.name === "string" && ["Stock","ETF","Crypto"].includes(String(value.assetClass)) && ["Taiwan","US","Crypto"].includes(String(value.marketRegion)) && typeof value.market === "string" && ["TWD","USD"].includes(String(value.currency)) && ["twse","finnhub","coingecko","manual"].includes(String(value.provider)) && typeof value.providerId === "string";
function validateV3(raw: Record<string, unknown>) {
  if (!Array.isArray(raw.positions) || !raw.positions.every((value) => validAsset(value) && isRecord(value) && typeof value.id === "string" && isFiniteNumber(value.quantity) && value.quantity > 0 && isFiniteNumber(value.averageCost) && value.averageCost >= 0 && isFiniteNumber(value.currentPrice) && value.currentPrice >= 0 && ["auto","manual"].includes(String(value.priceSource)))) return false;
  if (!Array.isArray(raw.watchlist) || !raw.watchlist.every((value) => validAsset(value) && isRecord(value) && typeof value.id === "string" && isFiniteNumber(value.currentPrice) && value.currentPrice >= 0 && isFiniteNumber(value.targetEntry) && value.targetEntry > 0 && ["auto","manual"].includes(String(value.priceSource)))) return false;
  if (!Array.isArray(raw.transactions) || !raw.transactions.every((value) => isRecord(value) && typeof value.id === "string" && typeof value.ticker === "string" && ["Buy","Sell"].includes(String(value.side)) && isFiniteNumber(value.quantity) && isFiniteNumber(value.price) && isFiniteNumber(value.fees))) return false;
  const settings = raw.settings; if (!isRecord(settings) || !["TWD","USD"].includes(String(settings.baseCurrency)) || !isFiniteNumber(settings.usdTwdRate) || settings.usdTwdRate < 0 || !["auto","manual"].includes(String(settings.fxSource)) || !isFiniteNumber(settings.twdCash) || !isFiniteNumber(settings.usdCash)) return false;
  return Array.isArray(raw.portfolioHistory) && raw.portfolioHistory.every((value) => isRecord(value) && typeof value.dateTime === "string" && isFiniteNumber(value.portfolioValue) && isFiniteNumber(value.investedAmount)) && isRecord(raw.cachedQuotes);
}
export const isPortfolioData = (value: unknown): value is PortfolioData => migratePortfolioData(value)?.schemaVersion === 3;
export const quoteKey = (asset: { provider: string; providerId: string }) => `${asset.provider}:${asset.providerId}`;
export const applyQuote = <T extends Position | WatchlistItem>(item: T, quote: Quote): T => ({ ...item, currentPrice: quote.price, lastPriceAt: quote.timestamp, quoteChangePercent: quote.changePercent, quoteError: null, ...( "quoteChange" in item ? { quoteChange: quote.change } : {} ) } as T);
export function mergeQuoteRefresh<T extends Position | WatchlistItem>(items: T[], quotes: Record<string, Quote>): T[] { return items.map((item) => { if (item.priceSource !== "auto") return item; const quote = quotes[quoteKey(item)]; return quote ? applyQuote(item, quote) : { ...item, quoteError: "Price unavailable" }; }); }
