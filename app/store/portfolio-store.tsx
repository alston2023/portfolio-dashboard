"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioData, PortfolioSettings, Position, Transaction, WatchlistItem } from "../types/portfolio";
import { marketDataService } from "../services/marketData";
import { createId, getMetrics, INITIAL_DATA, mergeQuoteRefresh, migratePortfolioData, shouldRecordSnapshot } from "../utils/portfolio";

const STORAGE_KEY = "ascent.portfolio.v1";
const PRE_IMPORT_BACKUP_KEY = "ascent.pre-import-backup";

interface PortfolioStore {
  data: PortfolioData; hydrated: boolean; refreshing: boolean; refreshMessage: string; lastUpdated: string | null;
  addPosition(position: Omit<Position, "id" | "createdAt">): void; updatePosition(position: Position): void; deletePosition(id: string): void;
  addWatchlist(item: Omit<WatchlistItem, "id">): void; updateWatchlist(item: WatchlistItem): void; deleteWatchlist(id: string): void;
  addTransaction(item: Omit<Transaction, "id">): void; updateTransaction(item: Transaction): void; deleteTransaction(id: string): void;
  updateSettings(settings: PortfolioSettings): void; importData(data: PortfolioData): void; reset(): void; loadDemo(): void; refreshPrices(force?: boolean): Promise<void>;
}

const Context = createContext<PortfolioStore | null>(null);

const demoData = (): PortfolioData => ({ ...INITIAL_DATA, positions: [{ id:createId(), ticker:"0050", name:"元大台灣50", assetClass:"ETF", marketRegion:"Taiwan", market:"TWSE", currency:"TWD", provider:"twse", providerId:"0050", quantity:100, averageCost:100, currentPrice:106.4, priceSource:"auto", lastPriceAt:null, quoteChange:null, quoteChangePercent:null, quoteError:null, createdAt:new Date().toISOString() }], settings: { ...INITIAL_DATA.settings, twdCash: 15000 } });

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PortfolioData>(INITIAL_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const autoRefreshed = useRef(false);

  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const migrated = migratePortfolioData(JSON.parse(raw)); if (migrated) setData(migrated); } } catch { /* Keep a safe empty state. */ } setHydrated(true); }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setData((current) => {
      const metrics = getMetrics(current); if (metrics.totalTwd <= 0) return current;
      const last = current.portfolioHistory.at(-1); const now = Date.now();
      if (!shouldRecordSnapshot(last, metrics.totalTwd, now)) return current;
      return { ...current, portfolioHistory: [...current.portfolioHistory, { dateTime: new Date(now).toISOString(), portfolioValue: metrics.totalTwd, investedAmount: metrics.investedTwd }].slice(-1500) };
    });
  }, [hydrated, data.positions, data.settings]);

  const refreshPrices = useCallback(async (force = false) => {
    if (refreshing) return; setRefreshing(true); setRefreshMessage("Refreshing market data…");
    const snapshot = data;
    const assets = [...snapshot.positions, ...snapshot.watchlist].filter((item) => item.priceSource === "auto" && item.provider !== "manual");
    let quotes: Record<string, import("../types/portfolio").Quote> = {}; let warnings: string[] = [];
    try { const result = await marketDataService.getQuotes(assets, force); quotes = result.data; warnings = result.warnings ?? []; } catch (error) { warnings = [error instanceof Error ? error.message : "Quote refresh failed"]; }
    let fxRate: number | null = null; let fxTimestamp: string | null = null; let fxError: string | null = null;
    if (snapshot.settings.fxSource === "auto") { try { const fx = await marketDataService.getFxRate(); fxRate = fx.data.price; fxTimestamp = fx.data.timestamp; } catch (error) { fxError = error instanceof Error ? error.message : "FX unavailable"; } }
    setData((current) => ({ ...current,
      positions: mergeQuoteRefresh(current.positions, quotes),
      watchlist: mergeQuoteRefresh(current.watchlist, quotes),
      settings: { ...current.settings, ...(fxRate ? { usdTwdRate: fxRate, fxLastUpdated: fxTimestamp, fxError: null } : fxError ? { fxError } : {}) },
      cachedQuotes: { ...current.cachedQuotes, ...quotes },
    }));
    setRefreshMessage(warnings.length ? `Updated available prices · ${warnings.length} unavailable` : "Prices updated"); setRefreshing(false);
  }, [data, refreshing]);

  useEffect(() => { if (hydrated && !autoRefreshed.current) { autoRefreshed.current = true; void refreshPrices(false); } }, [hydrated, refreshPrices]);

  const mutate = useCallback((fn: (current: PortfolioData) => PortfolioData) => setData(fn), []);
  const value = useMemo<PortfolioStore>(() => ({ data, hydrated, refreshing, refreshMessage,
    lastUpdated: [...data.positions.map((p) => p.lastPriceAt), ...data.watchlist.map((p) => p.lastPriceAt), data.settings.fxLastUpdated].filter(Boolean).sort().at(-1) ?? null,
    addPosition: (position) => mutate((d) => ({ ...d, positions: [...d.positions, { ...position, id:createId(), createdAt:new Date().toISOString() }] })),
    updatePosition: (position) => mutate((d) => ({ ...d, positions:d.positions.map((item) => item.id === position.id ? position : item) })), deletePosition: (id) => mutate((d) => ({ ...d, positions:d.positions.filter((item) => item.id !== id) })),
    addWatchlist: (item) => mutate((d) => ({ ...d, watchlist:[...d.watchlist, { ...item, id:createId() }] })), updateWatchlist: (item) => mutate((d) => ({ ...d, watchlist:d.watchlist.map((current) => current.id === item.id ? item : current) })), deleteWatchlist: (id) => mutate((d) => ({ ...d, watchlist:d.watchlist.filter((item) => item.id !== id) })),
    addTransaction: (item) => mutate((d) => ({ ...d, transactions:[{ ...item, id:createId() }, ...d.transactions] })), updateTransaction: (item) => mutate((d) => ({ ...d, transactions:d.transactions.map((current) => current.id === item.id ? item : current) })), deleteTransaction: (id) => mutate((d) => ({ ...d, transactions:d.transactions.filter((item) => item.id !== id) })),
    updateSettings: (settings) => mutate((d) => ({ ...d, settings })), importData: (imported) => setData((current) => { localStorage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify(current)); return imported; }), reset: () => setData(INITIAL_DATA), loadDemo: () => setData(demoData()), refreshPrices,
  }), [data, hydrated, refreshing, refreshMessage, mutate, refreshPrices]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePortfolio() { const store = useContext(Context); if (!store) throw new Error("usePortfolio must be used inside PortfolioProvider"); return store; }
