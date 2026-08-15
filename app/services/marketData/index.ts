import type { AssetRef, Quote } from "../../types/portfolio";

export interface AssetSearchResult extends AssetRef { quote: Quote | null; }
export interface MarketResponse<T> { data: T; warnings?: string[]; }

const CACHE_TTL = 5 * 60_000;

export class MarketDataService {
  private cache = new Map<string, { expires: number; value: Quote }>();
  private pending = new Map<string, Promise<unknown>>();

  private dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
    const current = this.pending.get(key) as Promise<T> | undefined;
    if (current) return current;
    const promise = request().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  async searchAssets(query: string): Promise<MarketResponse<AssetSearchResult[]>> {
    const q = query.trim();
    if (q.length < 2) return { data: [] };
    return this.dedupe(`search:${q.toLowerCase()}`, async () => {
      const response = await fetch(`/api/market-data?action=search&q=${encodeURIComponent(q)}`);
      const body = await response.json() as MarketResponse<AssetSearchResult[]> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Asset search is unavailable.");
      for (const item of body.data) if (item.quote) this.cache.set(this.key(item), { expires: Date.now() + CACHE_TTL, value: item.quote });
      return body;
    });
  }

  async getQuotes(assets: AssetRef[], force = false): Promise<MarketResponse<Record<string, Quote>>> {
    const result: Record<string, Quote> = {};
    const missing: AssetRef[] = [];
    const uniqueAssets = [...new Map(assets.map((asset) => [this.key(asset), asset])).values()];
    for (const asset of uniqueAssets) {
      const key = this.key(asset);
      const cached = this.cache.get(key);
      if (!force && cached && cached.expires > Date.now()) result[key] = cached.value;
      else missing.push(asset);
    }
    if (!missing.length) return { data: result };
    return this.dedupe(`quotes:${missing.map((asset) => this.key(asset)).sort().join(",")}`, async () => {
      const response = await fetch("/api/market-data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "quotes", assets: missing }) });
      const body = await response.json() as MarketResponse<Record<string, Quote>> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Quotes are unavailable.");
      for (const [key, quote] of Object.entries(body.data)) this.cache.set(key, { expires: Date.now() + CACHE_TTL, value: quote });
      return { data: { ...result, ...body.data }, warnings: body.warnings };
    });
  }

  async getQuote(asset: AssetRef, force = false) { const response = await this.getQuotes([asset], force); return response.data[this.key(asset)] ?? null; }

  async getFxRate(pair = "USD/TWD"): Promise<MarketResponse<Quote>> {
    return this.dedupe(`fx:${pair}`, async () => {
      const response = await fetch(`/api/market-data?action=fx&pair=${encodeURIComponent(pair)}`);
      const body = await response.json() as MarketResponse<Quote> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "FX rate is unavailable.");
      return body;
    });
  }

  key(asset: Pick<AssetRef, "provider" | "providerId">) { return `${asset.provider}:${asset.providerId}`; }
}

export const marketDataService = new MarketDataService();
