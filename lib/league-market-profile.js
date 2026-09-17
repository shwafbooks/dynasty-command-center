// DCC League Market Profile
// Converts publication-eligible player consensus into descriptive roster evidence.
// This is NOT a power ranking, trade verdict, or future-performance projection.
export const LEAGUE_MARKET_PROFILE_VERSION='league-market-profile-v1';
const POSITIONS=['QB','RB','WR','TE'];
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
function rosterPlayers(team={}){const seen=new Map();for(const p of [...(team.starters||[]),...(team.bench||[])]){const id=String(p?.id||p?.playerId||'');if(!id||seen.has(id))continue;seen.set(id,{playerId:id,name:p?.name||p?.full_name||id,position:String(p?.position||'').toUpperCase()});}return [...seen.values()].filter(p=>POSITIONS.includes(p.position));}
function summarize(rows=[]){const valued=rows.filter(r=>Number.isFinite(Number(r.consensusPercentile)));const values=valued.map(r=>Number(r.consensusPercentile)).sort((a,b)=>b-a);return{rosterPlayers:rows.length,consensusPlayers:valued.length,coverage:rows.length?round(valued.length/rows.length):0,meanConsensusPercentile:values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null,top3MeanConsensusPercentile:values.length?round(values.slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,values.length)):null,highAgreementPlayers:valued.filter(r=>Number(r.agreement)>=0.8).length};}
export function buildLeagueMarketProfile({teams=[],marketIntelligence}){
 if(!marketIntelligence?.publicationEligible||!marketIntelligence?.consensus?.players)return{status:'withheld',publicationEligible:false,reason:'market-intelligence-not-publication-eligible',teams:[],provenance:{formulaVersion:LEAGUE_MARKET_PROFILE_VERSION,rankingPublished:false}};
 const consensus=marketIntelligence.consensus.players;
 const profiles=teams.map(team=>{const players=rosterPlayers(team).map(p=>({...p,consensusPercentile:consensus[p.playerId]?.consensusPercentile??null,agreement:consensus[p.playerId]?.agreement??null,sourceCount:consensus[p.playerId]?.sourceCount??0}));const byPosition={};for(const position of POSITIONS)byPosition[position]=summarize(players.filter(p=>p.position===position));return{rosterId:team.rosterId??team.roster_id??null,team:team.team||team.name||null,manager:team.manager||null,overall:summarize(players),positions:byPosition,players};});
 return{status:'ready',publicationEligible:true,teams:profiles,interpretation:{meaning:'Descriptive external-market consensus evidence for players currently on each roster.',notIncluded:['DCC power ranking','manager grade','trade verdict','future projection','verified production']},provenance:{formulaVersion:LEAGUE_MARKET_PROFILE_VERSION,input:'publication-eligible multi-source player consensus',rawProviderValuesAveraged:false,aiAdjusted:false,rankingPublished:false}};
}
