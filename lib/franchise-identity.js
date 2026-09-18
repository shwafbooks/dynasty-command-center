// Stable DCC franchise identity layer. Live Sleeper display names may change; manager ownership anchors canonical league identity.
export const FRANCHISE_IDENTITY_VERSION='franchise-identity-v1';
export const DCC_FRANCHISES=[
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
export function canonicalFranchise({manager,liveTeam,rosterId}={}){
 const row=DCC_FRANCHISES.find(x=>[x.manager,...(x.managerAliases||[])].some(a=>norm(a)===norm(manager)));
 return row?{team:row.team,manager:row.manager,liveTeam:liveTeam||null,rosterId:rosterId??null,identityStatus:'canonical'}:{team:liveTeam||null,manager:manager||null,liveTeam:liveTeam||null,rosterId:rosterId??null,identityStatus:'live-unmapped'};
}