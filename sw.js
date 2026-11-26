/* French Online — service worker (PWA)
   - الصفحة نفسها: الشبكة أولاً (تصل التحديثات فوراً)، والنسخة المخزّنة عند انقطاع الإنترنت.
   - لا يتدخل في أي طلب خارج الموقع (Supabase، الخطوط، الفيديو) ولا في أي طلب غير GET. */
const CACHE = 'fo-pwa-v1';
const SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const OFFLINE = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>French Online</title><body style="font-family:sans-serif;background:#0e0e0e;color:#fff;text-align:center;padding:48px 20px"><h2>لا يوجد اتصال بالإنترنت</h2><p>Pas de connexion Internet · No internet connection</p><p style="opacity:.7">تحقق من الاتصال ثم أعد فتح التطبيق.</p></body></html>';

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;           // Supabase / fonts / videos: لا نتدخل
  if(url.pathname.endsWith('/sw.js')) return;
  if(req.mode === 'navigate'){
    const key = new Request(url.origin + url.pathname);       // نتجاهل ?v= وغيرها كمفتاح تخزين
    e.respondWith(
      fetch(req, { cache: 'reload' }).then(res => {
        if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(key).then(r => r || caches.match('./')).then(r => r || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
    );
    return;
  }
  // ملفات ثابتة من الموقع (أيقونات، manifest): تُعرض من المخزّن ثم تُحدَّث في الخلفية
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
