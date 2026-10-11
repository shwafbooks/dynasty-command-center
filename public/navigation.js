(()=>{
const views=[...document.querySelectorAll('[data-view]')],links=[...document.querySelectorAll('.primary-nav a')];
function route(){const hash=location.hash.slice(1),target=document.getElementById(hash),view=views.find(v=>v.dataset.view===hash)||target?.closest('[data-view]')||views[0];views.forEach(v=>v.hidden=v!==view);links.forEach(a=>{const active=a.hash===`#${view.dataset.view}`;a.classList.toggle('is-active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.title=`${links.find(a=>a.hash===`#${view.dataset.view}`)?.textContent||'Home'} · Dynasty Command Center`;window.scrollTo({top:0,behavior:'instant'});}
addEventListener('hashchange',route);document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(link&&link.hash===location.hash)route();});route();
})();
