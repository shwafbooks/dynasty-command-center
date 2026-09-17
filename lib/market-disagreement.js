// DCC Market Disagreement Intelligence.
// Describes differences between independent market sources without deciding which source is correct.
export const MARKET_DISAGREEMENT_VERSION='market-disagreement-v1';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};

function labelFromSpread(spread){if(spread>=0.35)return 'high';if(spread>=0.18)return 'moderate';return 'low';}

export function buildPlayerMarketDisagreement(consensusPlayer){
  const evidence=[...(consensusPlayer?.evidence||[])].filter(e=>Number.isFinite(Number(e.percentile)));
  if(evidence.length<2)return null;
  const ordered=[...evidence].sort((a,b)=>Number(b.percentile)-Number(a.percentile)||String(a.source).localeCompare(String(b.source)));
  const highest=ordered[0],lowest=ordered[ordered.length-1],spread=Number(highest.percentile)-Number(lowest.percentile);
  return{
    playerId:String(consensusPlayer.playerId),
    sourceCount:evidence.length,
    consensusPercentile:consensusPlayer.consensusPercentile,
    agreement:consensusPlayer.agreement,
    percentileSpread:round(spread),
    disagreementLevel:labelFromSpread(spread),
    highestSignal:{source:highest.source,percentile:round(highest.percentile),rank:highest.rank,count:highest.count,asOf:highest.asOf||null},
    lowestSignal:{source:lowest.source,percentile:round(lowest.percentile),rank:lowest.rank,count:lowest.count,asOf:lowest.asOf||null},
    evidence:ordered.map(e=>({source:e.source,percentile:round(e.percentile),rank:e.rank,count:e.count,asOf:e.asOf||null,format:e.format||null})),
    interpretation:{
      meaning:'Spread measures how differently independent sources rank this player inside their own player pools.',
      caution:'A disagreement is not evidence that the highest or lowest source is correct.'
    }
  };
}

export function buildMarketDisagreementReport(consensus){
  const players={};
  for(const [playerId,row] of Object.entries(consensus?.players||{})){
    const result=buildPlayerMarketDisagreement(row);
    if(result)players[playerId]=result;
  }
  const distribution={low:0,moderate:0,high:0};
  Object.values(players).forEach(p=>{distribution[p.disagreementLevel]=(distribution[p.disagreementLevel]||0)+1;});
  return{
    status:Object.keys(players).length?'ready':'insufficient-data',
    formulaVersion:MARKET_DISAGREEMENT_VERSION,
    playerCount:Object.keys(players).length,
    distribution,
    players,
    provenance:{
      input:'market-consensus-v1 normalized source percentiles',
      formula:'percentile spread = highest source percentile - lowest source percentile',
      thresholds:{low:'< 0.18',moderate:'0.18 to < 0.35',high:'>= 0.35'},
      sourceWinnerDeclared:false,
      aiAdjusted:false,
      manualOverride:false
    }
  };
}
