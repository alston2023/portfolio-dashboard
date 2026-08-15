"use client";

import { useState } from "react";
import type { Currency, Transaction, TransactionSide } from "../types/portfolio";
type Draft = Omit<Transaction, "id">;
const blank: Draft = { date: new Date().toISOString().slice(0, 10), side: "Buy", ticker: "", quantity: 0, price: 0, currency: "USD", fees: 0, notes: "" };

export function TransactionForm({ initial, onCancel, onSave }: { initial?: Transaction; onCancel(): void; onSave(value: Draft | Transaction): void }) {
  const [form, setForm] = useState<Draft | Transaction>(initial ?? blank);
  const [error, setError] = useState("");
  const set = (key: keyof Draft, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.date || !form.ticker.trim() || form.quantity <= 0 || form.price < 0 || form.fees < 0) return setError("Date, ticker and a quantity above zero are required. Values cannot be negative."); onSave({ ...form, ticker: form.ticker.trim().toUpperCase(), notes: form.notes.trim() }); };
  return <form className="entity-form" onSubmit={submit}><div className="form-grid">
    <label>Date<input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
    <label>Side<select value={form.side} onChange={(e) => set("side", e.target.value as TransactionSide)}><option>Buy</option><option>Sell</option></select></label>
    <label>Ticker<input value={form.ticker} onChange={(e) => set("ticker", e.target.value)} placeholder="NVDA" /></label>
    <label>Quantity<input type="number" min="0.00000001" step="any" value={form.quantity || ""} onChange={(e) => set("quantity", Number(e.target.value))} /></label>
    <label>Price<input type="number" min="0" step="any" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} /></label>
    <label>Currency<select value={form.currency} onChange={(e) => set("currency", e.target.value as Currency)}><option>USD</option><option>TWD</option></select></label>
    <label>Fees<input type="number" min="0" step="any" value={form.fees || ""} onChange={(e) => set("fees", Number(e.target.value))} /></label>
    <label className="wide">Notes<textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" /></label>
  </div><p className="form-hint">Transactions are recorded separately and do not change position accounting.</p>{error && <p className="form-error">{error}</p>}<footer><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary">Save transaction</button></footer></form>;
}
