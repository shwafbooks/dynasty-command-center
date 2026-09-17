// DCC Player Pool Policy
// Builds an auditable fantasy-relevant offensive player pool from Sleeper's NFL player map.
export const PLAYER_POOL_POLICY_VERSION='player-pool-policy-v1';
const POSITIONS=new Set(['QB','RB','WR','TE']);
const ACTIVE_STATUSES=new Set(['Active','Injured Reserve','Physically Unable to Perform','Non-Football Injury','Suspended','Commissioner Exempt']);
const norm=s=>String(s??'').trim();
export function evaluateSleeperPlayer(playerId,player={}){
 const reasons=[];const position=norm(player.position).toUpperCase();const fantasyPositions=(player.fantasy_positions||[]).map(x=>norm(x).toUpperCase());const eligiblePosition=POSITIONS.has(position)?position:fantasyPositions.find(p=>POSITIONS.has(p))||null;
 if(!eligiblePosition)reasons.push('unsupported-position');
 const activeFlag=player.active===true;const status=norm(player.status);const hasTeam=Boolean(norm(player.team));const statusEligible=ACTIVE_STATUSES.has(status);
 if(!activeFlag&&!statusEligible)reasons.push('not-active-or-roster-eligible-status');
 if(!hasTeam)reasons.push('no-nfl-team');
 const included=reasons.length===0;return{playerId:String(playerId),included,position:eligiblePosition,status:status||null,nflTeam:hasTeam?norm(player.team):null,reasons};
}
export function buildSleeperPlayerPool(players={}){const included=[],excluded=[],exclusionCounts={};for(const [id,p] of Object.entries(players||{})){const row=evaluateSleeperPlayer(id,p);if(row.included)included.push(row);else{excluded.push(row);for(const reason of row.reasons)exclusionCounts[reason]=(exclusionCounts[reason]||0)+1;}}included.sort((a,b)=>a.position.localeCompare(b.position)||a.playerId.localeCompare(b.playerId));return{status:'ready',players:included,playerIds:included.map(p=>p.playerId),includedCount:included.length,excludedCount:excluded.length,exclusionCounts,positionCounts:Object.fromEntries([...POSITIONS].map(pos=>[pos,included.filter(p=>p.position===pos).length])),policy:{eligiblePositions:[...POSITIONS],activeStatuses:[...ACTIVE_STATUSES],requiresNflTeam:true},interpretation:{meaning:'Fantasy-relevant QB/RB/WR/TE players currently attached to an NFL team and marked active or in an explicitly roster-eligible temporary status.',caution:'This policy defines the candidate population for availability evidence; it does not claim every included player is fantasy-relevant or replacement quality.'},provenance:{formulaVersion:PLAYER_POOL_POLICY_VERSION,source:'Sleeper /players/nfl fields',aiAdjusted:false,marketValueUsed:false}};}
