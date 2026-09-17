import { buildMarketRosterValues } from '../lib/market-roster-value.js';

const sampleTeams=[
  {rosterId:1,team:'A',manager:'A',starters:[{id:'1',name:'QB A',position:'QB'},{id:'2',name:'WR A',position:'WR'}],bench:[]},
  {rosterId:2,team:'B',manager:'B',starters:[{id:'3',name:'QB B',position:'QB'},{id:'4',name:'WR B',position:'WR'}],bench:[]}
];
const base={source:{source:'fixture',asOf:'2026-09-18'},coverage:{matchedPercent:100},values:{'1':{value:9000},'2':{value:5000},'3':{value:7000},'4':{value:6000}}};
const withheld=buildMarketRosterValues({teams:sampleTeams,marketAudit:{...base,publicationGate:{passes:false}}});
if(withheld.status!=='withheld'||withheld.teams.length)throw new Error('Failed: model published behind a failed gate');
const published=buildMarketRosterValues({teams:sampleTeams,marketAudit:{...base,publicationGate:{passes:true}}});
if(published.status!=='published')throw new Error('Failed: passing gate did not publish');
if(published.teams.find(t=>t.rosterId===1)?.comparison?.rank!==1)throw new Error('Failed: deterministic total market rank');
if(published.teams.find(t=>t.rosterId===2)?.positions?.WR?.comparison?.rank!==1)throw new Error('Failed: deterministic positional rank');
console.log(JSON.stringify({status:'verified',formulaVersion:published.formulaVersion,failedGateStatus:withheld.status,publishedStatus:published.status,team1Total:published.teams.find(t=>t.rosterId===1).totalMarketValue,team2WrRank:published.teams.find(t=>t.rosterId===2).positions.WR.comparison.rank},null,2));
