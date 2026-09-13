/* ═══════════════════════════════════════════════════════════════
   STEP 3: PREDICTIVE SLIDING WINDOW (+/- 2 SECTIONS) & PRE-BUFFER ENGINE
   ═══════════════════════════════════════════════════════════════ */
(function (window) {
    'use strict';

    class SlidingWindowEngine {
        constructor() {
            this.sections = new Map();
            this.cachedUrls = new Set();
            this.initObserver();
            this.initBackgroundPrebuffer();
        }

        // 1. Idle Background Pre-buffer (Lightweight asset caching)
        initBackgroundPrebuffer() {
            // High-priority 3D models only (cached on idle after initial hero video loads)
            const modelsToCache = [
                'login_page/lion-3.glb',
                'login_page/eagle-3.glb',
                'login_page/crock-3.glb'
            ];

            const cacheModels = () => {
                modelsToCache.forEach(url => {
                    if (this.cachedUrls.has(url)) return;
                    this.cachedUrls.add(url);
                    fetch(url, { mode: 'cors', cache: 'force-cache' }).catch(() => {});
                });
            };

            if ('requestIdleCallback' in window) {
                requestIdleCallback(cacheModels, { timeout: 4000 });
            } else {
                setTimeout(cacheModels, 3000);
            }
        }

        // 2. Predictive Sliding Window Observer (+/- 3 Viewport Sections lookahead)
        initObserver() {
            // 300vh lookahead margin so videos pre-buffer 20+ frames before reaching viewport
            const rootMargin = '300vh 0px 300vh 0px';

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const targetId = entry.target.id || entry.target.dataset.jitId;
                    const config = this.sections.get(targetId);
                    if (!config) return;

                    if (entry.isIntersecting) {
                        // Enter Sliding Window (+/- 3 Sections): Boot section & start videos
                        if (typeof config.onEnter === 'function') {
                            if (!config.booted || config.repeat) {
                                config.booted = true;
                                config.onEnter(entry.target);
                            }
                        }
                        const vids = entry.target.querySelectorAll('video');
                        vids.forEach(v => {
                            if (!v.src && v.dataset.src) {
                                v.src = v.dataset.src;
                            }
                            v.muted = true;
                            v.playsInline = true;
                            v.setAttribute('playsinline', '');
                            v.setAttribute('webkit-playsinline', '');
                            const playPromise = v.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => {});
                            }
                        });
                    } else {
                        // Exit Sliding Window (> 3 Sections): Pause to save GPU/CPU (keep src cached in memory)
                        if (typeof config.onExit === 'function') {
                            config.onExit(entry.target);
                        }
                        const vids = entry.target.querySelectorAll('video');
                        vids.forEach(v => {
                            v.pause();
                        });
                    }
                });
            }, {
                root: null,
                rootMargin: rootMargin,
                threshold: 0.001
            });
        }

        register(elementOrId, options = {}) {
            const setup = () => {
                let el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
                if (!el) return;
                const id = el.id || (el.id = `jit-${Math.random().toString(36).substr(2, 9)}`);
                el.dataset.jitId = id;
                const config = typeof options === 'function' ? { onEnter: options } : options;
                this.sections.set(id, config);
                this.observer.observe(el);
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setup);
            } else {
                setup();
            }
        }
    }

    window.WildlifeJIT = new SlidingWindowEngine();
})(window);
