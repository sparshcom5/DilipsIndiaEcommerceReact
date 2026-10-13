import http from 'node:http';
import WebSocket from 'ws';
const PORT=9229, APP='http://localhost:5175';
const list=()=>new Promise((res,rej)=>{http.get({host:'127.0.0.1',port:PORT,path:'/json/list'},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej);});
const page=(await list()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl,{maxPayload:1e8});
await new Promise(r=>ws.on('open',r));
let id=0;const pending=new Map();const seen=[];
ws.on('message',raw=>{const m=JSON.parse(raw);
  if(m.method==='Network.responseReceived'){const u=m.params.response.url;if(u.includes('stellifyflows'))seen.push(m.params.response.status+'  '+u);}
  if(m.id&&pending.has(m.id)){const{resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result);}});
const send=(m,p={})=>{const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p}));return new Promise((res,rej)=>{pending.set(i,{resolve:res,reject:rej});setTimeout(()=>{if(pending.has(i)){pending.delete(i);rej(new Error('t'));}},30000);});};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Page.navigate',{url:APP+'/'}); await sleep(6000);
console.log('what the storefront asked the deployed API for:');
[...new Set(seen)].forEach(s=>console.log('   ',s));
ws.close();
