import type { AssetClass, AssetRef, Currency, MarketRegion, Quote } from "../app/types/portfolio";

interface SearchAsset extends AssetRef { quote: Quote | null; }
interface TwseRow { Date: string; Code: string; Name: string; ClosingPrice: string; MonthlyAveragePrice: string; }
interface FinnhubSearch { count?: number; result?: Array<{ symbol: string; displaySymbol: string; description: string; type: string; }> }
interface FinnhubQuote { c?: number; d?: number; dp?: number; t?: number; }
interface CoinSearch { coins?: Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null; }> }

const responseCache = new Map<string, { expires: number; value: unknown }>();
const TTL = 5 * 60_000;

async function cached<T>(key: string, loader: () => Promise<T>, ttl = TTL): Promise<T> {
  const hit = responseCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  responseCache.set(key, { expires: Date.now() + ttl, value });
  return value;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { accept: "application/json", "user-agent": "Ascent-Portfolio/3.0", ...init?.headers } });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function twseRows() { return cached("twse:all", () => json<TwseRow[]>("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL")); }
const twseDate = (value: string) => { const year = Number(value.slice(0, 3)) + 1911; return `${year}-${value.slice(3, 5)}-${value.slice(5, 7)}T05:30:00.000Z`; };
const assetClassForTwse = (code: string): AssetClass => code.startsWith("00") ? "ETF" : "Stock";
const quoteFromTwse = (row: TwseRow): Quote | null => { const price = Number(row.ClosingPrice); return Number.isFinite(price) && price > 0 ? { ticker: row.Code, price, currency: "TWD", change: null, changePercent: null, timestamp: twseDate(row.Date), source: "TWSE OpenAPI", isDelayed: true } : null; };

async function searchTwse(query: string): Promise<SearchAsset[]> {
  const q = query.toLowerCase();
  const rows = await twseRows();
  return rows.filter((row) => row.Code.toLowerCase().includes(q) || row.Name.toLowerCase().includes(q)).slice(0, 6).map((row) => ({ ticker: row.Code, name: row.Name, assetClass: assetClassForTwse(row.Code), marketRegion: "Taiwan", market: "TWSE", currency: "TWD", provider: "twse", providerId: row.Code, quote: quoteFromTwse(row) }));
}

async function finnhubQuote(symbol: string, token: string): Promise<Quote | null> {
  const data = await cached(`finnhub:${symbol}`, () => json<FinnhubQuote>(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`), 60_000);
  if (!data.c || data.c <= 0) return null;
  return { ticker: symbol, price: data.c, currency: "USD", change: Number.isFinite(data.d) ? data.d! : null, changePercent: Number.isFinite(data.dp) ? data.dp! : null, timestamp: data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString(), source: "Finnhub", isDelayed: false };
}

async function searchFinnhub(query: string, token: string): Promise<SearchAsset[]> {
  const data = await cached(`finnhub-search:${query.toLowerCase()}`, () => json<FinnhubSearch>(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${encodeURIComponent(token)}`));
  const matches = (data.result ?? []).filter((item) => !item.symbol.includes(".") && item.description).slice(0, 5);
  return Promise.all(matches.map(async (item) => ({ ticker: item.displaySymbol || item.symbol, name: item.description, assetClass: /ETF|FUND/i.test(item.type) ? "ETF" as const : "Stock" as const, marketRegion: "US" as const, market: "US", currency: "USD" as const, provider: "finnhub" as const, providerId: item.symbol, quote: await finnhubQuote(item.symbol, token).catch(() => null) })));
}

async function coinQuotes(ids: string[]): Promise<Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>> {
  if (!ids.length) return {};
  return cached(`coins:${ids.sort().join(",")}`, () => json(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`), 60_000);
}

async function searchCoins(query: string): Promise<SearchAsset[]> {
  const data = await cached(`coin-search:${query.toLowerCase()}`, () => json<CoinSearch>(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`));
  const coins = (data.coins ?? []).sort((a, b) => (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999)).slice(0, 5);
  const prices = await coinQuotes(coins.map((coin) => coin.id));
  return coins.map((coin) => { const raw = prices[coin.id]; const price = raw?.usd; return { ticker: coin.symbol.toUpperCase(), name: coin.name, assetClass: "Crypto", marketRegion: "Crypto", market: "Crypto", currency: "USD", provider: "coingecko", providerId: coin.id, quote: price && price > 0 ? { ticker: coin.symbol.toUpperCase(), price, currency: "USD", change: null, changePercent: Number.isFinite(raw.usd_24h_change) ? raw.usd_24h_change! : null, timestamp: raw.last_updated_at ? new Date(raw.last_updated_at * 1000).toISOString() : new Date().toISOString(), source: "CoinGecko", isDelayed: false } : null }; });
}

async function quoteAsset(asset: AssetRef, token?: string): Promise<Quote | null> {
  if (asset.provider === "twse") { const row = (await twseRows()).find((item) => item.Code === asset.providerId); return row ? quoteFromTwse(row) : null; }
  if (asset.provider === "coingecko") { const raw = (await coinQuotes([asset.providerId]))[asset.providerId]; return raw?.usd ? { ticker: asset.ticker, price: raw.usd, currency: "USD", change: null, changePercent: Number.isFinite(raw.usd_24h_change) ? raw.usd_24h_change! : null, timestamp: raw.last_updated_at ? new Date(raw.last_updated_at * 1000).toISOString() : new Date().toISOString(), source: "CoinGecko", isDelayed: false } : null; }
  if (asset.provider === "finnhub" && token) return finnhubQuote(asset.providerId, token);
  return null;
}

async function route(url: URL, body?: unknown) {
  const token = process.env.FINNHUB_API_KEY;
  const action = url.searchParams.get("action") ?? (body as { action?: string } | undefined)?.action;
  if (action === "search") {
    const query = url.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return { data: [] };
    const warnings: string[] = [];
    const tasks: Promise<SearchAsset[]>[] = [searchTwse(query).catch(() => { warnings.push("TWSE search unavailable"); return []; }), searchCoins(query).catch(() => { warnings.push("Crypto search unavailable"); return []; })];
    if (token) tasks.push(searchFinnhub(query, token).catch(() => { warnings.push("US market search unavailable"); return []; })); else warnings.push("Unavailable · FINNHUB_API_KEY not configured");
    const groups = await Promise.all(tasks);
    return { data: groups.flat().sort((a, b) => (a.ticker.toLowerCase() === query.toLowerCase() ? -1 : 0) - (b.ticker.toLowerCase() === query.toLowerCase() ? -1 : 0)).slice(0, 10), warnings };
  }
  if (action === "quotes") {
    const assets = [...new Map(((body as { assets?: AssetRef[] } | undefined)?.assets ?? []).map((asset) => [key(asset), asset])).values()].slice(0, 50);
    const entries = await Promise.all(assets.map(async (asset) => [key(asset), await quoteAsset(asset, token).catch(() => null)] as const));
    const data: Record<string, Quote> = {}; const warnings: string[] = [];
    for (const [assetKey, quote] of entries) quote ? data[assetKey] = quote : warnings.push(assetKey.startsWith("finnhub:") && !token ? `${assetKey} unavailable · FINNHUB_API_KEY not configured` : `${assetKey} unavailable`);
    return { data, warnings };
  }
  if (action === "fx") {
    const fx = await cached("fx:USD/TWD", () => json<{ date: string; rates: { TWD?: number } }>("https://api.frankfurter.dev/v1/latest?base=USD&symbols=TWD"), 60 * 60_000);
    if (!fx.rates.TWD) throw new Error("USD/TWD unavailable");
    return { data: { ticker: "USD/TWD", price: fx.rates.TWD, currency: "TWD" as Currency, change: null, changePercent: null, timestamp: `${fx.date}T16:00:00.000Z`, source: "Frankfurter / central bank reference", isDelayed: true } };
  }
  throw new Error("Unknown action");
}

const key = (asset: Pick<AssetRef, "provider" | "providerId">) => `${asset.provider}:${asset.providerId}`;

export async function handleMarketData(request: Request): Promise<Response> {
  try { const body = request.method === "POST" ? await request.json() : undefined; return Response.json(await route(new URL(request.url), body), { headers: { "cache-control": "private, max-age=60" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Market data unavailable" }, { status: 503 }); }
}
