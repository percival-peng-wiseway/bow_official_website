export function readFilters(search,{services=[],sectors=[]}={}){
 const params=new URLSearchParams(search);let status=params.get('status')||'all';if(status==='ongoing')status='current';
 return {status:['all','current','completed','experience'].includes(status)?status:'all',service:services.includes(params.get('service'))?params.get('service'):'all',sector:sectors.includes(params.get('sector'))?params.get('sector'):'all'};
}
export function matchesProject(project,filters){return (filters.status==='all'||project.status===filters.status)&&(filters.service==='all'||project.services.includes(filters.service))&&(filters.sector==='all'||project.sector===filters.sector);}
export function filterQuery(filters){const params=new URLSearchParams();for(const [key,value]of Object.entries(filters))if(value!=='all')params.set(key,value);return params.toString();}
