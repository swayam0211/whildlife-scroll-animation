# 🌿 Cinematic Wildlife Interface — Scrollytelling & 3D Interactive Web Experience

An immersive, award-worthy web application combining real-time 3D WebGL graphics, canvas particle shaders, scrollytelling video frame synchronization, glassmorphism, and interactive micro-animations to deliver a nature documentary experience reminiscent of BBC Planet Earth and Apple product reveals.

---

## 📄 Table of Contents
1. [Project Overview](#-project-overview)
2. [Pages Breakdown & Architecture](#-pages-breakdown--architecture)
3. [Deep Dive into Animations & Interactions](#-deep-dive-into-animations--interactions)
4. [Technology Stack](#-technology-stack)
5. [Getting Started & Running the Server](#-getting-started--running-the-server)
6. [Design & UX Evaluation](#-design--ux-evaluation)

---

## 🌌 Project Overview

The **Cinematic Wildlife Experience** is engineered to bridge the gap between web design, 3D gaming technology, and documentary filmmaking. It features:
- **Real-Time 3D Character Models** rendered with Three.js and Draco decompression.
- **Dynamic 3D-to-2D Eye Tracking** that aligns custom pupil vectors with 3D GLB face anchors in real-time as the user moves their cursor.
- **Scrollytelling Video Playback** where scrolling linearly scrubs high-definition cinematic video frames.
- **GPU-Accelerated Dual Clip-Path Seams** opening up to reveal interior glassmorphic cards.
- **WebGL Stardust Particle Shaders** featuring text rasterization, 3D mouse repulsion, and scroll-driven volumetric particle dispersal.
- **BBC Planet Earth Style 3D Animal Carousel** with 3-panel 3D card flips (`rotateY(180deg)`), image splitting, and dynamic background color gradients.
- **Cinematic Dual-Hemisphere Portal Ring** allowing seamless navigation between environmental realms (Air World vs. Water World) with circular magnetic typography.

---

## 🏛️ Pages Breakdown & Architecture

### 1. `login_page/login.html` — The Glassmorphic 3D Gateway
- **Background Layer**: Seamless golden hour video loop with radial vignette and ambient warm particle drift.
- **3D Canvas Layer**: Three.js WebGL viewport rendering 3 real-time GLB models (**Lion**, **Eagle**, **Crocodile**) with Draco compression, contact shadows, directional sun key lights, blue rim fills, and back glows.
- **Interactive 3D Eye Tracking**: Projects 3D head anchor points onto 2D screen space coordinates to anchor animated eye clip-zones, causing eyes to smoothly lock onto and track the user's cursor.
- **Glass Login Card**: Hyper-clear crystal glassmorphic card with CSS 3D tilt response (`rotateX`/`rotateY`), input press ripples, scale-up focus states, and a smooth page transition upon submission.

### 2. `index.html` — The Core Scrollytelling Experience
- **Sticky Hero Stage (800vh Scroll Length)**: Video frame scrubbing tied to window scroll progress using optimized RequestAnimationFrame (`rAF`) batching.
- **Top & Bottom Split Seams**: Top and bottom black shutter panels separate vertically via `clip-path: inset(...)` to uncover the ambient golden seam glow and reveal the 3D Elephant showcase card.
- **3D Elephant Showcase Card**: Features a 3-panel glass grid, background display typography, floating elephant artwork (`float` + `breathe` animation keyframes), stat highlights, and description block.
- **WebGL Particle Bridge Section**: Custom GLSL vertex and fragment shaders rendering interactive stardust particles forming the text `"SCROLL MORE TO SHOW NEW ANIMALS"`. Features 3D cursor repulsion and scroll progress z-space expansion.
- **Interactive 3D Animal Ring (9 Animals)**: An arc carousel cycling through 9 species (*Red Fox, Spotted Deer, Leopard, Tiger, Cheetah, Bear, Lion, Giraffe, Komodo Dragon*). Features dual split-image reveal, 3D panel flipping cards (`rotateY(180deg)`), and dynamic gradient morphing between tuned color pairs.
- **Cinematic Hemisphere Ring Portal**: Split hemisphere ring (Air World vs. Water World) with interactive scale-explosion transition, cursor spotlight glow, and magnetic circular text letters that stretch and scale toward the mouse cursor.

### 3. `air.html` — Air World Aerial Realm
- Dedicated scrollytelling experience focusing on aerial predators and sky creatures with a custom sapphire/sky-blue color grade, blue seam glow, video scrub stage, and particle transitions.

---

## ✨ Deep Dive into Animations & Interactions

| Animation / Feature | Technology Used | Performance & Technical Highlights |
| :--- | :--- | :--- |
| **3D GLB Model Rendering** | Three.js + Draco Loader | Real-time WebGL rendering with PBR materials (`roughness`, `metalness`, `envMapIntensity`) and contact shadow circles. |
| **3D → 2D Eye Projection** | Three.js `Vector3.project()` + Lerp | Transforms 3D head position into screen pixels, positions clip-zone overlays, and calculates angle/distance vectors to smoothly lerp pupil elements (`currentLX`, `currentLY`). |
| **Scrollytelling Video Scrub** | Pure JS + `requestAnimationFrame` | Binds scroll progress to `video.currentTime` without video element layout thrashing for 60fps scrolling. |
| **Dual Split-Clip Shutter** | CSS `clip-path` | GPU-accelerated `inset()` clips split the top and bottom halves of the viewport seamlessly. |
| **Stardust WebGL Shaders** | Custom GLSL Shaders + Three.js | Offscreen 2D canvas text rasterization into 3D points; custom vertex shader handles 3D mouse repulsion vector physics, breathing offsets, and scroll expansion. |
| **3D Card Panel Flip** | CSS 3D Transforms (`rotateY`) + GSAP | 3 glass panels rotate 180 degrees synchronously with scroll progress to switch between front and back animal texture sets. |
| **Magnetic Circular Typography** | Pure JS Math (`getBoundingClientRect`) | Calculates distance between cursor and circular text characters (`dx`, `dy`), applying proximity scaling, color brightening, and pull translation. |
| **Glass Card Perspective Tilt** | CSS 3D `transform: rotateX() rotateY()` | Calculates normalized mouse coordinates (`-1` to `+1`) and applies smooth rotational tilt to glass container elements. |

---

## 🛠️ Technology Stack

- **Core Technologies**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Custom Properties, Flexbox, Grid, Glassmorphism, 3D Transforms).
- **3D Graphics & WebGL Engine**: [Three.js](https://threejs.org/) (r128), `GLTFLoader`, `DRACOLoader`.
- **Scrollytelling & Motion**: [GSAP](https://greensock.com/gsap/) (GreenSock Animation Platform) + `ScrollTrigger` Plugin.
- **Development Server**: Node.js + `browser-sync` (for instant live reload across devices).

---

## 🚀 Getting Started & Running the Server

### Prerequisites
- Node.js (v14+ recommended)

### Quick Start
1. Open your terminal in the project directory:
   ```bash
   cd "d:/my created sites/wildlife"
   ```
2. Launch the local dev server using npm:
   ```bash
   npm run dev
   ```
   *Alternatively, double click `start.bat` or run:*
   ```bash
   npx browser-sync start --server --files "**/*" --startPath "login_page/login.html"
   ```
3. Open your browser at `http://localhost:3000/login_page/login.html`.

---

## 📊 Design & UX Evaluation

### 🌟 How the Animations Stand Against Modern Web Animation Trends
In the current landscape of modern web design (seen on Awwwards, Apple, Stripe, and Nike digital experiences), this application stands in the **top tier of immersive, cinematic web design**:
- **Not "Standard" or "Generic"**: Unlike standard flat websites with static imagery and simple fade-ins, this site leverages **depth layering**, **scrollytelling**, **real-time WebGL**, and **GPU-accelerated spatial mechanics**.
- **Cinematic Feel**: The golden-hour lighting, dark sapphire palettes, subtle vignette gradients, floating dust particles, and smooth math-lerped motions give it a high-budget documentary feel (BBC Planet Earth / National Geographic).
- **Micro-Interactions**: The 3D eye tracking on the login page and magnetic circular text on the portal ring add elements of delight that encourage interactive exploration.

### 👥 User Experience (UX) & Emotional Impact Across Age Groups

- 👦 **Children & Young Kids (Ages 5–12)**:
  - **Feel**: Pure wonder, magic, and playfulness.
  - **Highlights**: The animal eyes following their cursor on the login page creates instant delight. The interactive stardust particles and 3D animal flips make learning about animals feel like an interactive game.

- 🧑 **Teens & Young Adults (Ages 13–25)**:
  - **Feel**: High-tech immersion, gaming aesthetic, "WOW" factor.
  - **Highlights**: Appreciates the 3D WebGL models, smooth glassmorphism, responsive tilt effects, and dark futuristic lighting style.

- 🧑‍💼 **Middle-Aged Adults (Ages 26–50)**:
  - **Feel**: Sophisticated, documentary-style, elegant, premium quality.
  - **Highlights**: The controlled scroll speed allows them to read stats and descriptions naturally without feeling rushed or overwhelmed by auto-playing carousels.

- 👴 **Seniors & Older Adults (Ages 50+)**:
  - **Feel**: Calm, comfortable, high-contrast clarity.
  - **Highlights**: High contrast typography (gold/amber and bright white over deep dark backgrounds), clear scroll cues, and smooth non-jarring transitions ensure accessibility and ease of navigation.
