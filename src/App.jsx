import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";
import {
  LayoutGrid, Briefcase, Star, Globe2, Receipt, Settings as SettingsIcon,
  RefreshCw, Search, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight,
  Circle, ChevronsUpDown,
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const C = {
  bg: "#0B0D10",
  surface: "#111419",
  surface2: "#15181E",
  surfaceHover: "#191D24",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  text: "#EDEEF0",
  textMid: "#A7ADB8",
  textDim: "#6B7280",
  green: "#2FBF71",
  greenDim: "rgba(47,191,113,0.12)",
  red: "#EF5A6F",
  redDim: "rgba(239,90,111,0.12)",
  accent: "#4C8DFF",
  accentDim: "rgba(76,141,255,0.12)",
};

const CAT_COLOR = {
  "US Stocks": "#4C8DFF",
  "Taiwan Stocks": "#38BDF8",
  ETF: "#A78BFA",
  Crypto: "#F5A524",
  Cash: "#6B7280",
};

const FX_USD_TWD = 31.5;

/* ============================================================
   MOCK DATA  (architected to be swapped for live API responses later)
   ============================================================ */
const HOLDINGS = [
  { id: "nvda", name: "NVIDIA", ticker: "NVDA", market: "NASDAQ", category: "US Stocks", currency: "USD", qty: 15, avgCost: 410.5, price: 498.2, todayPct: 1.85 },
  { id: "aapl", name: "Apple", ticker: "AAPL", market: "NASDAQ", category: "US Stocks", currency: "USD", qty: 40, avgCost: 178.3, price: 226.4, todayPct: -0.42 },
  { id: "msft", name: "Microsoft", ticker: "MSFT", market: "NASDAQ", category: "US Stocks", currency: "USD", qty: 20, avgCost: 340.0, price: 468.75, todayPct: 0.63 },
  { id: "2330", name: "TSMC", ticker: "2330", market: "TWSE", category: "Taiwan Stocks", currency: "TWD", qty: 800, avgCost: 620, price: 1035, todayPct: 2.1 },
  { id: "2454", name: "MediaTek", ticker: "2454", market: "TWSE", category: "Taiwan Stocks", currency: "TWD", qty: 150, avgCost: 980, price: 1420, todayPct: -0.85 },
  { id: "voo", name: "Vanguard S&P 500", ticker: "VOO", market: "NYSE", category: "ETF", currency: "USD", qty: 25, avgCost: 410.0, price: 545.3, todayPct: 0.31 },
  { id: "0050", name: "元大台灣50", ticker: "0050", market: "TWSE", category: "ETF", currency: "TWD", qty: 600, avgCost: 128.5, price: 189.2, todayPct: 0.55 },
  { id: "btc", name: "Bitcoin", ticker: "BTC", market: "Crypto", category: "Crypto", currency: "USD", qty: 0.35, avgCost: 58000, price: 96500, todayPct: -2.35 },
  { id: "eth", name: "Ethereum", ticker: "ETH", market: "Crypto", category: "Crypto", currency: "USD", qty: 3.2, avgCost: 3100, price: 5280, todayPct: -3.1 },
];

const CASH_TWD = 150000;

const WATCHLIST = [
  { ticker: "GOOGL", name: "Alphabet", price: 172.4, currency: "USD", todayPct: -0.52, target: 160 },
  { ticker: "AMZN", name: "Amazon", price: 218.9, currency: "USD", todayPct: 1.1, target: 195 },
  { ticker: "META", name: "Meta Platforms", price: 612.3, currency: "USD", todayPct: 0.28, target: 550 },
  { ticker: "TSLA", name: "Tesla", price: 248.7, currency: "USD", todayPct: -1.85, target: 220 },
  { ticker: "2317", name: "Foxconn", price: 198.5, currency: "TWD", todayPct: 0.76, target: 180 },
];

const MARKET_INDICES = [
  { name: "S&P 500", value: "6,449.80", pct: 0.34 },
  { name: "NASDAQ", value: "21,540.12", pct: 0.58 },
  { name: "Dow Jones", value: "44,910.35", pct: -0.12 },
  { name: "TAIEX", value: "23,180.45", pct: 0.82 },
  { name: "BTC/USD", value: "96,500", pct: -2.35 },
  { name: "USD/TWD", value: "31.52", pct: 0.05 },
];

const TRANSACTIONS = [
  { date: "2026-08-13", type: "Buy", ticker: "NVDA", qty: 3, price: 492.1 },
  { date: "2026-08-11", type: "Sell", ticker: "ETH", qty: 0.5, price: 5410.0 },
  { date: "2026-08-07", type: "Buy", ticker: "0050", qty: 100, price: 187.4 },
  { date: "2026-08-02", type: "Buy", ticker: "2330", qty: 100, price: 1012.0 },
  { date: "2026-07-28", type: "Sell", ticker: "AAPL", qty: 10, price: 221.0 },
  { date: "2026-07-20", type: "Buy", ticker: "BTC", qty: 0.05, price: 91200.0 },
];

/* deterministic pseudo-random generator so the chart is stable across renders */
function seededSeries(n, seed) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  let v = 1;
  for (let i = 0; i < n; i++) {
    v += 0.0022 + (rnd() - 0.46) * 0.02;
    out.push(v);
  }
  return out;
}

function buildDailySeries(endValue, days = 365) {
  const raw = seededSeries(days, 42);
  const scale = endValue / raw[raw.length - 1];
  const today = new Date("2026-08-15");
  return raw.map((v, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d, value: v * scale };
  });
}

function buildIntradaySeries(openValue, closeValue, points = 26) {
  const raw = seededSeries(points, 7);
  const min = Math.min(...raw), max = Math.max(...raw);
  const norm = raw.map((v) => (v - min) / (max - min || 1));
  return norm.map((n, i) => ({
    date: new Date(2026, 7, 15, 9, i * 15),
    value: openValue + (closeValue - openValue) * (i / (points - 1)) + (n - 0.5) * Math.abs(closeValue - openValue) * 0.35,
  }));
}

/* ============================================================
   FORMAT HELPERS
   ============================================================ */
const fmtTWD = (v, digits = 0) =>
  "NT$" + Math.round(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtUSD = (v, digits = 2) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtPct = (v, digits = 2) => (v >= 0 ? "+" : "") + v.toFixed(digits) + "%";
const fmtNum = (v, digits = 2) => v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
const toTWD = (h) => h.qty * h.price * (h.currency === "USD" ? FX_USD_TWD : 1);
const costTWD = (h) => h.qty * h.avgCost * (h.currency === "USD" ? FX_USD_TWD : 1);

/* ============================================================
   DERIVED PORTFOLIO METRICS
   ============================================================ */
function usePortfolio() {
  return useMemo(() => {
    const rows = HOLDINGS.map((h) => {
      const marketValue = toTWD(h);
      const costBasis = costTWD(h);
      const totalPL = marketValue - costBasis;
      const returnPct = (totalPL / costBasis) * 100;
      const todayPL = marketValue * (h.todayPct / 100);
      const trend = seededSeries(18, h.ticker.split("").reduce((s, c) => s + c.charCodeAt(0), 0)).map((value, i) => ({ i, value }));
      return { ...h, marketValue, costBasis, totalPL, returnPct, todayPL, trend };
    });
    const holdingsValue = rows.reduce((s, r) => s + r.marketValue, 0);
    const totalValue = holdingsValue + CASH_TWD;
    const totalCost = rows.reduce((s, r) => s + r.costBasis, 0);
    const totalPL = rows.reduce((s, r) => s + r.totalPL, 0);
    const todayPL = rows.reduce((s, r) => s + r.todayPL, 0);
    const todayPct = (todayPL / (totalValue - todayPL)) * 100;
    const returnPct = (totalPL / totalCost) * 100;
    const withWeight = rows.map((r) => ({ ...r, weight: (r.marketValue / totalValue) * 100 }));

    const byCategory = {};
    withWeight.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + r.marketValue; });
    byCategory["Cash"] = CASH_TWD;
    const allocation = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, pct: (value / totalValue) * 100 }))
      .sort((a, b) => b.value - a.value);

    const sortedByWeight = [...withWeight].sort((a, b) => b.weight - a.weight);
    const sortedByReturn = [...withWeight].sort((a, b) => b.returnPct - a.returnPct);
    const top3Weight = sortedByWeight.slice(0, 3).reduce((s, r) => s + r.weight, 0);

    return {
      rows: withWeight, totalValue, totalCost, totalPL, todayPL, todayPct, returnPct,
      cash: CASH_TWD, cashPct: (CASH_TWD / totalValue) * 100, allocation,
      largest: sortedByWeight[0], winner: sortedByReturn[0], loser: sortedByReturn[sortedByReturn.length - 1],
      top3Weight,
      equityExposure: 100 - (byCategory["Crypto"] / totalValue) * 100 - (CASH_TWD / totalValue) * 100,
      cryptoExposure: (byCategory["Crypto"] / totalValue) * 100,
      usExposure: ((byCategory["US Stocks"] || 0) + (byCategory["ETF"] || 0) * 0.6) / totalValue * 100,
      twExposure: ((byCategory["Taiwan Stocks"] || 0) + (byCategory["ETF"] || 0) * 0.4) / totalValue * 100,
      dailySeries: buildDailySeries(totalValue),
    };
  }, []);
}

/* ============================================================
   PRIMITIVES
   ============================================================ */
function ChangeTag({ value, pct = true, digits = 2, size = "sm" }) {
  const positive = value >= 0;
  const sizeCls = size === "sm" ? "text-xs" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${sizeCls}`}
      style={{ color: positive ? C.green : C.red }}
    >
      {positive ? <ArrowUpRight size={size === "sm" ? 12 : 14} /> : <ArrowDownRight size={size === "sm" ? 12 : 14} />}
      {pct ? fmtPct(value, digits) : value}
    </span>
  );
}

function Panel({ title, action, children, className = "", padded = true }) {
  return (
    <div
      className={`rounded-sm ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: C.text }}>{title}</h3>
          {action}
        </div>
      )}
      <div className={padded ? "px-5 pb-5" : ""}>{children}</div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar({ page, setPage }) {
  const nav = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "portfolio", label: "Portfolio", icon: Briefcase },
    { key: "watchlist", label: "Watchlist", icon: Star },
    { key: "markets", label: "Markets", icon: Globe2 },
    { key: "transactions", label: "Transactions", icon: Receipt },
  ];
  return (
    <div
      className="hidden md:flex flex-col shrink-0"
      style={{ width: 232, background: C.bg, borderRight: `1px solid ${C.border}` }}
    >
      <div className="px-5 pt-6 pb-6 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] font-bold"
          style={{ background: C.accent, color: "#fff" }}
        >
          Λ
        </div>
        <div className="leading-tight">
          <div className="text-[13.5px] font-semibold" style={{ color: C.text }}>Ascent</div>
          <div className="text-[10.5px]" style={{ color: C.textDim }}>Personal Portfolio</div>
        </div>
      </div>

      <nav className="px-3 flex flex-col gap-0.5">
        {nav.map((item) => {
          const active = page === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors duration-150 text-left"
              style={{
                color: active ? C.text : C.textMid,
                background: active ? C.surface2 : "transparent",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surface2; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full"
                  style={{ background: C.accent }}
                />
              )}
              <Icon size={15} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-5">
        <button
          onClick={() => setPage("settings")}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] w-full text-left transition-colors duration-150"
          style={{ color: page === "settings" ? C.text : C.textMid, background: page === "settings" ? C.surface2 : "transparent" }}
        >
          <SettingsIcon size={15} strokeWidth={2} />
          Settings
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   TOP BAR
   ============================================================ */
function TopBar({ title, onRefresh }) {
  const [spinning, setSpinning] = useState(false);
  const handleRefresh = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
    onRefresh && onRefresh();
  };
  return (
    <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-5">
      <h1 className="text-[19px] font-semibold" style={{ color: C.text }}>{title}</h1>
      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-1.5 text-[12px]" style={{ color: C.textMid }}>
          <Circle size={7} fill={C.green} color={C.green} />
          Market Open
        </div>
        <div className="hidden sm:block text-[12px]" style={{ color: C.textDim }}>
          Updated 09:41:12
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md transition-colors duration-150"
          style={{ color: C.textMid, border: `1px solid ${C.border}` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.textMid)}
        >
          <RefreshCw size={13} style={{ transition: "transform 500ms", transform: spinning ? "rotate(360deg)" : "none" }} />
          Refresh
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PORTFOLIO SUMMARY
   ============================================================ */
function PortfolioSummary({ p }) {
  return (
    <div className="px-6 md:px-8 pb-7 pt-2">
      <div className="py-2">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
          <div>
            <div className="text-[12px] mb-1.5" style={{ color: C.textDim }}>Total Portfolio Value</div>
            <div className="text-[32px] font-semibold tabular-nums leading-none" style={{ color: C.text }}>
              {fmtTWD(p.totalValue)}
            </div>
          </div>

          <div className="h-10 w-px hidden sm:block" style={{ background: C.border }} />

          <div>
            <div className="text-[12px] mb-1.5" style={{ color: C.textDim }}>Today</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-medium tabular-nums" style={{ color: p.todayPL >= 0 ? C.green : C.red }}>
                {p.todayPL >= 0 ? "+" : "−"}{fmtTWD(Math.abs(p.todayPL))}
              </span>
              <ChangeTag value={p.todayPct} />
            </div>
          </div>

          <div className="h-10 w-px hidden sm:block" style={{ background: C.border }} />

          <div>
            <div className="text-[12px] mb-1.5" style={{ color: C.textDim }}>Total Return</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-medium tabular-nums" style={{ color: p.totalPL >= 0 ? C.green : C.red }}>
                {p.totalPL >= 0 ? "+" : "−"}{fmtTWD(Math.abs(p.totalPL))}
              </span>
              <ChangeTag value={p.returnPct} />
            </div>
          </div>

          <div className="h-10 w-px hidden sm:block" style={{ background: C.border }} />

          <div>
            <div className="text-[12px] mb-1.5" style={{ color: C.textDim }}>Available Cash</div>
            <div className="text-[18px] font-medium tabular-nums" style={{ color: C.text }}>
              {fmtTWD(p.cash)}
              <span className="text-[12px] font-normal ml-1.5" style={{ color: C.textDim }}>{p.cashPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PERFORMANCE CHART
   ============================================================ */
const RANGES = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

function seriesForRange(p, range) {
  const d = p.dailySeries;
  if (range === "1D") return buildIntradaySeries(p.totalValue - p.todayPL, p.totalValue);
  if (range === "1W") return d.slice(-7);
  if (range === "1M") return d.slice(-30);
  if (range === "3M") return d.slice(-90);
  if (range === "YTD") return d.slice(-227);
  if (range === "1Y") return d.slice(-365);
  return d;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const diff = point.diff;
  return (
    <div className="rounded-md px-3 py-2 text-[12px]" style={{ background: C.surface2, border: `1px solid ${C.borderStrong}` }}>
      <div style={{ color: C.textDim }} className="mb-1">
        {point.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
      <div className="font-medium tabular-nums" style={{ color: C.text }}>{fmtTWD(point.value)}</div>
      {diff !== undefined && (
        <div className="tabular-nums" style={{ color: diff >= 0 ? C.green : C.red }}>
          {diff >= 0 ? "+" : "−"}{fmtTWD(Math.abs(diff))}
        </div>
      )}
    </div>
  );
}

function PerformanceChart({ p }) {
  const [range, setRange] = useState("1M");
  const series = useMemo(() => {
    const s = seriesForRange(p, range);
    return s.map((pt, i) => ({ ...pt, diff: i === 0 ? 0 : pt.value - s[i - 1].value }));
  }, [p, range]);
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const rangeUp = last >= first;
  const rangePL = last - first;
  const rangePct = (rangePL / first) * 100;

  return (
    <Panel
      title="Portfolio Performance"
      action={
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="text-[11.5px] px-2.5 py-1.5 transition-colors duration-150"
              style={{
                color: range === r ? C.text : C.textDim,
                background: range === r ? C.accentDim : "transparent",
                borderBottom: range === r ? `1px solid ${C.accent}` : "1px solid transparent",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[20px] font-semibold tabular-nums" style={{ color: rangeUp ? C.green : C.red }}>
          {rangeUp ? "+" : "−"}{fmtTWD(Math.abs(rangePL))}
        </span>
        <span className="text-[13px] tabular-nums" style={{ color: rangeUp ? C.green : C.red }}>{fmtPct(rangePct)}</span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>{range} return</span>
      </div>
      <div className="h-[300px] md:h-[340px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={rangeUp ? C.green : C.red} stopOpacity={0.18} />
                <stop offset="100%" stopColor={rangeUp ? C.green : C.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={C.border} strokeDasharray="2 8" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) =>
                range === "1D"
                  ? d.toLocaleTimeString("en-US", { hour: "numeric" })
                  : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
              tick={{ fill: C.textDim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={["dataMin - dataMin*0.01", "dataMax + dataMax*0.01"]}
              tick={{ fill: C.textDim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v / 1000).toFixed(0) + "k"}
              orientation="right"
              width={52}
            />
            <RTooltip content={<ChartTooltip />} cursor={{ stroke: C.textDim, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={rangeUp ? C.green : C.red}
              strokeWidth={1.75}
              fill="url(#perfFill)"
              activeDot={{ r: 3, fill: rangeUp ? C.green : C.red, stroke: C.bg, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/* ============================================================
   ALLOCATION DONUT
   ============================================================ */
function AllocationDonut({ p }) {
  return (
    <Panel title="Asset Allocation" className="rounded-none">
      <div className="grid sm:grid-cols-[190px_1fr] gap-5 items-center">
        <div className="h-[150px] w-[150px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={p.allocation}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={70}
                paddingAngle={2}
                stroke="none"
              >
                {p.allocation.map((a) => (
                  <Cell key={a.name} fill={CAT_COLOR[a.name]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10.5px]" style={{ color: C.textDim }}>Invested</div>
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: C.text }}>
              NT${((p.totalValue - p.cash) / 1000000).toFixed(2)}M
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          {p.allocation.map((a) => (
            <div key={a.name} className="flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[a.name] }} />
                <span className="truncate" style={{ color: C.textMid }}>{a.name}</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="tabular-nums" style={{ color: C.text }}>{fmtTWD(a.value)}</span>
                <span className="tabular-nums w-12 text-right" style={{ color: C.textDim }}>{a.pct.toFixed(1)}%</span>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4 pt-3 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
            <div><div className="text-[10px]" style={{ color: C.textDim }}>Largest Position</div><div className="text-[12px] mt-1 font-medium tabular-nums" style={{ color: C.text }}>{p.largest.ticker} · {p.largest.weight.toFixed(1)}%</div></div>
            <div><div className="text-[10px]" style={{ color: C.textDim }}>Cash Ratio</div><div className="text-[12px] mt-1 font-medium tabular-nums" style={{ color: C.text }}>{p.cashPct.toFixed(1)}%</div></div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
   HOLDINGS TABLE
   ============================================================ */
const FILTER_TABS = [
  { key: "All", match: () => true },
  { key: "Taiwan", match: (h) => h.category === "Taiwan Stocks" },
  { key: "US", match: (h) => h.category === "US Stocks" },
  { key: "ETF", match: (h) => h.category === "ETF" },
  { key: "Crypto", match: (h) => h.category === "Crypto" },
];

const COLS = [
  { key: "ticker", label: "Asset", align: "left" },
  { key: "market", label: "Market", align: "left" },
  { key: "qty", label: "Quantity", align: "right" },
  { key: "avgCost", label: "Avg. Cost", align: "right" },
  { key: "price", label: "Price", align: "right" },
  { key: "trend", label: "Trend", align: "center", sortable: false },
  { key: "marketValue", label: "Market Value", align: "right" },
  { key: "todayPct", label: "Today", align: "right" },
  { key: "totalPL", label: "Total P/L", align: "right" },
  { key: "returnPct", label: "Return %", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
];

function HoldingsTable({ p, compact = false }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "weight", dir: "desc" });

  const rows = useMemo(() => {
    const activeTab = FILTER_TABS.find((t) => t.key === tab);
    let r = p.rows.filter(activeTab.match);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((h) => h.name.toLowerCase().includes(q) || h.ticker.toLowerCase().includes(q));
    }
    r = [...r].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return compact ? r.slice(0, 5) : r;
  }, [p, tab, query, sort, compact]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const priceStr = (h, v, digits) => (h.currency === "USD" ? fmtUSD(v, digits) : fmtTWD(v, digits));

  return (
    <Panel padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-[13px] font-semibold" style={{ color: C.text }}>Holdings</h3>
          {!compact && (
            <div className="flex items-center gap-1 rounded-md p-0.5" style={{ background: C.surface2 }}>
              {FILTER_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="text-[11.5px] px-2.5 py-1 rounded transition-colors duration-150"
                  style={{ color: tab === t.key ? "#fff" : C.textMid, background: tab === t.key ? C.accent : "transparent" }}
                >
                  {t.key}
                </button>
              ))}
            </div>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
            <Search size={13} color={C.textDim} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search holdings"
              className="bg-transparent outline-none text-[12px] w-32"
              style={{ color: C.text }}
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1120px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                  className={`sticky top-0 select-none px-5 py-2.5 text-[11px] font-medium whitespace-nowrap ${c.sortable === false ? "" : "cursor-pointer"} ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                  style={{ color: sort.key === c.key ? C.text : C.textDim, background: C.surface }}
                >
                  <span className="inline-flex items-center gap-1" style={{ flexDirection: c.align === "right" ? "row-reverse" : "row" }}>
                    {c.label}
                    {c.sortable !== false && (sort.key === c.key ? (
                      sort.dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                    ) : (
                      <ChevronsUpDown size={11} opacity={0.35} />
                    ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr
                key={h.id}
                className="transition-colors duration-150"
                style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-5 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10.5px] font-semibold shrink-0"
                      style={{ background: C.surface2, color: CAT_COLOR[h.category] }}
                    >
                      {h.ticker.slice(0, 2)}
                    </div>
                    <div className="leading-tight">
                      <div className="text-[13px] font-semibold tracking-wide" style={{ color: C.text }}>{h.ticker}</div>
                      <div className="text-[11px]" style={{ color: C.textDim }}>{h.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-[12px]" style={{ color: C.textMid }}>{h.market}</td>
                <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.text }}>{fmtNum(h.qty, h.category === "Crypto" ? 3 : 0)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.textMid }}>{priceStr(h, h.avgCost)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.text }}>{priceStr(h, h.price)}</td>
                <td className="px-5 py-3"><div className="w-[72px] h-[26px] mx-auto"><ResponsiveContainer width="100%" height="100%"><LineChart data={h.trend}><Line type="monotone" dataKey="value" dot={false} stroke={h.todayPct >= 0 ? C.green : C.red} strokeWidth={1.2} /></LineChart></ResponsiveContainer></div></td>
                <td className="px-5 py-3 text-right tabular-nums text-[13px] font-medium" style={{ color: C.text }}>{fmtTWD(h.marketValue)}</td>
                <td className="px-5 py-3 text-right"><ChangeTag value={h.todayPct} /></td>
                <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: h.totalPL >= 0 ? C.green : C.red }}>
                  {h.totalPL >= 0 ? "+" : "−"}{fmtTWD(Math.abs(h.totalPL))}
                </td>
                <td className="px-5 py-3 text-right"><ChangeTag value={h.returnPct} /></td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="tabular-nums text-[12.5px] w-10" style={{ color: C.textMid }}>{h.weight.toFixed(1)}%</span>
                    <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: C.surface2 }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(h.weight * 2, 100)}%`, background: C.textDim }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ============================================================
   WATCHLIST
   ============================================================ */
function WatchlistPanel({ compact = false }) {
  const list = compact ? WATCHLIST.slice(0, 4) : WATCHLIST;
  return (
    <Panel padded={false} title={compact ? undefined : "Watchlist"}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
              {["Ticker", "Company", "Price", "Daily %", "Target Entry", "Distance to Target"].map((label, i) => (
                <th
                  key={label}
                  className={`px-5 py-2.5 text-[11px] font-medium whitespace-nowrap ${i >= 2 ? "text-right" : "text-left"}`}
                  style={{ color: C.textDim }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((w) => {
              const distance = ((w.price - w.target) / w.target) * 100;
              const below = w.price <= w.target;
              return (
                <tr
                  key={w.ticker}
                  className="transition-colors duration-150"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-5 py-3 text-[13px] font-medium" style={{ color: C.text }}>{w.ticker}</td>
                  <td className="px-5 py-3 text-[12.5px]" style={{ color: C.textMid }}>{w.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.text }}>
                    {w.currency === "USD" ? fmtUSD(w.price) : fmtTWD(w.price)}
                  </td>
                  <td className="px-5 py-3 text-right"><ChangeTag value={w.todayPct} /></td>
                  <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.textMid }}>
                    {w.currency === "USD" ? fmtUSD(w.target) : fmtTWD(w.target)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: below ? C.green : C.text }}>
                      {distance > 0 ? "+" : ""}{distance.toFixed(1)}%
                    </span>
                    {below && <span className="ml-2 px-2 py-1 text-[9px] tracking-[0.1em]" style={{ color: C.green, background: C.greenDim, border: `1px solid rgba(47,191,113,.2)` }}>ENTRY ZONE</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ============================================================
   MARKET SNAPSHOT
   ============================================================ */
function MarketSnapshot({ expanded = false }) {
  return (
    <div className="pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: C.text }}>Market Snapshot</h3>
      <div className="flex overflow-x-auto" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        {MARKET_INDICES.map((m) => (
          <div key={m.name} className="min-w-[165px] flex-1 px-4 py-3 first:pl-0" style={{ borderRight: `1px solid ${C.border}` }}>
            <span className="text-[10px] font-medium tracking-wider" style={{ color: C.textDim }}>{m.name}</span>
            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <span className="tabular-nums text-[13px] font-semibold" style={{ color: C.text }}>{m.value}</span>
              <ChangeTag value={m.pct} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PORTFOLIO INSIGHTS
   ============================================================ */
function PortfolioInsights({ p }) {
  const items = [
    { label: "Largest Position", value: `${p.largest.ticker} — ${p.largest.weight.toFixed(1)}%` },
    { label: "Largest Winner", value: `${p.winner.ticker} ${fmtPct(p.winner.returnPct, 1)}`, tone: C.green },
    { label: "Largest Loser", value: `${p.loser.ticker} ${fmtPct(p.loser.returnPct, 1)}`, tone: C.red },
    { label: "Cash Position", value: `${p.cashPct.toFixed(1)}%` },
    { label: "Concentration", value: `Top 3 = ${p.top3Weight.toFixed(0)}%` },
  ];
  return (
    <Panel title="Portfolio Insights">
      <div className="flex flex-col gap-3.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-[12.5px]">
            <span style={{ color: C.textDim }}>{it.label}</span>
            <span className="font-medium tabular-nums" style={{ color: it.tone || C.text }}>{it.value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ============================================================
   RISK / ALLOCATION STATISTICS
   ============================================================ */
function RiskPanel({ p }) {
  const div =
    p.largest.weight > 35 ? "Concentrated" : p.largest.weight > 20 ? "Moderate" : "Diversified";
  const bars = [
    { label: "Equity Exposure", value: p.equityExposure },
    { label: "Crypto Exposure", value: p.cryptoExposure },
    { label: "Cash Ratio", value: p.cashPct },
    { label: "US Exposure", value: p.usExposure },
    { label: "Taiwan Exposure", value: p.twExposure },
  ];
  return (
    <Panel title="Risk & Allocation">
      <div className="flex flex-col gap-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span style={{ color: C.textDim }}>{b.label}</span>
              <span className="tabular-nums" style={{ color: C.textMid }}>{b.value.toFixed(1)}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: C.surface2 }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(b.value, 100)}%`, background: C.textDim }} />
            </div>
          </div>
        ))}
        <div className="pt-2 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between text-[12.5px] mb-2">
            <span style={{ color: C.textDim }}>Diversification</span>
            <span className="font-medium" style={{ color: C.text }}>{div}</span>
          </div>
          <div className="flex items-center justify-between text-[12.5px] mb-1">
            <span style={{ color: C.textDim }}>Top 1 holding</span>
            <span className="tabular-nums" style={{ color: C.textMid }}>{p.largest.weight.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between text-[12.5px]">
            <span style={{ color: C.textDim }}>Top 3 holdings</span>
            <span className="tabular-nums" style={{ color: C.textMid }}>{p.top3Weight.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
   TRANSACTIONS PAGE
   ============================================================ */
function TransactionsPage() {
  return (
    <Panel padded={false} title={undefined}>
      <div className="px-5 pt-4 pb-3">
        <h3 className="text-[13px] font-semibold" style={{ color: C.text }}>Recent Transactions</h3>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
            {["Date", "Type", "Asset", "Quantity", "Price", "Total"].map((l, i) => (
              <th key={l} className={`px-5 py-2.5 text-[11px] font-medium ${i >= 3 ? "text-right" : "text-left"}`} style={{ color: C.textDim }}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TRANSACTIONS.map((t, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              className="transition-colors duration-150">
              <td className="px-5 py-3 text-[12.5px]" style={{ color: C.textMid }}>{t.date}</td>
              <td className="px-5 py-3 text-[12.5px] font-medium" style={{ color: t.type === "Buy" ? C.green : C.red }}>{t.type}</td>
              <td className="px-5 py-3 text-[13px] font-medium" style={{ color: C.text }}>{t.ticker}</td>
              <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.text }}>{fmtNum(t.qty, 3)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-[12.5px]" style={{ color: C.textMid }}>{fmtUSD(t.price)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-[13px] font-medium" style={{ color: C.text }}>{fmtUSD(t.qty * t.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* ============================================================
   SETTINGS PAGE
   ============================================================ */
function SettingsPage() {
  const rows = [
    { label: "Base Currency", value: "TWD" },
    { label: "Refresh Interval", value: "15 seconds" },
    { label: "Price Data Source", value: "Not connected" },
    { label: "FX Rate Source", value: "Not connected" },
  ];
  return (
    <Panel title="Settings">
      <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className="text-[13px]" style={{ color: C.textMid }}>{r.label}</span>
            <span className="text-[13px]" style={{ color: C.text }}>{r.value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [page, setPage] = useState("overview");
  const p = usePortfolio();

  const titles = {
    overview: "Overview",
    portfolio: "Portfolio",
    watchlist: "Watchlist",
    markets: "Markets",
    transactions: "Transactions",
    settings: "Settings",
  };

  return (
    <div className="flex w-full min-h-screen" style={{ background: C.bg, fontFamily: "Inter, Geist, ui-sans-serif, system-ui", fontVariantNumeric: "tabular-nums" }}>
      <Sidebar page={page} setPage={setPage} />

      <div className="flex-1 min-w-0">
        <TopBar title={titles[page]} />
        <div className="md:hidden flex overflow-x-auto px-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          {[
            ["overview", "Overview"], ["portfolio", "Portfolio"], ["watchlist", "Watchlist"],
            ["markets", "Markets"], ["transactions", "Transactions"], ["settings", "Settings"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setPage(key)} className="relative shrink-0 px-3 py-2.5 text-[11px]" style={{ color: page === key ? C.text : C.textDim, background: page === key ? C.accentDim : "transparent" }}>
              {label}{page === key && <span className="absolute left-3 right-3 bottom-0 h-px" style={{ background: C.accent }} />}
            </button>
          ))}
        </div>
        <PortfolioSummary p={p} />

        <div className="px-6 md:px-8 pb-8">
          {page === "overview" && (
            <div className="flex flex-col gap-5">
              <PerformanceChart p={p} />
              <AllocationDonut p={p} />
              <HoldingsTable p={p} compact />
              <MarketSnapshot />
              <WatchlistPanel compact />
              <div className="pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
                <h3 className="text-[13px] font-semibold mb-4" style={{ color: C.text }}>Portfolio Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <PortfolioInsights p={p} />
                <RiskPanel p={p} />
                </div>
              </div>
            </div>
          )}

          {page === "portfolio" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
              <HoldingsTable p={p} />
              <div className="flex flex-col gap-5">
                <PortfolioInsights p={p} />
                <RiskPanel p={p} />
              </div>
            </div>
          )}

          {page === "watchlist" && <WatchlistPanel />}

          {page === "markets" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
              <MarketSnapshot expanded />
              <RiskPanel p={p} />
            </div>
          )}

          {page === "transactions" && <TransactionsPage />}

          {page === "settings" && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
