(() => {
    // --- SCENE SETUP ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const TEXT = "SCROLL MORE\nTO SEE ANIMATION";
    const MOUSE_RADIUS = 100;
    const lerp = (a, b, n) => (1 - n) * a + n * b;

    // --- MOUSE & SCROLL TRACKING ---
    const mouse = new THREE.Vector2(-9999, -9999);
    const targetMouse = new THREE.Vector2(-9999, -9999);
    let scrollProgress = 0;

    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        const z = 500;
        const vFov = (camera.fov * Math.PI) / 180;
        const h = 2 * Math.tan(vFov / 2) * z;
        const w = h * camera.aspect;
        targetMouse.x = x * w / 2;
        targetMouse.y = y * h / 2;
    });

    window.addEventListener('scroll', () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = window.scrollY / (maxScroll || 1);
    }, { passive: true });

    // --- PARTICLE GENERATION ---
    const setupParticles = () => {
        const offscreen = document.createElement('canvas');
        const offCtx = offscreen.getContext('2d');
        offscreen.width = 2048; // Higher res for clear text
        offscreen.height = 1024;

        const fontSize = 160;
        offCtx.fillStyle = '#fff';
        offCtx.font = `900 ${fontSize}px "Arial Black", "Impact", sans-serif`;
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';

        const lines = TEXT.split('\n');
        lines.forEach((line, i) => {
            offCtx.fillText(line, offscreen.width / 2, offscreen.height / 2 + (i - 0.5) * fontSize * 1.3);
        });

        const imgData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
        const homePositions = [];
        const randomValues = [];

        // Sample with a gap to maintain performance
        const step = 4; 
        for (let y = 0; y < offscreen.height; y += step) {
            for (let x = 0; x < offscreen.width; x += step) {
                const i = (y * offscreen.width + x) * 4;
                if (imgData[i + 3] > 128) {
                    const px = (x - offscreen.width / 2) * 0.4;
                    const py = -(y - offscreen.height / 2) * 0.4;
                    homePositions.push(px, py, 0);
                    randomValues.push(Math.random(), Math.random(), Math.random());
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(homePositions, 3));
        geometry.setAttribute('homePosition', new THREE.Float32BufferAttribute(homePositions, 3));
        geometry.setAttribute('randomValue', new THREE.Float32BufferAttribute(randomValues, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMouse: { value: mouse },
                uMouseRadius: { value: MOUSE_RADIUS },
                uScroll: { value: 0 }
            },
            vertexShader: `
                uniform float uTime;
                uniform vec2 uMouse;
                uniform float uMouseRadius;
                uniform float uScroll;
                attribute vec3 homePosition;
                attribute vec3 randomValue;
                varying float vAlpha;

                void main() {
                    vec3 pos = homePosition;
                    
                    // Subtle organic breathing
                    pos.x += sin(uTime * 1.2 + randomValue.x * 20.0) * 2.0;
                    pos.y += cos(uTime * 1.5 + randomValue.y * 20.0) * 2.0;

                    // Scroll expansion effect
                    pos.x *= 1.0 + uScroll * 1.5;
                    pos.y *= 1.0 + uScroll * 1.5;
                    pos.z += uScroll * 200.0 * randomValue.z;

                    // Mouse repulsion
                    float dist = distance(pos.xy, uMouse);
                    if (dist < uMouseRadius) {
                        float force = (uMouseRadius - dist) / uMouseRadius;
                        vec2 dir = normalize(pos.xy - uMouse);
                        pos.xy += dir * force * 50.0;
                        pos.z += force * 40.0;
                    }

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = (3.0 + randomValue.x * 3.0) * (500.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                    vAlpha = (1.0 - uScroll * 0.5) * (0.6 + 0.4 * randomValue.z);
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * (1.0 - dist * 2.0));
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);
        return points;
    };

    const points = setupParticles();

    // Resize handler
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    // Render loop
    const animate = (time) => {
        requestAnimationFrame(animate);
        
        // Smooth mouse following
        mouse.x = lerp(mouse.x, targetMouse.x, 0.1);
        mouse.y = lerp(mouse.y, targetMouse.y, 0.1);
        
        points.material.uniforms.uTime.value = time * 0.001;
        points.material.uniforms.uScroll.value = scrollProgress;
        
        renderer.render(scene, camera);
    };

    // Add extra scroll height
    const scrollDiv = document.createElement('div');
    scrollDiv.style.height = '300vh';
    scrollDiv.style.pointerEvents = 'none';
    document.body.appendChild(scrollDiv);

    animate(0);
})();
