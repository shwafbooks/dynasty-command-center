// Share in-flight GETs across tabs; failed or timed-out responses never enter cache.
(()=>{
 const cache=new Map(),pending=new Map(),limit=64;
 const keyFor=url=>new URL(url,location.origin).href;
 async function json(url,{maxAge=15000,force=false,timeoutMs=45000}={}){
  const key=keyFor(url),hit=cache.get(key);
  if(!force&&hit&&Date.now()-hit.at<maxAge)return hit.data;
  if(pending.has(key))return pending.get(key);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const request=Promise.resolve().then(async()=>{
   try{const response=await fetch(key,{cache:'no-store',signal:controller.signal});if(!response.ok){const error=Error(`Data unavailable (${response.status})`);error.status=response.status;throw error;}const data=await response.json();cache.delete(key);cache.set(key,{at:Date.now(),data});while(cache.size>limit)cache.delete(cache.keys().next().value);return data;}
   catch(error){if(controller.signal.aborted)throw Error('The data source took too long. Please retry.');throw error;}
   finally{clearTimeout(timer);pending.delete(key);}
  });pending.set(key,request);return request;
 }
 window.DCCData={json,clear(url){if(url)cache.delete(keyFor(url));else cache.clear();}};
})();
