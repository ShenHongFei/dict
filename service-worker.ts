/// <reference path="../node_modules/typescript/lib/lib.webworker.d.ts" />

declare let self: ServiceWorkerGlobalScope

const ASSET_CACHE = 'asset_cache'


self.addEventListener('install', event => {
    event.waitUntil((async () => {
        let asset_cache = await caches.open(ASSET_CACHE)
        await asset_cache.addAll(ASSETS)
    })())
})


self.addEventListener('fetch', event => {
    const { request } = event
    
    if (
        request.url.match(/(search)$/) ||
        !request.url.match(/dict|unpkg/)
    ) return
    
    
    // --- assets
    event.respondWith((async () => {
        const cache = await caches.open(ASSET_CACHE)
        const cache_data = await cache.match(request)
        if (cache_data)
            return cache_data
        const result = await fetch(request)
        cache.put(request, result.clone())
        return result
    })())
})


const ASSETS = [
    'index.html',
    'manifest.json',
    'index.js',
    
    'dict.ico',
    'dict.png',
    'dict.192.png',
    
    // 会变成 url 打包到 index.js 中
    // 'search.png',
    
    'https://unpkg.com/jquery',
    'https://unpkg.com/lodash',
    'https://unpkg.com/react/umd/react.development.js',
    'https://unpkg.com/react-dom/umd/react-dom.development.js',
    
    'lib/pcmdata.min.js',
    'lib/aurora.js',
    'lib/bitstring.js',
    'lib/aurora-speex.js',
    'lib/ogg.min.js',
    'lib/speex.js',
    'lib/audio.js',
]


export { }

