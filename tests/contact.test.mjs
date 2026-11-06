import test from 'node:test';
import assert from 'node:assert/strict';
import {handleContact} from '../backend/contact-worker.mjs';
const origin='https://example.test';
const payload=()=>({firstName:'Review',lastName:'Tester',email:'review@example.test',company:'Test company',service:'structures',message:'A local test enquiry.',website:'',requestId:crypto.randomUUID()});
const req=(body=payload(),options={})=>new Request('https://forms.example.test/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...options.headers},body:typeof body==='string'?body:JSON.stringify(body)});
const env=()=>({ALLOWED_ORIGINS:origin,RESEND_API_KEY:'test-placeholder-not-a-real-key',CONTACT_FROM:'BOW <forms@example.test>',CONTACT_RATE_LIMITER:{async limit(){return {success:true};}},GLOBAL_RATE_LIMITER:{async limit(){return {success:true};}}});
test('Local review submission records data only in the injected local outbox and labels its mode',async()=>{
 const saved=[];const r=await handleContact(req(),{ALLOWED_ORIGINS:origin},{local:true,deliver:async p=>saved.push(p),fetch:()=>{throw new Error('External call forbidden');}});
 assert.equal(r.status,200);assert.equal((await r.json()).mode,'local');assert.equal(saved.length,1);assert.equal(saved[0].to,'info@bowprojects.com.au');
});
test('Phone remains optional for existing clients and preserves international formatting when supplied',async()=>{
 for(const phone of [undefined,'','  +61 (0) 400 000 000  ']){
  let saved;const p=payload();if(phone!==undefined)p.phone=phone;
  const r=await handleContact(req(p),{ALLOWED_ORIGINS:origin},{local:true,deliver:async enquiry=>{saved=enquiry;}});
  assert.equal(r.status,200);assert.equal(saved.phone,(phone||'').trim());
 }
});
test('Invalid optional phone values are rejected before delivery',async()=>{
 for(const phone of [1234,'1'.repeat(51),'123\nInjected: value']){
  let called=false;const r=await handleContact(req({...payload(),phone}),env(),{fetch:async()=>{called=true;return Response.json({id:'receipt'});}});
  assert.equal(r.status,400);assert.equal(called,false);
 }
});
test('Unapproved origins cannot invoke the provider and preflight is limited to approved sites',async()=>{
 let called=false;const r=await handleContact(req(payload(),{headers:{Origin:'https://evil.test'}}),env(),{fetch:()=>{called=true;}});assert.equal(r.status,403);assert.equal(called,false);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
 const pre=await handleContact(new Request('https://forms.test/',{method:'OPTIONS',headers:{Origin:origin}}),env());assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),origin);
});
test('Production refuses unconfigured mail service rather than displaying a false success',async()=>{
 const r=await handleContact(req(),{ALLOWED_ORIGINS:origin});assert.equal(r.status,503);assert.equal((await r.json()).ok,false);
});
test('Provider request pins the recipient and uses the visitor as Reply-To with a stable idempotency key',async()=>{
 const p={...payload(),phone:'+61 400 000 000'};let call;
 const r=await handleContact(req({...p,to:'attacker@example.test'}),env(),{fetch:async(url,options)=>{call={url,...options};return Response.json({id:'provider-receipt'});}});
 assert.equal(r.status,200);assert.equal((await r.json()).mode,'hosted');
 const sent=JSON.parse(call.body);assert.deepEqual(sent.to,['info@bowprojects.com.au']);assert.equal(sent.reply_to,p.email);assert.equal(call.headers['Idempotency-Key'],'bow-enquiry/'+p.requestId);assert(!Object.hasOwn(sent,'html'));
 assert(sent.text.includes('Phone: '+p.phone));
});
test('Provider errors, invalid receipts and network failure never return success',async()=>{
 for(const provider of [async()=>Response.json({error:'bad'},{status:500}),async()=>Response.json({}),async()=>{throw new Error('offline');}]){const r=await handleContact(req(),env(),{fetch:provider});assert.equal(r.status,502);assert.equal((await r.json()).ok,false);}
});
test('Both per-client and site-wide rate limits protect the email endpoint',async()=>{
 for(const binding of ['CONTACT_RATE_LIMITER','GLOBAL_RATE_LIMITER']){const e=env();e[binding]={async limit(){return {success:false};}};const r=await handleContact(req(payload(),{headers:{'CF-Connecting-IP':'192.0.2.1'}}),e);assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');}
});
test('Invalid contact details, honeypots, invalid service and malformed JSON are rejected',async()=>{
 for(const value of [{...payload(),email:'bad'},{...payload(),firstName:'injected\r\nheader'},{...payload(),website:'spam'},{...payload(),service:'invalid'},{...payload(),message:''},{...payload(),requestId:'bad'},'not-json']){const r=await handleContact(req(value),env());assert.equal(r.status,400);}
});
test('Oversize chunked payloads and non-JSON submissions are rejected before provider calls',async()=>{
 assert.equal((await handleContact(req({...payload(),message:'字'.repeat(70000)}),env())).status,400);
 assert.equal((await handleContact(req(payload(),{headers:{'Content-Type':'text/plain'}}),env())).status,415);
});
