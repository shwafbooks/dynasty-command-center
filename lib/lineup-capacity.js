// DCC lineup capacity model for roster-strength evidence.
// Derives positional opportunity from league lineup slots; it does not rank players.
export const LINEUP_CAPACITY_VERSION='lineup-capacity-v1';
const CORE=['QB','RB','WR','TE'];
export function buildLineupCapacity(settings={}){
 const slots={QB:Number(settings.QB??settings.qb??1),RB:Number(settings.RB??settings.rb??2),WR:Number(settings.WR??settings.wr??2),TE:Number(settings.TE??settings.te??1),FLEX:Number(settings.FLEX??settings.flex??2),SUPERFLEX:Number(settings.SUPERFLEX??settings.superflex??1)};
 const guaranteed={QB:slots.QB,RB:slots.RB,WR:slots.WR,TE:slots.TE};
 const flexEligible={RB:slots.FLEX,WR:slots.FLEX,TE:slots.FLEX};
 const superflexEligible={QB:slots.SUPERFLEX,RB:slots.SUPERFLEX,WR:slots.SUPERFLEX,TE:slots.SUPERFLEX};
 const maximumStarts={};for(const p of CORE)maximumStarts[p]=guaranteed[p]+(flexEligible[p]||0)+(superflexEligible[p]||0);
 return{slots,guaranteed,flexEligible,superflexEligible,maximumStarts,totalStartingSlots:Object.values(slots).reduce((a,b)=>a+b,0),interpretation:{guaranteed:'Dedicated starting slots by position.',maximumStarts:'Maximum players at a position that could legally occupy the configured lineup if every flexible slot were assigned there; not a recommended lineup or player-value weight.'},provenance:{formulaVersion:LINEUP_CAPACITY_VERSION,source:'league lineup configuration',playerRankingUsed:false,aiAdjusted:false}};
}
