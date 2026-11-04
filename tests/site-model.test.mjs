import test from 'node:test';
import assert from 'node:assert/strict';
import {readFilters,matchesProject,filterQuery} from '../dist/site-model.js';
import {projects,people,services,heroScenes} from '../content.mjs';
test('Portfolio correctly separates active BOW work, completed contracts and prior team work',()=>{
 assert.equal(projects.filter(p=>p.statusGroup==='current').length,7);assert.equal(projects.filter(p=>p.statusGroup==='completed').length,2);
 for(const id of ['box-hill-childcare','international-brighton'])assert.equal(projects.find(p=>p.id===id).statusGroup,'completed');
 for(const p of projects.filter(p=>p.statusGroup==='experience')){assert.match(p.status,/prior to BOW/);assert.match(p.attribution,/not BOW contracts/);}
 assert(!projects.some(p=>p.statusGroup==='concept'));
});
test('Shared filter URLs, legacy ongoing links, invalid queries and reset remain consistent',()=>{
 const options={services:services.map(s=>s.id),sectors:[...new Set(projects.map(p=>p.sector))]};
 assert.deepEqual(readFilters('?status=ongoing&service=energy',options),{status:'current',service:'energy',sector:'all'});
 assert.deepEqual(readFilters('?status=wrong&service=wrong&sector=wrong',options),{status:'all',service:'all',sector:'all'});
 const f={status:'completed',service:'construction',sector:'Residential'};assert.deepEqual(readFilters('?'+filterQuery(f),options),f);
 assert.equal(filterQuery({status:'all',service:'all',sector:'all'}),'');
});
test('Status, service and sector filters compose without leaking unmatched projects',()=>{
 const model=projects.map(p=>({...p,status:p.statusGroup}));
 assert.deepEqual(model.filter(p=>matchesProject(p,{status:'completed',service:'construction',sector:'Education'})).map(p=>p.id),['box-hill-childcare']);
 assert.equal(model.filter(p=>matchesProject(p,{status:'current',service:'energy',sector:'Energy'})).length,2);
 assert.equal(model.filter(p=>matchesProject(p,{status:'completed',service:'energy',sector:'Energy'})).length,0);
});
test('Partners and missing state media are not represented as employees or unrelated footage',()=>{
 assert.equal(people.find(p=>p.id==='bryce-kemp').group,'partners');
 assert.equal(people.find(p=>p.id==='hassan-kassem').role,'Director - Structure');assert.equal(people.find(p=>p.id==='nidhi-pandey').role,'Estimating Director');
 for(const s of heroScenes.filter(s=>['NSW','SA','WA','TAS'].includes(s.id))){assert.equal(s.poster,null);assert.equal(s.video,'');}
});
