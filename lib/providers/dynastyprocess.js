// Parser for DynastyProcess open-data values-players.csv snapshots.
// Network retrieval is intentionally separate so a fetched artifact can be dated/audited before ingestion.
export const DYNASTYPROCESS_ADAPTER_VERSION='dynastyprocess-adapter-v1';
function csvLine(line){const out=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(cell);cell='';}else cell+=c;}out.push(cell);return out;}
export function parseDynastyProcessValues(csv,{superflex=true}={}){
 const lines=String(csv||'').trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)return{source:'dynastyprocess',asOf:null,format:superflex?'superflex':'1qb',players:[],metadata:{adapterVersion:DYNASTYPROCESS_ADAPTER_VERSION}};
 const headers=csvLine(lines[0]).map(h=>h.replace(/^"|"$/g,''));const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));const valueKey=superflex?'value_2qb':'value_1qb',players=[];let asOf=null;
 for(const line of lines.slice(1)){const cells=csvLine(line);const position=String(cells[idx.pos]||'').toUpperCase();if(!['QB','RB','WR','TE'].includes(position))continue;const value=Number(cells[idx[valueKey]]);if(!Number.isFinite(value))continue;asOf=asOf||cells[idx.scrape_date]||null;players.push({name:cells[idx.player],position,nflTeam:cells[idx.team]||null,value,providerPlayerId:cells[idx.fp_id]||null});}
 return{source:'dynastyprocess',asOf,format:superflex?'superflex':'1qb',players,metadata:{adapterVersion:DYNASTYPROCESS_ADAPTER_VERSION,valueField:valueKey,sourceArtifact:'DynastyProcess open-data values-players.csv',rawValuesPreserved:true}};
}
