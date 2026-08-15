"use client";

import type { Transaction } from "../types/portfolio";
import { usePortfolio } from "../hooks/use-portfolio";
import { formatMoney } from "../utils/portfolio";
import { useConfirmation } from "../components/ConfirmationDialog";

export function TransactionsPage({ onAdd, onEdit }: { onAdd(): void; onEdit(item: Transaction): void }) {
  const { data, deleteTransaction } = usePortfolio();
  const confirmAction = useConfirmation();
  const remove = async (item: Transaction) => { if (await confirmAction({ title: `Delete ${item.ticker} transaction?`, message: "This removes the ledger record only. Position quantities are not changed.", confirmLabel: "Delete transaction" })) deleteTransaction(item.id); };
  return <section className="section-block holdings-block"><div className="section-heading"><div><p className="eyebrow">ACTIVITY LEDGER</p><h2>Transactions</h2><span>Independent records — positions are not changed automatically</span></div><button className="button primary" onClick={onAdd}>＋ Add transaction</button></div>
    {!data.transactions.length ? <div className="inline-empty"><strong>No transactions recorded.</strong><span>Keep a manual ledger of buys and sells without affecting position accounting.</span><button className="button secondary" onClick={onAdd}>Add first transaction</button></div> : <div className="table-scroll"><table><thead><tr><th>Date</th><th>Side</th><th>Ticker</th><th>Quantity</th><th>Price</th><th>Fees</th><th>Notes</th><th className="actions">Actions</th></tr></thead><tbody>{data.transactions.map((item) => <tr key={item.id}><td>{item.date}</td><td><span className={`side ${item.side.toLowerCase()}`}>{item.side.toUpperCase()}</span></td><td><strong>{item.ticker}</strong></td><td>{item.quantity.toLocaleString()}</td><td>{formatMoney(item.price, item.currency, 2)}</td><td>{formatMoney(item.fees, item.currency, 2)}</td><td className="notes-cell">{item.notes || "—"}</td><td className="actions"><button onClick={() => onEdit(item)}>Edit</button><button className="danger-link" onClick={() => void remove(item)}>Delete</button></td></tr>)}</tbody></table></div>}
  </section>;
}
