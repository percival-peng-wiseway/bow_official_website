import http from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {Readable} from 'node:stream';
import {handleContact} from '../backend/contact-worker.mjs';
const port=Number(process.env.PORT||process.argv[process.argv.indexOf('--port')+1])||4174;
const root=resolve('dist'),outbox=resolve('.local/enquiries');
const origins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`];
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origins[0]);let pathname=decodeURIComponent(url.pathname);
  if(pathname.startsWith('/bow_official_website/'))pathname=pathname.slice('/bow_official_website'.length);
  if(pathname==='/api/contact/'||pathname==='/api/contact'){
   const init={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
   const request=new Request(origins[0]+pathname,init);
   const result=await handleContact(request,{ALLOWED_ORIGINS:origins.join(',')},{local:true,deliver:async enquiry=>{
    await mkdir(outbox,{recursive:true});const path=resolve(outbox,enquiry.requestId+'.json');
    try{await writeFile(path,JSON.stringify(enquiry,null,2)+'\n',{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;const saved=JSON.parse(await readFile(path,'utf8'));for(const k of ['firstName','lastName','email','phone','company','service','message'])if((saved[k]??'')!==(enquiry[k]??''))throw new Error('Request reference already used.');}
   }});
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let path=resolve(root,'.'+pathname);if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{if((await stat(path)).isDirectory())path=resolve(path,'index.html');const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);}catch(error){res.writeHead(404,{'Content-Type':'text/html;charset=utf-8'});res.end(req.method==='HEAD'?undefined:await readFile(resolve(root,'404.html')));}
 }catch{res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'Invalid request.'}));}
});
server.listen(port,'127.0.0.1',()=>console.log(`BOW review preview: ${origins[0]}/\nContact form: local test outbox only; no email sent.`));
