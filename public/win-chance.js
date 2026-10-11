const alias=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[t]||t);
const cdf=x=>{const z=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*z),erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z);return (1+(x<0?-erf:erf))/2;};
export function estimateWinChance(a,b,players,context){
 function forecast(row){if(!Number.isFinite(row.points)||!row.starters?.length)return null;let mean=row.points,variance=0,unfinished=false;for(const raw of row.starters){const id=String(raw);if(id==='0')continue;const p=players.get(id),game=context.games?.[alias(p?.nflTeam)],injury=context.injuries?.[id];if(!game||game.state==='unknown')return null;if(['final','bye'].includes(game.state)||['Out','IR','PUP','Suspended'].includes(injury))continue;if(!['playing','upcoming'].includes(game.state))return null;const projected=context.projections?.[id],fraction=game.state==='upcoming'?1:game.remainingFraction;if(!Number.isFinite(projected)||!Number.isFinite(fraction))return null;unfinished=true;const cv={QB:.45,RB:.65,WR:.75,TE:.8,K:.55,DEF:.9}[p?.position]||.75;mean+=projected*fraction;variance+=Math.pow(Math.max(3,Math.abs(projected)*cv),2)*fraction;}
 return {mean,variance,unfinished};}
 const left=forecast(a),right=forecast(b);if(!left||!right)return null;
 if(!left.unfinished&&!right.unfinished){const tie=Math.abs(a.points-b.points)<.005;return {left:tie?50:a.points>b.points?100:0,right:tie?50:b.points>a.points?100:0,final:true,tie};}
 const variance=left.variance+right.variance;if(!variance)return null;const probability=cdf((left.mean-right.mean)/Math.sqrt(variance));const percent=Math.round(Math.min(99.9,Math.max(.1,probability*100))*10)/10;
 return {left:percent,right:Math.round((100-percent)*10)/10,final:false,tie:false};
}
