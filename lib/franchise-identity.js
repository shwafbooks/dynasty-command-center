// DCC franchise identity is league-scoped. Live Sleeper names remain the visible identity.
export const FRANCHISE_IDENTITY_VERSION='franchise-identity-v2';
const DCC_LEAGUE_ID='1389344338340761600';
const DCC_FRANCHISES=[
 {team:'Drake Maye',manager:'shwaf'},
 {team:'Sonny Weaver Jr',manager:'BillClintonArkansas'},
 {team:'RBuniversity',manager:'stuffy229'},
 {team:'Simasko',manager:'Simasko'},
 {team:'1.01',manager:'1riggy1'},
 {team:"I'm gonna milk you",manager:'jackig'},
 {team:'Comback SZN',manager:'karasouel'},
 {team:'Giardiniera',manager:'Moosinator'},
 {team:'James1836',manager:'James1836'},
 {team:'The Rejects',manager:'TUTO',managerAliases:['TUT0']}
];
const norm=v=>String(v||'').trim().toLowerCase();
export function canonicalFranchise({leagueId,manager,liveTeam,rosterId}={}){
 if(String(leagueId||'')!==DCC_LEAGUE_ID)return{team:liveTeam||null,manager:manager||null,canonicalTeam:null,canonicalManager:null,liveTeam:liveTeam||null,rosterId:rosterId??null,identityStatus:'live-unmapped'};
 const row=DCC_FRANCHISES.find(x=>[x.manager,...(x.managerAliases||[])].some(a=>norm(a)===norm(manager)));
 return row?{team:liveTeam||row.team,manager:manager||row.manager,canonicalTeam:row.team,canonicalManager:row.manager,liveTeam:liveTeam||null,rosterId:rosterId??null,identityStatus:'historical-mapped'}:{team:liveTeam||null,manager:manager||null,canonicalTeam:null,canonicalManager:null,liveTeam:liveTeam||null,rosterId:rosterId??null,identityStatus:'live-unmapped'};
}
