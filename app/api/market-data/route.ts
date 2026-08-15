import { handleMarketData } from "../../../server/market-data";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleMarketData(request);
export const POST = (request: Request) => handleMarketData(request);
