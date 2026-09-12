/* ═══════════════════════════════════════════════════════════════
   STEP 4: ADAPTIVE HARDWARE TIER ENGINE (AUTO FPS & HARDWARE DETECTOR)
   ═══════════════════════════════════════════════════════════════ */
(function (window) {
    'use strict';

    class HardwareTierEngine {
        constructor() {
            this.tier = 'high'; // 'high' (Tier 1), 'mid' (Tier 2), 'low' (Tier 3)
            this.fps = 60;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.cores = navigator.hardwareConcurrency || 4;
            this.memory = navigator.deviceMemory || 4; // GB (if supported)
            this.isLowPower = false;
            this.contextLost = false;

            this.config = {
                particleCount: 4000,
                particleStep: 2.5,
                maxDpr: 2.0,
                enableShadows: true,
                enable3DEyes: true,
                scrubHz: 60
            };

            this.detectHardware();
            this.sampleFPS();
            this.initPowerAndMotionListeners();
        }

        detectHardware() {
            // Initial hardware capability heuristic
            if (this.cores <= 2 || this.memory < 4 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                this.setTier('mid');
            } else {
                this.setTier('high');
            }
        }

        initPowerAndMotionListeners() {
            // Reduced motion media query check
            const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            if (motionQuery.matches) {
                this.isLowPower = true;
                this.setTier('low');
            }
            if (motionQuery.addEventListener) {
                motionQuery.addEventListener('change', (e) => {
                    if (e.matches) {
                        this.isLowPower = true;
                        this.setTier('low');
                    }
                });
            }

            // Battery API status check (Low Power Mode < 20% battery without charger)
            if ('getBattery' in navigator) {
                navigator.getBattery().then((battery) => {
                    const checkBattery = () => {
                        const lowBattery = !battery.charging && battery.level <= 0.20;
                        if (lowBattery && !this.isLowPower) {
                            this.isLowPower = true;
                            this.setTier('low');
                        }
                    };
                    checkBattery();
                    battery.addEventListener('levelchange', checkBattery);
                    battery.addEventListener('chargingchange', checkBattery);
                }).catch(() => { });
            }
        }

        registerWebGLContext(rendererOrCanvas, onRestore) {
            const dom = (rendererOrCanvas && rendererOrCanvas.domElement) ? rendererOrCanvas.domElement : rendererOrCanvas;
            if (!dom || !dom.addEventListener) return;

            dom.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                console.warn('[WildlifeTierEngine] WebGL Context Lost on element:', dom);
                this.contextLost = true;
                window.dispatchEvent(new CustomEvent('webglcontextlost', { detail: { element: dom } }));
            }, false);

            dom.addEventListener('webglcontextrestored', () => {
                console.log('[WildlifeTierEngine] WebGL Context Restored on element:', dom);
                this.contextLost = false;
                if (typeof onRestore === 'function') {
                    onRestore();
                }
                window.dispatchEvent(new CustomEvent('webglcontextrestored', { detail: { element: dom } }));
            }, false);
        }

        sampleFPS() {
            let frames = 0;
            let startTime = performance.now();

            const checkFPS = (now) => {
                frames++;
                const delta = now - startTime;

                if (delta >= 1000) {
                    this.fps = Math.round((frames * 1000) / delta);

                    if (this.isLowPower) {
                        this.setTier('low');
                    } else if (this.fps >= 55 && this.cores >= 4) {
                        this.setTier('high');
                    } else if (this.fps >= 30) {
                        this.setTier('mid');
                    } else {
                        this.setTier('low');
                    }
                } else {
                    requestAnimationFrame(checkFPS);
                }
            };

            requestAnimationFrame(checkFPS);
        }

        setTier(tierName) {
            this.tier = tierName;
            document.documentElement.classList.remove('tier-high', 'tier-mid', 'tier-low');
            document.documentElement.classList.add(`tier-${tierName}`);

            if (tierName === 'high') {
                this.config = {
                    particleCount: 4000,
                    particleStep: 2.5,
                    maxDpr: Math.min(window.devicePixelRatio || 1, 2.0),
                    enableShadows: true,
                    enable3DEyes: true,
                    scrubHz: 60
                };
            } else if (tierName === 'mid') {
                this.config = {
                    particleCount: 1800,
                    particleStep: 4.0,
                    maxDpr: Math.min(window.devicePixelRatio || 1, 1.25),
                    enableShadows: false,
                    enable3DEyes: true,
                    scrubHz: 30
                };
            } else { // 'low'
                this.config = {
                    particleCount: 600,
                    particleStep: 6.0,
                    maxDpr: 1.0,
                    enableShadows: false,
                    enable3DEyes: false,
                    scrubHz: 15
                };
            }

            window.dispatchEvent(new CustomEvent('tierchanged', { detail: { tier: this.tier, config: this.config } }));
        }
    }

    window.WildlifeTierEngine = new HardwareTierEngine();
})(window);
