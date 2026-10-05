import http from 'node:http';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import worker from '../dist/server/index.js';
await mkdir('.local', { recursive:true });
let queue=Promise.resolve();
const bucket = {
  async get() { try {const text=await readFile('.local/state.json','utf8');return {etag:createHash('sha256').update(text).digest('hex'),json:async()=>JSON.parse(text)};}catch(e){if(e.code==='ENOENT')return null;throw e;} },
  async put(key,text,options) {
    const operation=queue.then(async()=>{const old=await this.get();const cond=options.onlyIf;if(cond.etagMatches && old?.etag!==cond.etagMatches)return null;if(cond.etagDoesNotMatch==='*' && old)return null;await writeFile('.local/state.tmp',text);await rename('.local/state.tmp','.local/state.json');return {etag:createHash('sha256').update(text).digest('hex')};});queue=operation.catch(()=>{});return operation;
  }
};
const server=http.createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2100000){res.writeHead(413);res.end();return;}chunks.push(chunk);}const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const result=await worker.fetch(request,{BUCKET:bucket,OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch(e){console.error(e.message);res.writeHead(500);res.end('Server error');}});
const port=Number(process.env.PORT||4173);server.listen(port,'127.0.0.1',()=>console.log('Train to Earn: http://127.0.0.1:'+port));
