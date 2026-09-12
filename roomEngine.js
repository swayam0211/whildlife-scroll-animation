/* ═══════════════════════════════════════════════════════════════
   3D CONTINUOUS OCEAN ROOM CORRIDOR TUNNEL ENGINE (STABLE PERMANENT LIFECYCLE)
   ═══════════════════════════════════════════════════════════════ */
(function (window) {
    'use strict';

    const roomPanelVertexShader = `
      uniform float uVelocity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vDepth;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;

        float velocityEffect = clamp(uVelocity * 0.15, -1.2, 1.2);
        pos.z += pos.z * velocityEffect * 0.08;
        pos.xy += normal.xy * sin(pos.z * 0.5 + uTime * 1.5) * 0.005;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        vec4 mvPosition = viewMatrix * worldPos;
        vDepth = -mvPosition.z;

        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const roomPanelFragmentShader = `
      uniform sampler2D uMap;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      uniform float uBorderWidth;
      uniform vec3 uBorderColor;
      uniform float uOpacity;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vDepth;
      varying vec3 vNormal;

      void main() {
        vec4 texColor = texture2D(uMap, vUv);

        vec2 borderFactor = step(vec2(uBorderWidth), vUv) * step(vUv, vec2(1.0 - uBorderWidth));
        float isInside = borderFactor.x * borderFactor.y;

        vec3 baseColor = mix(uBorderColor, texColor.rgb, isInside);

        vec2 uvCentered = vUv * 2.0 - 1.0;
        float vignette = 1.0 - dot(uvCentered, uvCentered) * 0.25;
        baseColor *= clamp(vignette, 0.7, 1.0);

        vec3 lightDir = normalize(vec3(0.3, 0.8, 1.0));
        float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.25 + 0.75;
        baseColor *= diffuse;

        float fogFactor = smoothstep(uFogNear, uFogFar, vDepth);
        vec3 finalColor = mix(baseColor, uFogColor, fogFactor);

        gl_FragColor = vec4(finalColor, uOpacity);
      }
    `;

    const dustVertexShader = `
      uniform float uTime;
      uniform float uSize;
      attribute float aScale;
      attribute vec3 aSpeed;

      varying float vAlpha;
      varying float vDepth;

      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * aSpeed.x + pos.z * 0.1) * 0.4;
        pos.y += cos(uTime * aSpeed.y + pos.x * 0.1) * 0.4;
        pos.z += sin(uTime * aSpeed.z + pos.y * 0.1) * 0.6;

        vec4 mvPosition = viewMatrix * modelMatrix * vec4(pos, 1.0);
        vDepth = -mvPosition.z;

        gl_PointSize = (uSize * aScale * 280.0) / vDepth;
        vAlpha = sin(uTime * 2.0 + pos.x * 10.0) * 0.3 + 0.7;

        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const dustFragmentShader = `
      uniform vec3 uColor;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;

      varying float vAlpha;
      varying float vDepth;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.75;
        float fogFactor = smoothstep(uFogNear, uFogFar, vDepth);
        vec3 finalColor = mix(uColor, uFogColor, fogFactor);

        gl_FragColor = vec4(finalColor, alpha * (1.0 - fogFactor));
      }
    `;

    class RoomEngine {
        constructor(container, imageSources = []) {
            this.container = typeof container === 'string' ? document.querySelector(container) : container;
            if (!this.container) return;

            this.imageSources = imageSources;

            this.roomWidth = 6.0;
            this.roomHeight = 4.0;
            this.sectionDepth = 4.0;
            this.numSections = 16;
            this.totalTunnelLength = this.numSections * this.sectionDepth;

            this.scrollZ = 0;
            this.targetScrollZ = 0;
            this.velocity = 0;
            this.friction = 0.92;
            this.easeFactor = 0.08;
            this.autoScrollSpeed = 0.035;

            this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
            this.isPointerDown = false;
            this.pointerStartY = 0;
            this.scrollZOnDown = 0;

            this.isSleeping = false;
            this.isDestroyed = false;
            this.animFrameId = null;
            this.clock = new THREE.Clock();

            this.disposables = {
                geometries: new Set(),
                materials: new Set(),
                textures: new Set()
            };

            this.onWheel = this.onWheel.bind(this);
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onResize = this.onResize.bind(this);

            this.init();
        }

        init() {
            this.setupRenderer();
            this.setupScene();
            this.setupCamera();
            this.loadTextures();
            this.buildRoomCorridor();
            this.buildDustParticles();
            this.bindEvents();
            this.startLoop();
        }

        setupRenderer() {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.container,
                antialias: true,
                powerPreference: 'high-performance',
                alpha: false
            });

            const activeDpr = (window.WildlifeTierEngine && window.WildlifeTierEngine.config.maxDpr) || Math.min(window.devicePixelRatio || 1, 1.5);
            this.renderer.setPixelRatio(activeDpr);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x010a14, 1.0);
            if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        setupScene() {
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.Fog(0x010a14, 8, 48);
        }

        setupCamera() {
            this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
            this.camera.position.set(0, 0, 2.0);
        }

        loadTextures() {
            this.textureLoader = new THREE.TextureLoader();
            this.textures = [];

            if (!this.imageSources || this.imageSources.length === 0) {
                const canvas = document.createElement('canvas');
                canvas.width = 2;
                canvas.height = 2;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#002b47';
                ctx.fillRect(0, 0, 2, 2);
                const tex = new THREE.CanvasTexture(canvas);
                this.disposables.textures.add(tex);
                this.textures.push(tex);
            } else {
                this.imageSources.forEach((src) => {
                    const tex = this.textureLoader.load(src, (loadedTex) => {
                        loadedTex.needsUpdate = true;
                        this.wakeUp();
                    });
                    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
                    this.disposables.textures.add(tex);
                    this.textures.push(tex);
                });
            }
        }

        buildRoomCorridor() {
            this.roomGroup = new THREE.Group();
            this.scene.add(this.roomGroup);

            const wallGeometry = new THREE.PlaneGeometry(this.sectionDepth, this.roomHeight, 8, 8);
            const capGeometry = new THREE.PlaneGeometry(this.roomWidth, this.sectionDepth, 8, 8);
            this.disposables.geometries.add(wallGeometry);
            this.disposables.geometries.add(capGeometry);

            this.roomSections = [];
            let textureIdx = 0;

            for (let i = 0; i < this.numSections; i++) {
                const zPos = -i * this.sectionDepth;
                const sectionGroup = new THREE.Group();
                sectionGroup.position.z = zPos;
                sectionGroup.userData = { initialZ: zPos, index: i };

                const planesInfo = [
                    { geom: wallGeometry, pos: [-this.roomWidth / 2, 0, 0], rot: [0, Math.PI / 2, 0] },
                    { geom: wallGeometry, pos: [this.roomWidth / 2, 0, 0], rot: [0, -Math.PI / 2, 0] },
                    { geom: capGeometry, pos: [0, this.roomHeight / 2, 0], rot: [Math.PI / 2, 0, 0] },
                    { geom: capGeometry, pos: [0, -this.roomHeight / 2, 0], rot: [-Math.PI / 2, 0, 0] }
                ];

                planesInfo.forEach((info) => {
                    const tex = this.textures[textureIdx % this.textures.length];
                    textureIdx++;

                    const mat = new THREE.ShaderMaterial({
                        vertexShader: roomPanelVertexShader,
                        fragmentShader: roomPanelFragmentShader,
                        uniforms: {
                            uMap: { value: tex },
                            uVelocity: { value: 0 },
                            uTime: { value: 0 },
                            uFogColor: { value: new THREE.Color(0x010a14) },
                            uFogNear: { value: 6 },
                            uFogFar: { value: 46 },
                            uBorderWidth: { value: 0.03 },
                            uBorderColor: { value: new THREE.Color(0x00e5ff) },
                            uOpacity: { value: 1.0 }
                        },
                        side: THREE.DoubleSide,
                        transparent: false
                    });

                    this.disposables.materials.add(mat);

                    const mesh = new THREE.Mesh(info.geom, mat);
                    mesh.position.set(...info.pos);
                    mesh.rotation.set(...info.rot);
                    sectionGroup.add(mesh);
                });

                this.roomGroup.add(sectionGroup);
                this.roomSections.push(sectionGroup);
            }
        }

        buildDustParticles() {
            const particleCount = 350;
            const geometry = new THREE.BufferGeometry();

            const positions = new Float32Array(particleCount * 3);
            const scales = new Float32Array(particleCount);
            const speeds = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * (this.roomWidth * 0.95);
                positions[i * 3 + 1] = (Math.random() - 0.5) * (this.roomHeight * 0.95);
                positions[i * 3 + 2] = -Math.random() * this.totalTunnelLength;

                scales[i] = 0.6 + Math.random() * 1.6;
                speeds[i * 3] = 0.2 + Math.random() * 0.5;
                speeds[i * 3 + 1] = 0.2 + Math.random() * 0.5;
                speeds[i * 3 + 2] = 0.1 + Math.random() * 0.4;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
            geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 3));
            this.disposables.geometries.add(geometry);

            this.dustMaterial = new THREE.ShaderMaterial({
                vertexShader: dustVertexShader,
                fragmentShader: dustFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uSize: { value: 0.14 },
                    uColor: { value: new THREE.Color(0x00e5ff) },
                    uFogColor: { value: new THREE.Color(0x010a14) },
                    uFogNear: { value: 4 },
                    uFogFar: { value: 42 }
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            this.disposables.materials.add(this.dustMaterial);
            this.dustPoints = new THREE.Points(geometry, this.dustMaterial);
            this.scene.add(this.dustPoints);
        }

        bindEvents() {
            window.addEventListener('wheel', this.onWheel, { passive: false });
            window.addEventListener('pointerdown', this.onPointerDown);
            window.addEventListener('pointermove', this.onPointerMove);
            window.addEventListener('pointerup', this.onPointerUp);
            window.addEventListener('keydown', this.onKeyDown);
            window.addEventListener('resize', this.onResize);
        }

        onWheel(e) {
            if (!this.container) return;
            const containerRect = this.container.getBoundingClientRect();
            if (containerRect.bottom < 0 || containerRect.top > window.innerHeight) return;

            this.wakeUp();
            const delta = e.deltaY * 0.008;
            this.targetScrollZ += delta;
        }

        onPointerDown(e) {
            this.isPointerDown = true;
            this.pointerStartY = e.clientY;
            this.scrollZOnDown = this.targetScrollZ;
            this.wakeUp();
        }

        onPointerMove(e) {
            this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
            this.wakeUp();

            if (this.isPointerDown) {
                const dy = e.clientY - this.pointerStartY;
                this.targetScrollZ = this.scrollZOnDown + dy * 0.02;
            }
        }

        onPointerUp() {
            this.isPointerDown = false;
        }

        onKeyDown(e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                this.targetScrollZ += 1.5;
                this.wakeUp();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                this.targetScrollZ -= 1.5;
                this.wakeUp();
            }
        }

        onResize() {
            if (!this.renderer || !this.camera) return;
            const activeDpr = (window.WildlifeTierEngine && window.WildlifeTierEngine.config.maxDpr) || Math.min(window.devicePixelRatio || 1, 1.5);
            this.renderer.setPixelRatio(activeDpr);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.wakeUp();
        }

        wakeUp() {
            if (this.isSleeping && !this.isDestroyed) {
                this.isSleeping = false;
                this.startLoop();
            }
        }

        pause() {
            this.isSleeping = true;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }

        resume() {
            if (this.isDestroyed) return;
            this.isSleeping = false;
            if (this.clock) this.clock.getDelta();
            this.startLoop();
        }

        setScrollProgress(progress) {
            this.externalScrollDrive = true;
            const maxZ = this.totalTunnelLength * 1.6;
            this.targetScrollZ = progress * maxZ;
            this.wakeUp();
        }

        updatePhysics(delta) {
            if (!this.externalScrollDrive) {
                this.targetScrollZ += this.autoScrollSpeed;
            }

            const prevZ = this.scrollZ;
            this.scrollZ += (this.targetScrollZ - this.scrollZ) * this.easeFactor;

            const safeDelta = Math.min(Math.max(delta || 0.016, 0.001), 0.1);
            const diff = this.scrollZ - prevZ;
            this.velocity = diff / safeDelta;
            this.velocity *= this.friction;

            this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
            this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

            this.camera.position.x = this.mouse.x * 0.4;
            this.camera.position.y = this.mouse.y * 0.3;
            this.camera.rotation.y = -this.mouse.x * 0.05;
            this.camera.rotation.x = this.mouse.y * 0.05;

            const isMotionStatic =
                Math.abs(diff) < 0.0001 &&
                Math.abs(this.velocity) < 0.0001 &&
                Math.abs(this.mouse.targetX - this.mouse.x) < 0.001 &&
                Math.abs(this.mouse.targetY - this.mouse.y) < 0.001;

            return isMotionStatic;
        }

        updateCorridor() {
            if (!this.roomSections) return;
            const totalLength = this.totalTunnelLength;

            this.roomSections.forEach((section) => {
                const initialZ = section.userData.initialZ;
                let rawZ = initialZ + (this.scrollZ % totalLength);

                while (rawZ > 4.0) {
                    rawZ -= totalLength;
                }
                while (rawZ <= 4.0 - totalLength) {
                    rawZ += totalLength;
                }

                section.position.z = rawZ;

                section.children.forEach((mesh) => {
                    if (mesh.material && mesh.material.uniforms) {
                        mesh.material.uniforms.uVelocity.value = this.velocity;
                        mesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
                    }
                });
            });

            if (this.dustMaterial) {
                this.dustMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
            }
        }

        render() {
            if (this.isDestroyed || this.isSleeping) return;

            const delta = this.clock.getDelta();
            const safeDelta = Math.min(Math.max(delta || 0.016, 0.001), 0.1);
            const isStatic = this.updatePhysics(safeDelta);
            this.updateCorridor();

            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }

            this.animFrameId = requestAnimationFrame(() => this.render());
        }

        startLoop() {
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            this.animFrameId = requestAnimationFrame(() => this.render());
        }

        destroy() {
            this.isDestroyed = true;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }

            window.removeEventListener('wheel', this.onWheel);
            window.removeEventListener('pointerdown', this.onPointerDown);
            window.removeEventListener('pointermove', this.onPointerMove);
            window.removeEventListener('pointerup', this.onPointerUp);
            window.removeEventListener('keydown', this.onKeyDown);
            window.removeEventListener('resize', this.onResize);

            if (this.scene) {
                this.scene.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((mat) => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }

            this.disposables.geometries.forEach((g) => g.dispose());
            this.disposables.materials.forEach((m) => m.dispose());
            this.disposables.textures.forEach((t) => t.dispose());

            this.disposables.geometries.clear();
            this.disposables.materials.clear();
            this.disposables.textures.clear();

            if (this.renderer) {
                this.renderer.dispose();
            }

            this.scene = null;
            this.camera = null;
            this.renderer = null;
        }
    }

    window.OceanRoomEngine = RoomEngine;
})(window);
