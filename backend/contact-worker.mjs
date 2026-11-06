const RECIPIENT='info@bowprojects.com.au';
const services=new Set(['general','construction','structures','infrastructure','modular','energy']);
const MAX_BYTES=65536;
export function validateEnquiry(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid enquiry.');
 const field=(key,limit,required=false)=>{if(typeof raw[key]!=='string'&&(required||raw[key]!=null))throw new Error('Check the '+key+' field.');const value=(raw[key]||'').trim();if((required&&!value)||value.length>limit)throw new Error('Check the '+key+' field.');return value;};
 const result={firstName:field('firstName',80,true),lastName:field('lastName',80,true),email:field('email',200,true),phone:field('phone',50),company:field('company',150),service:field('service',30,true),message:field('message',6000,true),website:field('website',200)};
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email)||/[\r\n]/.test(result.firstName+result.lastName+result.phone+result.company))throw new Error('Check your contact details.');
 if(!services.has(result.service))throw new Error('Choose a valid service.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.requestId||''))throw new Error('Reload the form and try again.');
 return {...result,requestId:raw.requestId.toLowerCase()};
}
async function readBounded(request){
 if(Number(request.headers.get('Content-Length')||0)>MAX_BYTES)throw new Error('The enquiry is too large.');
 const reader=request.body?.getReader();if(!reader)throw new Error('The enquiry is empty.');
 let length=0;const parts=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES){await reader.cancel();throw new Error('The enquiry is too large.');}parts.push(value);}
 const all=new Uint8Array(length);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.byteLength;}return JSON.parse(new TextDecoder().decode(all));
}
export async function handleContact(request,env={},dependencies={}){
 const local=dependencies.local===true;
 const origin=request.headers.get('Origin')||'';
 const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
 const cors=allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 const respond=(status,body,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...cors,...extra}});
 if(!allowed.includes(origin))return respond(403,{ok:false,error:'This website is not allowed to submit enquiries.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
 if(request.method!=='POST')return respond(405,{ok:false,error:'Use the enquiry form to submit your message.'},{Allow:'POST, OPTIONS'});
 if(!((request.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase()==='application/json'))return respond(415,{ok:false,error:'Use the website enquiry form.'});
 let enquiry;try{enquiry=validateEnquiry(await readBounded(request));}catch(error){return respond(400,{ok:false,error:error instanceof SyntaxError?'Invalid enquiry.':error.message});}
 if(enquiry.website)return respond(400,{ok:false,error:'This enquiry could not be submitted.'});
 if(!local&&(!env.RESEND_API_KEY||!env.CONTACT_FROM||!env.CONTACT_RATE_LIMITER||!env.GLOBAL_RATE_LIMITER))return respond(503,{ok:false,error:'The online enquiry service is not available yet. Please email info@bowprojects.com.au.'});
 try{
  if(!local){
   const ip=request.headers.get('CF-Connecting-IP');if(!ip)return respond(403,{ok:false,error:'This enquiry could not be submitted.'});
   const [actor,global]=await Promise.all([env.CONTACT_RATE_LIMITER.limit({key:'contact:'+ip}),env.GLOBAL_RATE_LIMITER.limit({key:'contact:all'})]);
   if(!actor.success||!global.success)return respond(429,{ok:false,error:'Too many enquiries. Please wait a minute before trying again.'},{'Retry-After':'60'});
  }
  const text=`BOW website enquiry\n\nName: ${enquiry.firstName} ${enquiry.lastName}\nEmail: ${enquiry.email}\nPhone: ${enquiry.phone||'Not supplied'}\nCompany: ${enquiry.company||'Not supplied'}\nService: ${enquiry.service}\n\n${enquiry.message}\n\nReference: ${enquiry.requestId}`;
  if(local){await dependencies.deliver({...enquiry,to:RECIPIENT,receivedAt:new Date().toISOString()});return respond(200,{ok:true,mode:'local',reference:enquiry.requestId});}
  const response=await (dependencies.fetch||fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'bow-enquiry/'+enquiry.requestId},body:JSON.stringify({from:env.CONTACT_FROM,to:[RECIPIENT],reply_to:enquiry.email,subject:'BOW website enquiry — '+enquiry.service,text}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)return respond(502,{ok:false,error:'Your enquiry could not be submitted. Please try again or email info@bowprojects.com.au.'});
  const result=await response.json();if(!result.id)throw new Error('No provider receipt');
  return respond(200,{ok:true,mode:'hosted',reference:enquiry.requestId});
 }catch{return respond(502,{ok:false,error:'Your enquiry could not be submitted. Please try again or email info@bowprojects.com.au.'});}
}
export default {fetch(request,env){return handleContact(request,env);}};
