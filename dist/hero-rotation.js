export const HERO_ROTATION_MS=5000;

// States without supplied media remain manually selectable, but never create empty automatic slides.
export function createHeroRotation({scenes,initialId,onAdvance,setTimer=setTimeout,clearTimer=clearTimeout}){
 const available=scenes.filter(scene=>scene.poster||scene.video||scene.mobileVideo);
 let selected=initialId,running=false,timer=null;
 function clear(){if(timer!==null)clearTimer(timer);timer=null;}
 function schedule(){
  clear();if(!running||available.length<2)return;
  timer=setTimer(()=>{
   timer=null;
   const index=available.findIndex(scene=>scene.id===selected);
   selected=available[(index+1)%available.length].id;
   onAdvance(selected);schedule();
  },HERO_ROTATION_MS);
 }
 return {
  get canRotate(){return available.length>1;},
  select(id){selected=id;schedule();},
  setRunning(value){if(running===Boolean(value))return;running=Boolean(value);schedule();},
  destroy(){running=false;clear();}
 };
}
