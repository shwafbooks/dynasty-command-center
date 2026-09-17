import assert from'node:assert/strict';import{buildLineupCapacity}from'../lib/lineup-capacity.js';
const formats=[
 {name:'DCC 10-team SF',settings:{QB:1,RB:2,WR:2,TE:1,FLEX:2,SUPERFLEX:1},expected:{slots:9,qb:2,rb:5}},
 {name:'12-team 1QB shallow',settings:{QB:1,RB:2,WR:3,TE:1,FLEX:1,SUPERFLEX:0},expected:{slots:8,qb:1,rb:3}},
 {name:'12-team start-11 SF',settings:{QB:1,RB:2,WR:3,TE:1,FLEX:3,SUPERFLEX:1},expected:{slots:11,qb:2,rb:6}},
 {name:'14-team 1QB',settings:{qb:1,rb:2,wr:2,te:1,flex:2},expected:{slots:8,qb:1,rb:4}},
 {name:'Sleeper-style aliases',settings:{QB:1,RB:2,WR:2,TE:1,WRT:2,OP:1},expected:{slots:9,qb:2,rb:5}}
];
for(const f of formats){const c=buildLineupCapacity(f.settings);assert.equal(c.totalStartingSlots,f.expected.slots,f.name);assert.equal(c.maximumStarts.QB,f.expected.qb,f.name);assert.equal(c.maximumStarts.RB,f.expected.rb,f.name);assert.equal(c.provenance.hardCodedLeagueFormat,false);}
const empty=buildLineupCapacity({});assert.equal(empty.totalStartingSlots,0);assert.equal(empty.maximumStarts.QB,0);
console.log(JSON.stringify(formats.map(f=>({name:f.name,capacity:buildLineupCapacity(f.settings)})),null,2));
