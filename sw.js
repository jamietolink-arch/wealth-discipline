const CACHE="wealth-discipline-v4-2";
const ASSETS=["./","./index.html","./styles.css","./app.js?v=4.2.0","./manifest.json"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))])));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||e.request.url.includes("market-data.json"))return;e.respondWith(fetch(e.request).then(x=>{const c=x.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));return x}).catch(()=>caches.match(e.request)))});
