import test from "node:test";
import assert from "node:assert/strict";
import { migratePortfolioData } from "../app/utils/portfolio.ts";

const legacy=(position:Record<string,unknown>,version=1)=>({version,positions:[{id:"legacy-position",name:"Legacy name",quantity:12.5,averageCost:88,currentPrice:101,...position}],watchlist:[{id:"watch",ticker:"2330",name:"台積電",assetType:"Stock",market:"TWSE",currency:"TWD",currentPrice:900,targetEntry:850}],transactions:[{id:"tx",date:"2026-01-02",side:"Buy",ticker:String(position.ticker),quantity:1,price:88,currency:position.currency,fees:3,notes:"preserve me"}],settings:{baseCurrency:"TWD",usdTwdRate:32.8,twdCash:1234,usdCash:56},history:[]});
const cases=[
 ["Taiwan ETF",{ticker:"0050",assetType:"ETF",market:"TWSE",currency:"TWD"},"Taiwan"],
 ["Taiwan Stock",{ticker:"2330",assetType:"Taiwan Stock",market:"TWSE",currency:"TWD"},"Taiwan"],
 ["US Stock",{ticker:"NVDA",assetType:"Stock",market:"NASDAQ",currency:"USD"},"US"],
 ["US ETF",{ticker:"VT",assetType:"ETF",market:"NYSE",currency:"USD"},"US"],
 ["Crypto",{ticker:"BTC",assetType:"Crypto",market:"Crypto",currency:"USD"},"Crypto"],
] as const;
for(const [name,input,region] of cases)test(`migration classifies ${name}`,()=>assert.equal(migratePortfolioData(legacy(input))?.positions[0].marketRegion,region));
test("market takes priority over ambiguous asset type",()=>assert.equal(migratePortfolioData(legacy({ticker:"0050",assetType:"ETF",market:"TWSE",currency:"USD"}))?.positions[0].marketRegion,"Taiwan"));
test("V1 values and manual prices are preserved",()=>{const migrated=migratePortfolioData(legacy({ticker:"0050",assetType:"ETF",market:"TWSE",currency:"TWD"}))!;const p=migrated.positions[0];assert.deepEqual({ticker:p.ticker,name:p.name,quantity:p.quantity,averageCost:p.averageCost,currentPrice:p.currentPrice,priceSource:p.priceSource},{ticker:"0050",name:"Legacy name",quantity:12.5,averageCost:88,currentPrice:101,priceSource:"manual"});assert.equal(migrated.settings.twdCash,1234);assert.equal(migrated.settings.usdCash,56);assert.equal(migrated.watchlist[0].currentPrice,900);assert.equal(migrated.transactions[0].notes,"preserve me")});
test("V2 legacy data follows the same safe migration",()=>assert.equal(migratePortfolioData(legacy({ticker:"VT",assetType:"ETF",market:"NYSE",currency:"USD"},2))?.positions[0].priceSource,"manual"));
test("schemaVersion 2 legacy data is also accepted",()=>{const value=legacy({ticker:"2330",assetType:"Stock",market:"TWSE",currency:"TWD"});delete (value as {version?:number}).version;(value as Record<string,unknown>).schemaVersion=2;assert.equal(migratePortfolioData(value)?.positions[0].marketRegion,"Taiwan")});
test("missing legacy FX stays manual and does not invent 31.5",()=>{const value=legacy({ticker:"VT",assetType:"ETF",market:"NYSE",currency:"USD"});delete (value.settings as Partial<typeof value.settings>).usdTwdRate;const migrated=migratePortfolioData(value)!;assert.equal(migrated.settings.usdTwdRate,0);assert.equal(migrated.settings.fxSource,"manual")});
test("invalid imports are rejected without producing replacement data",()=>{assert.equal(migratePortfolioData({schemaVersion:3,positions:[],watchlist:[],transactions:[],settings:{},portfolioHistory:[],cachedQuotes:{}}),null);assert.equal(migratePortfolioData({version:1,positions:[]}),null)});
