// DCC lineup capacity model for roster-strength evidence.
// Derives positional opportunity from league lineup slots; it does not rank players.
export const LINEUP_CAPACITY_VERSION='lineup-capacity-v2';
export const OFFENSIVE_POSITIONS=['QB','RB','WR','TE'];
const aliases={QB:['QB','qb'],RB:['RB','rb'],WR:['WR','wr'],TE:['TE','te'],FLEX:['FLEX','flex','WRT','wrt'],SUPERFLEX:['SUPERFLEX','superflex','SUPER_FLEX','super_flex','OP','op']};
const count=(settings,names)=>{for(const name of names)if(settings?.[name]!=null){const n=Number(settings[name]);return Number.isFinite(n)&&n>=0?n:0;}return 0;};
export function normalizeLineupSettings(settings={}){const slots={};for(const [slot,names] of Object.entries(aliases))slots[slot]=count(settings,names);return slots;}
export function buildLineupCapacity(settings={}){
 const slots=normalizeLineupSettings(settings);
 const guaranteed={QB:slots.QB,RB:slots.RB,WR:slots.WR,TE:slots.TE};
 const flexEligible={RB:slots.FLEX,WR:slots.FLEX,TE:slots.FLEX};
 const superflexEligible={QB:slots.SUPERFLEX,RB:slots.SUPERFLEX,WR:slots.SUPERFLEX,TE:slots.SUPERFLEX};
 const maximumStarts={};for(const p of OFFENSIVE_POSITIONS)maximumStarts[p]=guaranteed[p]+(flexEligible[p]||0)+(superflexEligible[p]||0);
 return{slots,guaranteed,flexEligible,superflexEligible,maximumStarts,totalStartingSlots:Object.values(slots).reduce((a,b)=>a+b,0),interpretation:{guaranteed:'Dedicated starting slots by position.',maximumStarts:'Maximum players at a position that could legally occupy the configured lineup if every flexible slot were assigned there; not a recommended lineup or player-value weight.',portability:'All counts are derived from the supplied league format; no DCC league roster size or starting-slot count is hard-coded.'},provenance:{formulaVersion:LINEUP_CAPACITY_VERSION,source:'league lineup configuration',playerRankingUsed:false,aiAdjusted:false,hardCodedLeagueFormat:false}};
}
