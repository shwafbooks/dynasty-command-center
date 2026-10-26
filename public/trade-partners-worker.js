import {partnerOffers,rankPartners} from './trade-partners.js';
self.onmessage=({data})=>{try{const rows=[];for(const other of data.teams.filter(t=>String(t.rosterId)!==String(data.own.rosterId)))rows.push(...partnerOffers({...data,other,protectedIds:new Set(data.protectedIds)}));self.postMessage({offers:rankPartners(rows)});}catch{self.postMessage({error:true});}};
