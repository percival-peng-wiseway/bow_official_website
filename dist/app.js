import {readFilters,matchesProject,filterQuery} from './site-model.js';
import {createHeroRotation} from './hero-rotation.js';
const config=JSON.parse(document.getElementById('site-config').textContent);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const menu=document.getElementById('main-navigation'),menuButton=document.querySelector('.menu-toggle'),menuDialog=document.getElementById('menu-dialog');
function setMenu(open,{restore=false}={}){
 if(open){if(!menuDialog.open)menuDialog.showModal();document.documentElement.classList.add('dialog-open');requestAnimationFrame(()=>{if(menuDialog.open)menuDialog.classList.add('is-visible');});menuDialog.querySelector('[data-close]').focus();}
 else{if(menuDialog.open)menuDialog.close();menuDialog.classList.remove('is-visible');document.documentElement.classList.remove('dialog-open');}
 menuButton.setAttribute('aria-expanded',String(open));if(restore)menuButton.focus();
}
menuButton.addEventListener('click',()=>setMenu(true));
menuDialog.querySelector('[data-close]').addEventListener('click',()=>setMenu(false,{restore:true}));
menuDialog.addEventListener('cancel',event=>{event.preventDefault();setMenu(false,{restore:true});});
menuDialog.addEventListener('close',()=>{menuButton.setAttribute('aria-expanded','false');menuDialog.classList.remove('is-visible');document.documentElement.classList.remove('dialog-open');});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));

// Only the selected state's clip is loaded. Missing footage never reuses a different state's photograph.
const video=document.getElementById('hero-video'),poster=document.getElementById('hero-poster');
if(video){
 const buttons=[...document.querySelectorAll('[data-scene]')],playback=document.getElementById('hero-playback'),place=document.getElementById('hero-location');
 let selected=config.heroScenes[0],generation=0,userPaused=false,heroVisible=true;
 const canAnimate=()=>!reduced.matches&&!navigator.connection?.saveData;
 const rotation=createHeroRotation({scenes:config.heroScenes,initialId:selected.id,onAdvance:id=>setScene(id)});
 const icons={pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" fill="currentColor"/></svg>'};
 function syncPlayback(){
  const active=!userPaused&&!document.hidden&&!reduced.matches&&heroVisible&&!menuDialog.open;
  rotation.setRunning(active);
  place.setAttribute('aria-live',active&&rotation.canRotate?'off':'polite');
  playback.hidden=reduced.matches||(!rotation.canRotate&&!selected.video&&!selected.mobileVideo);
  const label=userPaused?'Play slideshow':'Pause slideshow';
  playback.innerHTML=userPaused?icons.play:icons.pause;playback.setAttribute('aria-label',label);playback.title=label;
  if(!active||!canAnimate())video.pause();
  else if(video.getAttribute('src')&&video.paused)video.play().catch(()=>{});
 }
 function stopVideo(){generation++;video.pause();video.hidden=true;video.removeAttribute('src');video.load();}
 async function setScene(id){
  const scene=config.heroScenes.find(s=>s.id===id);if(!scene)return;selected=scene;stopVideo();
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===id)));
  buttons[0].parentElement.style.setProperty('--active-index',buttons.findIndex(b=>b.dataset.scene===id));
  place.textContent=scene.place===scene.label?scene.label:scene.place+', '+scene.label;
  poster.hidden=!scene.poster;poster.removeAttribute('srcset');
  if(scene.poster){poster.src=scene.poster;poster.alt=scene.id==='VIC'?'The International, Brighton, Victoria':scene.id==='QLD'?'Mt Miller BESS site plan, Central Queensland':scene.label;}
  else{poster.removeAttribute('src');poster.alt='';}
  const source=matchMedia('(max-width:760px)').matches&&scene.mobileVideo?scene.mobileVideo:scene.video;
  syncPlayback();
  if(!source||!canAnimate()||userPaused||document.hidden||!heroVisible||menuDialog.open)return;
  const token=generation;video.src=source;video.loop=true;video.preload='metadata';
  try{await video.play();if(token!==generation)return;video.hidden=false;if(userPaused||document.hidden||!heroVisible||menuDialog.open)video.pause();}catch{if(token===generation)video.hidden=true;}
 }
 function selectScene(id){rotation.select(id);setScene(id);}
 buttons.forEach((b,i)=>{b.addEventListener('click',()=>selectScene(b.dataset.scene));b.addEventListener('keydown',event=>{const delta={ArrowLeft:-1,ArrowRight:1}[event.key];if(delta){event.preventDefault();const next=buttons[(i+delta+buttons.length)%buttons.length];next.focus();selectScene(next.dataset.scene);}});});
 playback.addEventListener('click',()=>{userPaused=!userPaused;syncPlayback();if(!userPaused&&!video.getAttribute('src')&&(selected.video||selected.mobileVideo))setScene(selected.id);});
 video.addEventListener('error',()=>{video.hidden=true;});
 poster.addEventListener('load',()=>{if(canAnimate())poster.animate([{opacity:.5},{opacity:1}],{duration:400,easing:'ease-out'});});
 document.addEventListener('visibilitychange',syncPlayback);
 menuButton.addEventListener('click',syncPlayback);menuDialog.addEventListener('close',syncPlayback);
 new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;syncPlayback();},{threshold:0}).observe(video.closest('.home-hero'));
 reduced.addEventListener('change',()=>setScene(selected.id));
 setScene(selected.id);
}

const projectList=document.getElementById('project-list');
if(projectList){
 const cards=[...projectList.querySelectorAll('.project-card')];
 const service=document.getElementById('service-filter'),sector=document.getElementById('sector-filter'),tabs=[...document.querySelectorAll('[data-status-filter]')];
 const choices={services:[...service.options].map(o=>o.value),sectors:[...sector.options].map(o=>o.value)};
 let filters=readFilters(location.search,choices);
 function draw(push=false){
  service.value=filters.service;sector.value=filters.sector;tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.statusFilter===filters.status)));
  let count=0;for(const card of cards){const match=matchesProject({status:card.dataset.status,services:card.dataset.services.split(' '),sector:card.dataset.sector},filters);card.hidden=!match;if(match)count++;}
  document.getElementById('project-count').textContent=`${count} ${count===1?'project':'projects'}`;
  document.getElementById('project-empty').hidden=count!==0;document.getElementById('experience-notice').hidden=filters.status!=='experience';
  document.getElementById('reset-filters').hidden=Object.values(filters).every(v=>v==='all');
  if(push){const query=filterQuery(filters);history.pushState({},'',location.pathname+(query?'?'+query:'')+location.hash);}
 }
 tabs.forEach(b=>b.addEventListener('click',()=>{filters.status=b.dataset.statusFilter;draw(true);}));
 service.addEventListener('change',()=>{filters.service=service.value;draw(true);});sector.addEventListener('change',()=>{filters.sector=sector.value;draw(true);});
 document.querySelectorAll('#reset-filters,[data-reset]').forEach(b=>b.addEventListener('click',()=>{filters={status:'all',service:'all',sector:'all'};draw(true);}));
 window.addEventListener('popstate',()=>{filters=readFilters(location.search,choices);draw();});draw();
}

const form=document.getElementById('enquiry-form');
if(form){
 const params=new URLSearchParams(location.search),service=form.elements.service;
 if([...service.options].some(o=>o.value===params.get('service')))service.value=params.get('service');
 if(params.get('project'))form.elements.message.value=`Project: ${params.get('project').slice(0,200)}\n\n`;
 const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 const endpoint=config.contactEndpoint||(local?config.basePath+'/api/contact/':'');
 const button=form.querySelector('button[type=submit]'),result=document.getElementById('enquiry-result'),mode=document.getElementById('form-mode');
 let requestId=crypto.randomUUID(),startedAt=Date.now();
 if(local&&!config.contactEndpoint){mode.textContent='Local review: submissions are saved on this computer only. No email is sent.';button.firstChild.textContent='Save test enquiry ';}
 if(!endpoint){mode.textContent='The online enquiry form is not available yet. Please email info@bowprojects.com.au.';button.disabled=true;}
 function show(message,error=false){result.hidden=false;result.classList.toggle('error',error);result.textContent=message;result.focus({preventScroll:true});result.scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});}
 form.addEventListener('input',()=>{requestId=crypto.randomUUID();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity()||!endpoint)return;
  button.disabled=true;button.setAttribute('aria-busy','true');result.hidden=true;
  const values=Object.fromEntries(new FormData(form));
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,requestId,startedAt}),signal:AbortSignal.timeout(20000)});
   let data;try{data=await response.json();}catch{throw new Error('The enquiry service is unavailable. Please try again or email info@bowprojects.com.au.');}
   if(!response.ok||!data.ok)throw new Error(data.error||'Your enquiry could not be submitted. Please try again.');
   show(data.mode==='local'?'Saved to the local review outbox. This was a test submission; no email was sent.':'Thank you. Your enquiry has been submitted to BOW.');
   form.reset();requestId=crypto.randomUUID();startedAt=Date.now();
  }catch(error){show(error.name==='TimeoutError'?'The request timed out. Your details are still here; please retry or email info@bowprojects.com.au.':error.message,true);}
  finally{button.disabled=!endpoint;button.removeAttribute('aria-busy');}
 });
}
