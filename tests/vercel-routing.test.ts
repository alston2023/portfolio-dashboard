import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";

interface Result { status:number; headers:Record<string,string>; body:string; }
type BundledHandler=(req:{method?:string;url?:string;headers:Record<string,string|string[]|undefined>;body?:unknown},res:{status(code:number):unknown;setHeader(name:string,value:string):void;send(body:string):void})=>Promise<void>;
const functionSource=readFileSync("api/market-data.ts","utf8");
const functionBuild=ts.transpileModule(functionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,removeComments:true}}).outputText;
const functionBuildDir=mkdtempSync(join(tmpdir(),"ascent-vercel-function-"));
const functionBuildPath=join(functionBuildDir,"api","market-data.js");
mkdirSync(dirname(functionBuildPath),{recursive:true});
writeFileSync(functionBuildPath,functionBuild,"utf8");
test.after(()=>rmSync(functionBuildDir,{recursive:true,force:true}));
async function loadBundledHandler():Promise<BundledHandler>{const module=await import(pathToFileURL(functionBuildPath).href) as {default:BundledHandler};return module.default}
async function invoke(method:string,url:string,body?:unknown):Promise<Result>{const handler=await loadBundledHandler();const result:Result={status:200,headers:{},body:""};await handler({method,url,headers:{host:"ascent.test"},body},{status(code){result.status=code;return this},setHeader(name,value){result.headers[name.toLowerCase()]=value},send(value){result.body=value}});return result}
const providerJson=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{"content-type":"application/json"}});

test("Vercel uses a native market-data function and excludes every /api/* path from SPA fallback",()=>{assert.equal(existsSync("api/market-data.ts"),true);assert.equal(existsSync("api/_market-data.ts"),false);const config=JSON.parse(readFileSync("vercel.json","utf8")) as {rewrites:Array<{source:string;destination:string}>};assert.equal(config.rewrites.length,1);assert.equal(config.rewrites[0].destination,"/index.html");const rewrite=new RegExp(`^${config.rewrites[0].source}$`);assert.equal(rewrite.test("/portfolio/holdings"),true);assert.equal(rewrite.test("/api/market-data"),false);assert.equal(rewrite.test("/api/anything"),false)});

test("compiled Vercel function is a standalone JavaScript entry",async()=>{assert.doesNotMatch(functionSource,/^\s*import\s/m);for(const forbidden of ["./lib/market-data","../server/market-data",".ts","/var/task/api/lib","/var/task/server"])assert.equal(functionBuild.includes(forbidden),false,`compiled function contains ${forbidden}`);assert.match(functionBuild,/TWSE OpenAPI/);assert.equal(typeof await loadBundledHandler(),"function")});

test("native Vercel API returns JSON for search, quotes and FX",{concurrency:false},async()=>{const originalFetch=globalThis.fetch,originalKey=process.env.FINNHUB_API_KEY;delete process.env.FINNHUB_API_KEY;globalThis.fetch=async(input)=>{const url=new URL(String(input));if(url.hostname==="openapi.twse.com.tw")return providerJson([{Date:"1150814",Code:"0050",Name:"元大台灣50",ClosingPrice:"106.40",MonthlyAveragePrice:"103.97"},{Date:"1150814",Code:"2330",Name:"台積電",ClosingPrice:"1200",MonthlyAveragePrice:"1180"}]);if(url.hostname.includes("coingecko")&&url.pathname.includes("/simple/price"))return providerJson({bitcoin:{usd:118000,usd_24h_change:2.5,last_updated_at:1786723200}});if(url.hostname.includes("coingecko"))return providerJson({coins:[]});if(url.hostname==="api.frankfurter.dev")return providerJson({date:"2026-08-14",rates:{TWD:31.4}});throw new Error(`Unexpected URL ${url}`)};try{
 for(const ticker of ["0050","2330"]){const result=await invoke("GET",`/api/market-data?action=search&q=${ticker}`);assert.equal(result.status,200);assert.match(result.headers["content-type"],/^application\/json/);const payload=JSON.parse(result.body) as {data:Array<{ticker:string;name:string;market:string;assetClass:string;currency:string;provider:string}>};assert.equal(payload.data[0].ticker,ticker);assert.equal(payload.data[0].provider,"twse");assert.equal(payload.data[0].market,"TWSE");assert.equal(payload.data[0].currency,"TWD");if(ticker==="0050"){assert.equal(payload.data[0].name,"元大台灣50");assert.equal(payload.data[0].assetClass,"ETF")}}
 const noKey=await invoke("GET","/api/market-data?action=search&q=NVDA");assert.equal(noKey.status,200);assert.match(noKey.headers["content-type"],/^application\/json/);assert.match(noKey.body,/FINNHUB_API_KEY not configured/);
 const quotes=await invoke("POST","/api/market-data",{action:"quotes",assets:[]});assert.equal(quotes.status,200);assert.deepEqual(JSON.parse(quotes.body),{data:{},warnings:[]});
 const btc=await invoke("POST","/api/market-data",{action:"quotes",assets:[{ticker:"BTC",name:"Bitcoin",assetClass:"Crypto",marketRegion:"Crypto",market:"Crypto",currency:"USD",provider:"coingecko",providerId:"bitcoin"}]});assert.equal(btc.status,200);assert.match(btc.headers["content-type"],/^application\/json; charset=utf-8$/);assert.equal((JSON.parse(btc.body) as {data:Record<string,{price:number}>}).data["coingecko:bitcoin"].price,118000);
 const fx=await invoke("GET","/api/market-data?action=fx&pair=USD/TWD");assert.equal(fx.status,200);assert.match(fx.headers["content-type"],/^application\/json/);assert.equal((JSON.parse(fx.body) as {data:{ticker:string}}).data.ticker,"USD/TWD");
 const unknown=await invoke("GET","/api/market-data?action=unknown");assert.equal(unknown.status,503);assert.match(unknown.headers["content-type"],/^application\/json/);assert.doesNotMatch(unknown.body,/<!doctype/i);assert.equal((JSON.parse(unknown.body) as {error:string}).error,"Unknown action");
 globalThis.fetch=async()=>{throw new Error("network unavailable")};const degraded=await invoke("GET","/api/market-data?action=search&q=NETWORK-FAIL");assert.equal(degraded.status,200);assert.match(degraded.headers["content-type"],/^application\/json; charset=utf-8$/);assert.ok((JSON.parse(degraded.body) as {warnings:string[]}).warnings.length>0);
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.FINNHUB_API_KEY;else process.env.FINNHUB_API_KEY=originalKey}});
