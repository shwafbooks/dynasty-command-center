(()=>{
 const views=[...document.querySelectorAll('[data-view]')],links=[...document.querySelectorAll('.primary-nav a')];
 function route(focus=false){
  const hash=location.hash.slice(1),target=document.getElementById(hash),view=views.find(v=>v.dataset.view===hash)||target?.closest('[data-view]')||views[0];
  if(!target&&!views.some(v=>v.dataset.view===hash)&&hash)history.replaceState(null,'',location.pathname+location.search+'#'+view.dataset.view);
  views.forEach(v=>v.hidden=v!==view);let activeLink;
  links.forEach(a=>{const active=a.hash===`#${view.dataset.view}`;a.classList.toggle('is-active',active);if(active){a.setAttribute('aria-current','page');activeLink=a;}else a.removeAttribute('aria-current');});
  document.title=`${activeLink?.textContent||'Home'} · Dynasty Command Center`;
  window.scrollTo({top:0,behavior:'instant'});activeLink?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  if(focus){const heading=view.querySelector('h1,h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  dispatchEvent(new CustomEvent('dcc:view',{detail:{view:view.dataset.view}}));
 }
 addEventListener('hashchange',()=>route(true));document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(link&&link.hash===location.hash)route(true);});route();
})();
