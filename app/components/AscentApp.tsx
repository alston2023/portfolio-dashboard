"use client";

import { useState } from "react";
import type { AppPage, Position, Transaction, WatchlistItem } from "../types/portfolio";
import { usePortfolio } from "../hooks/use-portfolio";
import { formatTime } from "../utils/portfolio";
import { Modal } from "./Modal";
import { PositionForm } from "./PositionForm";
import { WatchlistForm } from "./WatchlistForm";
import { TransactionForm } from "./TransactionForm";
import { useConfirmation } from "./ConfirmationDialog";
import { OverviewPage } from "../pages/OverviewPage";
import { PortfolioPage } from "../pages/PortfolioPage";
import { WatchlistPage } from "../pages/WatchlistPage";
import { TransactionsPage } from "../pages/TransactionsPage";
import { SettingsPage } from "../pages/SettingsPage";

const navItems: { label: AppPage; glyph: string }[] = [
  { label: "Overview", glyph: "⌂" }, { label: "Portfolio", glyph: "▤" }, { label: "Watchlist", glyph: "◎" }, { label: "Transactions", glyph: "↕" }, { label: "Settings", glyph: "⚙" },
];
type Editor = { type: "position"; item?: Position } | { type: "watchlist"; item?: WatchlistItem } | { type: "transaction"; item?: Transaction } | null;

export function AscentApp() {
  const store = usePortfolio(); const confirmAction = useConfirmation();
  const [page, setPage] = useState<AppPage>("Overview"); const [editor, setEditor] = useState<Editor>(null); const [mobileNav, setMobileNav] = useState(false);
  const changePage = (next: AppPage) => { setPage(next); setMobileNav(false); }; const editPosition = (item: Position) => setEditor({ type: "position", item }); const editWatchlist = (item: WatchlistItem) => setEditor({ type: "watchlist", item });
  const titleDetail: Record<AppPage, string> = { Overview: "Your portfolio at a glance", Portfolio: "Positions, cost and market value", Watchlist: "Targets worth watching", Transactions: "Your independent activity ledger", Settings: "Valuation, cash and local data" };
  const loadDemo = async () => { if (await confirmAction({ title: "Load demo portfolio?", message: "This replaces the current portfolio with clearly labelled demo data. You can reset it from Settings.", confirmLabel: "Load demo", tone: "primary" })) store.loadDemo(); };
  if (!store.hydrated) return <div className="app-loading"><span>A</span><p>Opening your local portfolio…</p></div>;
  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}><div className="brand"><span className="brand-mark">A</span><div>Ascent<small>PORTFOLIO MANAGER</small></div><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation">×</button></div><nav aria-label="Primary navigation">{navItems.map((item) => <button key={item.label} className={page === item.label ? "active" : ""} onClick={() => changePage(item.label)}><i>{item.glyph}</i>{item.label}</button>)}</nav><div className="privacy-note"><span /><div>Local portfolio<small>Stored on this device</small></div></div></aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <section className="workspace"><header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation">☰</button><div><p className="eyebrow">PERSONAL PORTFOLIO</p><h1>{page}</h1><span>{titleDetail[page]}</span></div><div className="top-actions"><div className="refresh-status"><span>{store.refreshMessage || (store.lastUpdated ? `Updated ${formatTime(store.lastUpdated)}` : "Market data not refreshed")}</span><button className="button secondary" disabled={store.refreshing} onClick={() => void store.refreshPrices(true)}>{store.refreshing ? "Refreshing…" : "↻ Refresh"}</button></div>{page === "Overview" && <button className="button primary top-add" onClick={() => setEditor({ type: "position" })}>＋ Add position</button>}</div></header><div className="page-content">
      {page === "Overview" && <OverviewPage data={store.data} onAdd={() => setEditor({ type: "position" })} onDemo={loadDemo} onViewPortfolio={() => changePage("Portfolio")} />}
      {page === "Portfolio" && <PortfolioPage onAdd={() => setEditor({ type: "position" })} onEdit={editPosition} />}
      {page === "Watchlist" && <WatchlistPage onAdd={() => setEditor({ type: "watchlist" })} onEdit={editWatchlist} />}
      {page === "Transactions" && <TransactionsPage onAdd={() => setEditor({ type: "transaction" })} onEdit={(item) => setEditor({ type: "transaction", item })} />}{page === "Settings" && <SettingsPage />}
    </div></section>
    {editor?.type === "position" && <Modal eyebrow="HOLDINGS" title={editor.item ? `Edit ${editor.item.ticker}` : "Add position"} onClose={() => setEditor(null)}><PositionForm initial={editor.item} existing={store.data.positions} onEditExisting={editPosition} onCancel={() => setEditor(null)} onSave={(value) => { if (editor.item && "id" in value) store.updatePosition(value); else if (!("id" in value)) store.addPosition(value); setEditor(null); }} /></Modal>}
    {editor?.type === "watchlist" && <Modal eyebrow="PRICE MONITOR" title={editor.item ? `Edit ${editor.item.ticker}` : "Add watchlist item"} onClose={() => setEditor(null)}><WatchlistForm initial={editor.item} existing={store.data.watchlist} onEditExisting={editWatchlist} onCancel={() => setEditor(null)} onSave={(value) => { if (editor.item && "id" in value) store.updateWatchlist(value); else if (!("id" in value)) store.addWatchlist(value); setEditor(null); }} /></Modal>}
    {editor?.type === "transaction" && <Modal eyebrow="ACTIVITY LEDGER" title={editor.item ? `Edit ${editor.item.ticker} transaction` : "Add transaction"} onClose={() => setEditor(null)}><TransactionForm initial={editor.item} onCancel={() => setEditor(null)} onSave={(value) => { if (editor.item && "id" in value) store.updateTransaction(value); else if (!("id" in value)) store.addTransaction(value); setEditor(null); }} /></Modal>}
  </main>;
}
