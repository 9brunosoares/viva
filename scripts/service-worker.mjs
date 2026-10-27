import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const root = process.argv[2] || "dist";
// Inspection galleries/reports stay available online, outside the essential offline installation.
const files = (await walk(root))
  .filter(
    (f) =>
      !f.endsWith("/sw.js") &&
      !f.endsWith("/asset-gallery.html") &&
      !f.endsWith("-audit.json") &&
      !f.endsWith("/assets/manifest.json"),
  )
  .sort();
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile(f));
const version = hash.digest("hex").slice(0, 12);
await writeFile(
  `${root}/sw.js`,
  `const CACHE='viva-${version}';
const FILES=${JSON.stringify(["./", ...files.map((f) => "./" + f.slice(root.length + 1))])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{
  if(event.data?.type!=='ACTIVATE_VIVA')return;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    const own=clients.filter(client=>client.url.startsWith(self.registration.scope));
    return Promise.all(own.map(client=>new Promise(resolve=>{
      const channel=new MessageChannel();
      const timeout=setTimeout(()=>{channel.port1.close();resolve(false);},1200);
      channel.port1.onmessage=reply=>{clearTimeout(timeout);channel.port1.close();resolve(reply.data?.ready===true);};
      client.postMessage({type:'VIVA_READY_CHECK'},[channel.port2]);
    }))).then(ready=>{if(own.length&&ready.every(Boolean))return self.skipWaiting();});
  }));
});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>{
  const older=keys.filter(key=>key.startsWith('viva-')&&key!==CACHE);
  const keep=older.slice(-1);
  return Promise.all(older.filter(key=>!keep.includes(key)).map(key=>caches.delete(key)));
}).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const hit=await cache.match(event.request);if(hit)return hit;
    // A scene already open during adoption may still request a previous hashed chunk.
    if(/\\/assets\\/[^/]+-[\\w-]{8,}\\.(js|css)$/.test(new URL(event.request.url).pathname)){
      const keys=(await caches.keys()).filter(key=>key.startsWith('viva-')&&key!==CACHE);
      for(const key of keys.reverse()){const previous=await (await caches.open(key)).match(event.request);if(previous)return previous;}
    }
    try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return await cache.match('./');throw error;}
  }));
});
`,
);
console.log(`Offline cache ${version}: ${files.length} files`);
