import assert from 'node:assert/strict';
import {buildTransactionFeed} from '../lib/transaction-feed.js';

const users=[{user_id:'a',display_name:'Alpha',metadata:{team_name:'Team Alpha'}},{user_id:'b',display_name:'Beta',metadata:{team_name:'Team Beta'}}];
const rosters=[{roster_id:1,owner_id:'a'},{roster_id:2,owner_id:'b'}];
const players={'101':{full_name:'Quarterback One'},'202':{full_name:'Receiver Two'},'303':{full_name:'Running Back Three'}};
const trade={transaction_id:'trade-1',type:'trade',status:'complete',status_updated:200,leg:2,roster_ids:[1,2],adds:{'101':2,'202':1},drops:{'101':1,'202':2},draft_picks:[{season:'2028',round:2,roster_id:1,previous_owner_id:1,owner_id:2}]};
const waiver={transaction_id:'waiver-1',type:'waiver',status:'complete',status_updated:300,leg:3,roster_ids:[1],adds:{'303':1},drops:{'202':1},settings:{waiver_bid:12}};
const feed=buildTransactionFeed({transactions:[trade,waiver,trade,{...trade,transaction_id:'pending',status:'pending'}],rosters,users,players});
assert.equal(feed.total,2);
assert.equal(feed.transactions[0].id,'waiver-1');
assert.equal(feed.transactions[0].waiverBid,12);
assert.equal(feed.latestTrade.teams[0].team,'Team Alpha');
assert.deepEqual(feed.latestTrade.teams[0].receives.map(player=>player.name),['Receiver Two']);
assert.deepEqual(feed.latestTrade.teams[0].sends.map(player=>player.name),['Quarterback One']);
assert.equal(feed.latestTrade.teams[1].picksIn[0],'2028 Round 2 (Team Alpha original)');
assert.equal(feed.latestTrade.teams[0].picksOut.length,1);
console.log('Transaction ownership, pick direction, deduplication, and completed status verified');
