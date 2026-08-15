import { handleMarketData } from "./lib/market-data";

interface VercelRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host ?? "localhost";
  const body = req.method === "POST" ? JSON.stringify(req.body ?? {}) : undefined;
  const response = await handleMarketData(new Request(`https://${host}${req.url ?? "/api/market-data"}`, {
    method: req.method,
    headers: { "content-type": "application/json" },
    body,
  }));

  res.status(response.status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.send(await response.text());
}
