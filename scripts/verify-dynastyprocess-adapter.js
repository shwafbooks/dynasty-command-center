import assert from 'node:assert/strict';
import { parseDynastyProcessValues } from '../lib/providers/dynastyprocess.js';
const csv=`"player","pos","team","age","draft_year","ecr_1qb","ecr_2qb","ecr_pos","value_1qb","value_2qb","scrape_date","fp_id"
"Ja'Marr Chase","WR","CIN",26.5,2021,1,6.4,1,10256,9034,"2026-09-11","19788"
"Josh Allen","QB","BUF",30,2018,20,1,1,6000,9990,"2026-09-11","123"
"Defense","DST","BUF",0,0,0,0,0,1,1,"2026-09-11","x"`;
const sf=parseDynastyProcessValues(csv,{superflex:true});assert.equal(sf.source,'dynastyprocess');assert.equal(sf.asOf,'2026-09-11');assert.equal(sf.format,'superflex');assert.equal(sf.players.length,2);assert.equal(sf.players[0].value,9034);assert.equal(sf.metadata.valueField,'value_2qb');
const one=parseDynastyProcessValues(csv,{superflex:false});assert.equal(one.players[0].value,10256);assert.equal(one.metadata.valueField,'value_1qb');
console.log(JSON.stringify({source:sf.source,asOf:sf.asOf,format:sf.format,players:sf.players.length,first:sf.players[0]},null,2));
