import fs from 'node:fs';import assert from 'node:assert/strict';
import {partnerOffers,rankPartners} from '../public/trade-partners.js';import {roster,pid} from '../public/trade-engine.js';
const {rosters:{teams},markets,context}=JSON.parse(fs.readFileSync(process.argv[2]));
for(const own of teams){const start=Date.now(),rows=teams.filter(t=>t.rosterId!==own.rosterId).flatMap(other=>partnerOffers({own,other,teams,markets,context})),offers=rankPartners(rows);assert(offers.length<=3);assert.equal(new Set(offers.map(o=>o.other.rosterId)).size,offers.length);
for(const o of offers){assert(roster(own).some(p=>pid(p)===pid(o.give)));assert(roster(o.other).some(p=>pid(p)===pid(o.get)));assert(o.quality.eligible);assert(o.quality.sourceCount>=2);assert(o.dynasty.sources.filter(s=>s.complete).every(s=>s.relative<=.1+1e-9));assert(o.rosterFit.sides.every(s=>s.priority>=2));}
console.log(JSON.stringify({team:own.manager,offers:offers.length,ms:Date.now()-start,deals:offers.map(o=>({send:o.give.name,receive:o.get.name,partner:o.other.manager,reasons:o.rosterFit.sides.map(s=>s.label)}))}));}
