import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {news,projects} from '../content.mjs';

test('news posts have unique ids, ISO dates and are newest first', () => {
 assert.equal(new Set(news.map(n => n.id)).size, news.length);
 for (const n of news) assert.match(n.date, /^\d{4}-\d{2}-\d{2}$/, n.id);
 const dates = news.map(n => n.date);
 assert.deepEqual(dates, [...dates].sort().reverse());
});

test('news posts have copy, alt text and a source post', () => {
 for (const n of news) {
  for (const key of ['title', 'navLabel', 'category', 'standfirst']) assert.ok(n[key]?.trim(), `${n.id} ${key}`);
  assert.ok(n.body.length > 0, `${n.id} body`);
  assert.match(n.instagram, /^https:\/\/www\.instagram\.com\/p\/[\w-]+\/$/, `${n.id} instagram`);
  for (const img of [n.cover, ...n.gallery]) assert.ok(img.alt?.trim(), `${n.id} ${img.image} alt`);
 }
});

test('news images exist in both sizes and linked projects exist', () => {
 for (const n of news) {
  for (const img of [n.cover, ...n.gallery]) {
   assert.ok(existsSync(`dist/assets/${img.image}.webp`), img.image);
   assert.ok(existsSync(`dist/assets/${img.image}-600.webp`), `${img.image}-600`);
  }
  if (n.project) assert.ok(projects.some(p => p.id === n.project), `${n.id} project ${n.project}`);
 }
});
