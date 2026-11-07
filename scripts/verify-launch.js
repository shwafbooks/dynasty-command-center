import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function route(search='',saved=null){let redirect=null;const context={URL,URLSearchParams,location:{search,href:'https://example.com/'+search,replace(url){redirect=url;}},localStorage:{getItem(){return saved;}}};vm.runInNewContext(source,context);return redirect;}
assert.equal(route(),'https://example.com/launch.html');assert.equal(route('?league=1389344338340761600'),null);assert.equal(route('?deal=legacy-token'),null);assert.equal(route('', '1237193591122575360'),null);assert.equal(route('', 'bad'),'https://example.com/launch.html');assert.equal(route('?league=bad'),null);
console.log('Launch routing: new visitors, connected visitors, explicit leagues, legacy trade links and invalid saved preference passed.');
