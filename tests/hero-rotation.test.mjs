import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeroRotation} from '../dist/hero-rotation.js';
const scenes=[{id:'VIC',poster:'brighton.webp'},{id:'NSW'},{id:'QLD',poster:'hero-qld-bess.png'}];
test('Hero advances exactly every five seconds, wraps, and skips states without supplied media',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const changes=[];
 const rotation=createHeroRotation({scenes,initialId:'VIC',onAdvance:id=>changes.push(id)});
 rotation.setRunning(true);t.mock.timers.tick(4999);assert.deepEqual(changes,[]);
 t.mock.timers.tick(1);assert.deepEqual(changes,['QLD']);
 t.mock.timers.tick(5000);assert.deepEqual(changes,['QLD','VIC']);rotation.destroy();
});
test('Manual selection restarts the full five-second delay, including selection of a missing-media state',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const changes=[];
 const rotation=createHeroRotation({scenes,initialId:'VIC',onAdvance:id=>changes.push(id)});
 rotation.setRunning(true);t.mock.timers.tick(3500);rotation.select('NSW');
 t.mock.timers.tick(4999);assert.deepEqual(changes,[]);t.mock.timers.tick(1);assert.deepEqual(changes,['VIC']);rotation.destroy();
});
test('Pause and background suspension cancel pending work and resume without a catch-up burst',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const changes=[];
 const rotation=createHeroRotation({scenes,initialId:'VIC',onAdvance:id=>changes.push(id)});
 rotation.setRunning(true);t.mock.timers.tick(1000);rotation.setRunning(false);t.mock.timers.tick(20000);assert.deepEqual(changes,[]);
 rotation.setRunning(true);rotation.setRunning(true);t.mock.timers.tick(4999);assert.deepEqual(changes,[]);
 t.mock.timers.tick(1);assert.deepEqual(changes,['QLD']);rotation.destroy();t.mock.timers.tick(10000);assert.deepEqual(changes,['QLD']);
});
test('A single supplied scene does not start automatic rotation',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const changes=[];
 const rotation=createHeroRotation({scenes:scenes.slice(0,2),initialId:'VIC',onAdvance:id=>changes.push(id)});
 assert.equal(rotation.canRotate,false);rotation.setRunning(true);t.mock.timers.tick(10000);assert.deepEqual(changes,[]);rotation.destroy();
});
