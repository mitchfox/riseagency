"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { useXRay } from "@/contexts/XRayContext"

interface Player3DEffectProps {
  className?: string
  imagePrefix?: string // e.g., "player" or "player2" for different image sets
}

export const Player3DEffect = ({ className = "", imagePrefix = "player" }: Player3DEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { setXrayState } = useXRay()
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.OrthographicCamera
    renderer: THREE.WebGLRenderer
    playerMesh: THREE.Mesh | null
    xrayMesh: THREE.Mesh | null
    xrayOverlayMesh: THREE.Mesh | null
    uniforms: any
    xrayOverlayUniforms: any
    animationId: number
  } | null>(null)
  const mouseRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 })
  const lastInteractionRef = useRef(Date.now() - 3000)
  const autoRevealPosRef = useRef({ x: 0.5, y: 0.5 })

  // Utility to yield to main thread, preventing long tasks
  const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  // Load images directly (no ZIP processing)
  const loadImages = useCallback(async () => {
    try {
      const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
      })

      // Import white marble from assets
      const whiteMarbleModule = await import("@/assets/white-marble.png")

      // Load ALL images in parallel - use imagePrefix for base, overlay, xray
      // Also try to load kit images with prefix, falling back to null if not found
      const [
        baseImage,
        overlayImage,
        xrayImage,
        depthMapImg,
        depthLightenedImg,
        depthDarkenedImg,
        kitOverlayImg,
        kitDepthImg,
        shadowImg,
        bwLayerImg,
        whiteMarbleImg
      ] = await Promise.all([
        loadImage(`/assets/${imagePrefix}-base.png`),
        loadImage(`/assets/${imagePrefix}-gold-overlay.png`),
        loadImage(`/assets/${imagePrefix}-xray.png`),
        loadImage("/assets/player-depth-map.png"),
        loadImage("/assets/player-depth-lightened.png"),
        loadImage("/assets/player-depth-darkened.png"),
        // Try prefix-specific kit images first, will return null if not found
        loadImage(`/assets/${imagePrefix}-kit-overlay.png`),
        loadImage(`/assets/${imagePrefix}-kit-depth.png`),
        loadImage("/assets/player-shadow.png"),
        loadImage("/assets/player-bw-layer.png"),
        loadImage(whiteMarbleModule.default)
      ])
      
      if (!baseImage || !overlayImage || !xrayImage) {
        console.error("Missing required images for prefix:", imagePrefix)
        return null
      }
      
      console.log("Images loaded:", { prefix: imagePrefix, base: !!baseImage, overlay: !!overlayImage, xray: !!xrayImage, kitOverlay: !!kitOverlayImg, kitDepth: !!kitDepthImg, shadow: !!shadowImg, bwLayer: !!bwLayerImg, whiteMarble: !!whiteMarbleImg })
      
      return { 
        baseImage,
        overlayImage,
        xrayImage,
        depthMap: depthMapImg,
        depthLightened: depthLightenedImg,
        depthDarkened: depthDarkenedImg,
        kitOverlay: kitOverlayImg,
        kitDepth: kitDepthImg,
        shadowImage: shadowImg,
        bwLayerImage: bwLayerImg,
        whiteMarbleImage: whiteMarbleImg
      }
    } catch (error) {
      console.error("Error loading images:", error)
      return null
    }
  }, [imagePrefix])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let animationId: number

    // Simple vertex shader - NO displacement to keep image crisp
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // ============= FULL-VIEWPORT X-RAY OVERLAY SHADER =============
    // This shader runs on a full-screen quad and renders the fluid X-ray reveal effect
    const xrayOverlayFragmentShader = `
      uniform float time;
      uniform vec2 resolution;
      uniform float noiseTime;
      uniform float fluidPhase;
      uniform float isPhantomMode;
      
      // Organic fluid X-ray reveal uniforms
      uniform vec2 cursorBlobPos;
      uniform float cursorBlobOpacity;
      uniform vec2 cursorVelocity;
      uniform float cursorSpeed;
      uniform vec2 cursorTrail1;
      uniform vec2 cursorTrail2;
      uniform vec2 cursorTrail3;
      uniform vec2 cursorTrail4;
      uniform float trailOpacity1;
      uniform float trailOpacity2;
      uniform float trailOpacity3;
      uniform float trailOpacity4;
      uniform vec2 ambientBlob1Pos;
      uniform vec2 ambientBlob2Pos;
      uniform vec2 ambientBlob3Pos;
      
      // Player bounds for compositing
      uniform vec2 playerCenter;
      uniform vec2 playerSize;
      
      varying vec2 vUv;
      
      const vec3 riseGold = vec3(0.92, 0.78, 0.45);
      const vec3 revealGrey = vec3(0.75, 0.75, 0.78);
      const vec3 revealWhite = vec3(1.0, 1.0, 1.0);
      const vec3 brightGold = vec3(1.0, 0.9, 0.5);
      const vec3 warmLight = vec3(1.0, 0.95, 0.85);
      
      // ============= SIMPLEX NOISE IMPLEMENTATION =============
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                                + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                                dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      // Flow-based FBM for smooth organic distortion - OPTIMIZED (reduced iterations)
      float flowFBM(vec2 p, float t) {
        float value = 0.0;
        float amplitude = 0.5;
        vec2 flow = vec2(t * 0.15, t * 0.1);
        for (int i = 0; i < 3; i++) {
          value += amplitude * snoise(p + flow);
          p *= 2.0;
          flow *= 1.25;
          amplitude *= 0.55;
        }
        return value;
      }
      
      // ============= SDF FUNCTIONS FOR TRUE FLUID BLENDING =============
      
      // Smooth minimum - creates organic metaball-like blending
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * k * 0.25;
      }
      
      // Circle SDF
      float circleSDF(vec2 p, vec2 center, float radius) {
        return length(p - center) - radius;
      }
      
      // Capsule/pill SDF for elongated fluid trails
      float capsuleSDF(vec2 p, vec2 a, vec2 b, float r) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / (dot(ba, ba) + 0.0001), 0.0, 1.0);
        return length(pa - ba * h) - r;
      }
      
      // ============= MAIN WATER BLOB FUNCTION =============
      // Creates smooth, organic water-like blob using SDF with flow distortion - OPTIMIZED
      float waterBlob(vec2 uv, vec2 center, float baseRadius, float timeOffset) {
        // Flow-based distortion applied to UV space - reduced detail for performance
        vec2 flowDistort = vec2(
          flowFBM(uv * 6.0 + timeOffset, noiseTime * 0.8) * 0.03,
          flowFBM(uv * 6.0 + timeOffset + 100.0, noiseTime * 0.7) * 0.03
        );
        vec2 distortedUV = uv + flowDistort;
        
        // Base circle SDF
        float dist = circleSDF(distortedUV, center, baseRadius);
        
        // Single edge distortion pass for performance
        float edgeWave = flowFBM(uv * 10.0 + center * 5.0 + timeOffset, noiseTime * 0.5) * 0.02;
        dist += edgeWave;
        
        // Sharper, more defined edge
        return 1.0 - smoothstep(-0.015, 0.03, dist);
      }
      
      // ============= CONNECTED WATER LOBES =============
      // Creates 2-3 smaller connected blobs - OPTIMIZED (reduced from 4 to 3 lobes)
      float waterLobes(vec2 uv, vec2 center, float baseRadius, vec2 velocity, float speed, float timeOffset) {
        float combinedSDF = circleSDF(uv, center, baseRadius);
        
        // Generate 3 connected lobes (reduced from 4)
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          
          // Lobe offset driven by smooth noise
          vec2 lobeOffset = vec2(
            snoise(vec2(fi * 3.5 + timeOffset, noiseTime * 0.35)) * 0.12,
            snoise(vec2(fi * 3.5 + 50.0 + timeOffset, noiseTime * 0.28)) * 0.12
          );
          
          // Add velocity bias
          if (speed > 0.02) {
            lobeOffset += velocity * (0.07 + fi * 0.025);
          }
          
          vec2 lobeCenter = center + lobeOffset;
          float lobeRadius = baseRadius * (0.35 + snoise(vec2(fi, noiseTime * 0.45)) * 0.18);
          
          float lobeSDF = circleSDF(uv, lobeCenter, lobeRadius);
          
          // Smooth-min blend creates organic connection
          combinedSDF = smin(combinedSDF, lobeSDF, 0.06);
        }
        
        // Single flow distortion pass
        float flowDistort = flowFBM(uv * 8.0 + timeOffset, noiseTime * 0.6) * 0.015;
        combinedSDF += flowDistort;
        
        return 1.0 - smoothstep(-0.012, 0.028, combinedSDF);
      }
      
      // ============= FLUID TRAIL (Capsule-based) =============
      // Creates elongated, connected trail stretching in movement direction
      float fluidTrail(vec2 uv, vec2 headPos, vec2 velocity, float speed, float maxLength, float width) {
        if (speed < 0.02) return 0.0;
        
        // Trail extends backward from head position
        float trailLen = maxLength * speed;
        vec2 tailPos = headPos - velocity * trailLen;
        
        // Capsule SDF with tapered width
        float dist = capsuleSDF(uv, headPos, tailPos, width);
        
        // Add subtle wave distortion along the trail
        float waveDistort = snoise(vec2(dot(uv - headPos, velocity) * 20.0, noiseTime)) * 0.01;
        dist += waveDistort;
        
        return 1.0 - smoothstep(-0.01, 0.02, dist);
      }
      
      // ============= SPLASH DROPLETS (SDF-based) =============
      // Creates small satellite droplets that connect to main mass
      float splashDroplets(vec2 uv, vec2 center, vec2 velocity, float speed, float baseRadius, float timeOffset) {
        float splash = 0.0;
        
        // Only create splash when moving
        if (speed < 0.05) return 0.0;
        
        float baseSDF = circleSDF(uv, center, baseRadius * 1.2);
        
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          
          // Droplets positioned with noise, biased toward velocity direction
          vec2 dropOffset = vec2(
            snoise(vec2(fi * 5.0 + timeOffset, noiseTime * 0.5)) * 0.1,
            snoise(vec2(fi * 5.0 + 30.0 + timeOffset, noiseTime * 0.4)) * 0.1
          );
          dropOffset += velocity * (0.1 + fi * 0.05) * speed;
          
          vec2 dropCenter = center + dropOffset;
          float dropRadius = 0.02 + snoise(vec2(fi * 2.0, noiseTime * 0.6)) * 0.01;
          
          float dropSDF = circleSDF(uv, dropCenter, dropRadius);
          
          // Blend with main mass using smooth-min
          float connectedSDF = smin(baseSDF, dropSDF, 0.05);
          
          // Only show the droplet contribution
          float dropMask = 1.0 - smoothstep(-0.01, 0.02, dropSDF);
          splash = max(splash, dropMask * 0.7);
        }
        
        return splash * speed;
      }
      
      void main() {
        // In phantom mode, skip ALL visual fluid effects
        float fluidMask = 0.0;
        
        if (isPhantomMode < 0.5) {
          // Main cursor water blob with connected lobes
          float mainBlob = waterLobes(vUv, cursorBlobPos, 0.14, cursorVelocity, cursorSpeed, 0.0);
          fluidMask += mainBlob * cursorBlobOpacity;
          
          // Fluid trail stretching backward in movement direction
          float trail = fluidTrail(vUv, cursorBlobPos, cursorVelocity, cursorSpeed, 0.25, 0.04);
          fluidMask = max(fluidMask, trail * cursorBlobOpacity * 0.9);
          
          // Splash droplets when moving fast
          float splash = splashDroplets(vUv, cursorBlobPos, cursorVelocity, cursorSpeed, 0.12, 0.0);
          fluidMask = max(fluidMask, splash * cursorBlobOpacity * 0.7);
          
          // Trailing water blobs with smooth SDF blending
          float trail1Blob = waterBlob(vUv, cursorTrail1, 0.11, 1.0);
          float trail1Lobes = waterLobes(vUv, cursorTrail1, 0.08, cursorVelocity, cursorSpeed * 0.5, 1.0);
          fluidMask = max(fluidMask, max(trail1Blob, trail1Lobes) * trailOpacity1 * 0.85);
          
          float trail2Blob = waterBlob(vUv, cursorTrail2, 0.08, 2.0);
          fluidMask = max(fluidMask, trail2Blob * trailOpacity2 * 0.7);
          
          float trail3Blob = waterBlob(vUv, cursorTrail3, 0.06, 3.0);
          fluidMask = max(fluidMask, trail3Blob * trailOpacity3 * 0.55);
          
          float trail4Blob = waterBlob(vUv, cursorTrail4, 0.045, 4.0);
          fluidMask = max(fluidMask, trail4Blob * trailOpacity4 * 0.4);
          
          // Autonomous ambient water blobs - smooth, flowing movement
          float ambient1 = waterLobes(vUv, ambientBlob1Pos, 0.16, vec2(sin(noiseTime * 0.2), cos(noiseTime * 0.25)), 0.1, 5.0);
          fluidMask = max(fluidMask, ambient1 * 0.35);
          
          float ambient2 = waterBlob(vUv, ambientBlob2Pos, 0.13, 6.0);
          fluidMask = max(fluidMask, ambient2 * 0.3);
          
          float ambient3 = waterBlob(vUv, ambientBlob3Pos, 0.10, 7.0);
          fluidMask = max(fluidMask, ambient3 * 0.25);
          
          // Clamp and smooth the combined mask
          fluidMask = clamp(fluidMask, 0.0, 1.0);
        }
        
        // ============= TRANSPARENT REVEAL TO SHOW PAGE BACKGROUND =============
        // The fluid cursor makes the area TRANSPARENT, revealing the actual page marble background
        // Color bands appear at the edge of the transparent area
        
        float coreTransparency = smoothstep(0.4, 0.75, fluidMask);
        
        // Gold and grey bands at the edges - shiny metallic look
        float goldBand = smoothstep(0.2, 0.4, fluidMask) * (1.0 - smoothstep(0.5, 0.7, fluidMask));
        float greyBand = smoothstep(0.05, 0.2, fluidMask) * (1.0 - smoothstep(0.25, 0.45, fluidMask));
        
        // Directional stretch - color bands stretch in movement direction
        vec2 velDir = normalize(cursorVelocity + vec2(0.0001));
        float velMag = length(cursorVelocity);
        vec2 toPixel = vUv - cursorBlobPos;
        float alongVel = dot(toPixel, velDir);
        float directionalStretch = 1.0 + max(0.0, alongVel) * velMag * 8.0;
        
        goldBand *= mix(1.0, directionalStretch, 0.4);
        greyBand *= mix(1.0, directionalStretch, 0.6);
        
        // Shiny shimmer for gold band - animated highlights
        float goldShimmer = sin(noiseTime * 1.2 + vUv.x * 12.0 + vUv.y * 10.0) * 0.2 + 0.9;
        goldShimmer += sin(noiseTime * 2.0 + vUv.y * 18.0) * 0.1;
        vec3 shinyGold = riseGold * goldShimmer * 1.15;
        
        // Build composite color - start black, add bands
        vec3 compositeColor = vec3(0.0);
        compositeColor = mix(compositeColor, revealGrey, greyBand * 0.5);
        compositeColor = mix(compositeColor, shinyGold, goldBand * 0.7);
        
        // Water glow around cursor blob - subtle ambient illumination
        float glowMask = waterBlob(vUv, cursorBlobPos, 0.22, 0.0);
        float outerGlow = smoothstep(0.0, 0.5, glowMask) * (1.0 - smoothstep(0.5, 1.0, glowMask));
        compositeColor += mix(revealGrey, riseGold, 0.3) * outerGlow * cursorBlobOpacity * 0.15;
        
        // Inner white glow at the very center
        float innerGlow = smoothstep(0.6, 0.9, fluidMask);
        compositeColor += revealWhite * innerGlow * 0.3;
        
        // ============= FINAL OUTPUT =============
        // Edge bands with alpha, core is fully transparent to reveal page content
        float edgeBands = goldBand + greyBand;
        
        if (coreTransparency > 0.05) {
          if (edgeBands > 0.01) {
            // Show the edge band colors with partial transparency
            gl_FragColor = vec4(compositeColor, edgeBands * 0.9 + innerGlow * 0.4);
          } else {
            // Core area - fully transparent to show page content (marble, R90 stats, etc.)
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          }
        } else if (edgeBands > 0.01 || outerGlow > 0.01) {
          // Outer glow region
          float glowAlpha = max(edgeBands * 0.8, outerGlow * cursorBlobOpacity * 0.3);
          gl_FragColor = vec4(compositeColor, glowAlpha);
        } else {
          // No effect - fully transparent
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      }
    `

    // Fragment shader for PLAYER ONLY (parallax, kit overlay, etc - NO fluid X-ray)
    const fragmentShader = `
      uniform sampler2D baseTexture;
      uniform sampler2D overlayTexture;
      uniform sampler2D xrayTexture;
      uniform sampler2D shadowTexture;
      uniform sampler2D kitOverlayTexture;
      uniform sampler2D kitDepthTexture;
      uniform sampler2D bwLayerTexture;
      uniform sampler2D whiteMarbleTexture;
      uniform sampler2D depthMap;
      uniform sampler2D depthLightened;
      uniform sampler2D depthDarkened;
      uniform float hasDepthMap;
      uniform float hasDepthLightened;
      uniform float hasDepthDarkened;
      uniform float hasKitOverlay;
      uniform float hasKitDepth;
      uniform float hasShadow;
      uniform float hasBwLayer;
      uniform float hasWhiteMarble;
      uniform float time;
      uniform vec2 mousePos;
      uniform float xrayRadius;
      uniform float userActive;
      uniform vec2 xrayOffset;
      uniform float xrayScale;
      uniform vec2 shootingStarPos;
      uniform float shootingStarActive;
      uniform float kitShinePos;
      uniform float bwLightPhase;
      uniform float bwLayerOpacity;
      uniform float noiseTime;
      
      // Fluid blob uniforms - same as overlay shader
      uniform vec2 cursorBlobPos;
      uniform float cursorBlobOpacity;
      uniform vec2 cursorVelocity;
      uniform float cursorSpeed;
      uniform vec2 cursorTrail1;
      uniform vec2 cursorTrail2;
      uniform vec2 cursorTrail3;
      uniform vec2 cursorTrail4;
      uniform float trailOpacity1;
      uniform float trailOpacity2;
      uniform float trailOpacity3;
      uniform float trailOpacity4;
      uniform vec2 ambientBlob1Pos;
      uniform vec2 ambientBlob2Pos;
      uniform vec2 ambientBlob3Pos;
      
      varying vec2 vUv;
      
      const vec3 goldColor = vec3(0.92, 0.78, 0.45);
      const vec3 brightGold = vec3(1.0, 0.9, 0.5);
      const vec3 warmLight = vec3(1.0, 0.95, 0.85);
      
      // ============= SIMPLEX NOISE FOR FLUID BLOB =============
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                                + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                                dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      // Flow-based FBM - OPTIMIZED (reduced iterations)
      float flowFBM(vec2 p, float t) {
        float value = 0.0;
        float amplitude = 0.5;
        vec2 flow = vec2(t * 0.15, t * 0.1);
        for (int i = 0; i < 3; i++) {
          value += amplitude * snoise(p + flow);
          p *= 2.0;
          flow *= 1.25;
          amplitude *= 0.55;
        }
        return value;
      }
      
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * k * 0.25;
      }
      
      float circleSDF(vec2 p, vec2 center, float radius) {
        return length(p - center) - radius;
      }
      
      // Optimized waterBlob for fragment shader
      float waterBlob(vec2 uv, vec2 center, float baseRadius, float timeOffset) {
        vec2 flowDistort = vec2(
          flowFBM(uv * 6.0 + timeOffset, noiseTime * 0.8) * 0.03,
          flowFBM(uv * 6.0 + timeOffset + 100.0, noiseTime * 0.7) * 0.03
        );
        vec2 distortedUV = uv + flowDistort;
        float dist = circleSDF(distortedUV, center, baseRadius);
        float edgeWave = flowFBM(uv * 10.0 + center * 5.0 + timeOffset, noiseTime * 0.5) * 0.02;
        dist += edgeWave;
        return 1.0 - smoothstep(-0.015, 0.03, dist);
      }
      
      // Optimized waterLobes (reduced from 4 to 3 lobes)
      float waterLobes(vec2 uv, vec2 center, float baseRadius, vec2 velocity, float speed, float timeOffset) {
        float combinedSDF = circleSDF(uv, center, baseRadius);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 lobeOffset = vec2(
            snoise(vec2(fi * 3.5 + timeOffset, noiseTime * 0.35)) * 0.12,
            snoise(vec2(fi * 3.5 + 50.0 + timeOffset, noiseTime * 0.28)) * 0.12
          );
          if (speed > 0.02) {
            lobeOffset += velocity * (0.07 + fi * 0.025);
          }
          vec2 lobeCenter = center + lobeOffset;
          float lobeRadius = baseRadius * (0.35 + snoise(vec2(fi, noiseTime * 0.45)) * 0.18);
          float lobeSDF = circleSDF(uv, lobeCenter, lobeRadius);
          combinedSDF = smin(combinedSDF, lobeSDF, 0.06);
        }
        float flowDistort = flowFBM(uv * 8.0 + timeOffset, noiseTime * 0.6) * 0.015;
        combinedSDF += flowDistort;
        return 1.0 - smoothstep(-0.012, 0.028, combinedSDF);
      }
      
      float capsuleSDF(vec2 p, vec2 a, vec2 b, float r) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / (dot(ba, ba) + 0.0001), 0.0, 1.0);
        return length(pa - ba * h) - r;
      }
      
      float fluidTrail(vec2 uv, vec2 headPos, vec2 velocity, float speed, float maxLength, float width) {
        if (speed < 0.02) return 0.0;
        float trailLen = maxLength * speed;
        vec2 tailPos = headPos - velocity * trailLen;
        float dist = capsuleSDF(uv, headPos, tailPos, width);
        float waveDistort = snoise(vec2(dot(uv - headPos, velocity) * 20.0, noiseTime)) * 0.01;
        dist += waveDistort;
        return 1.0 - smoothstep(-0.01, 0.02, dist);
      }
      
      // Optimized splash droplets (reduced from 4 to 3)
      float splashDroplets(vec2 uv, vec2 center, vec2 velocity, float speed, float baseRadius, float timeOffset) {
        float splash = 0.0;
        if (speed < 0.05) return 0.0;
        float baseSDF = circleSDF(uv, center, baseRadius * 1.2);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 dropOffset = vec2(
            snoise(vec2(fi * 5.0 + timeOffset, noiseTime * 0.5)) * 0.1,
            snoise(vec2(fi * 5.0 + 30.0 + timeOffset, noiseTime * 0.4)) * 0.1
          );
          dropOffset += velocity * (0.1 + fi * 0.05) * speed;
          vec2 dropCenter = center + dropOffset;
          float dropRadius = 0.02 + snoise(vec2(fi * 2.0, noiseTime * 0.6)) * 0.01;
          float dropSDF = circleSDF(uv, dropCenter, dropRadius);
          float dropMask = 1.0 - smoothstep(-0.01, 0.02, dropSDF);
          splash = max(splash, dropMask * 0.7);
        }
        return splash * speed;
      }
      
      // Calculate full fluid mask matching overlay shader
      float calculateFluidMask(vec2 uv) {
        float fluidMask = 0.0;
        
        // Main cursor water blob with connected lobes
        float mainBlob = waterLobes(uv, cursorBlobPos, 0.14, cursorVelocity, cursorSpeed, 0.0);
        fluidMask += mainBlob * cursorBlobOpacity;
        
        // Fluid trail stretching backward
        float trail = fluidTrail(uv, cursorBlobPos, cursorVelocity, cursorSpeed, 0.25, 0.04);
        fluidMask = max(fluidMask, trail * cursorBlobOpacity * 0.9);
        
        // Splash droplets when moving fast
        float splash = splashDroplets(uv, cursorBlobPos, cursorVelocity, cursorSpeed, 0.12, 0.0);
        fluidMask = max(fluidMask, splash * cursorBlobOpacity * 0.7);
        
        // Trailing water blobs
        float trail1Blob = waterBlob(uv, cursorTrail1, 0.11, 1.0);
        float trail1Lobes = waterLobes(uv, cursorTrail1, 0.08, cursorVelocity, cursorSpeed * 0.5, 1.0);
        fluidMask = max(fluidMask, max(trail1Blob, trail1Lobes) * trailOpacity1 * 0.85);
        
        float trail2Blob = waterBlob(uv, cursorTrail2, 0.08, 2.0);
        fluidMask = max(fluidMask, trail2Blob * trailOpacity2 * 0.7);
        
        float trail3Blob = waterBlob(uv, cursorTrail3, 0.06, 3.0);
        fluidMask = max(fluidMask, trail3Blob * trailOpacity3 * 0.55);
        
        float trail4Blob = waterBlob(uv, cursorTrail4, 0.045, 4.0);
        fluidMask = max(fluidMask, trail4Blob * trailOpacity4 * 0.4);
        
        // Autonomous ambient water blobs
        float ambient1 = waterLobes(uv, ambientBlob1Pos, 0.16, vec2(sin(noiseTime * 0.2), cos(noiseTime * 0.25)), 0.1, 5.0);
        fluidMask = max(fluidMask, ambient1 * 0.35);
        
        float ambient2 = waterBlob(uv, ambientBlob2Pos, 0.13, 6.0);
        fluidMask = max(fluidMask, ambient2 * 0.3);
        
        float ambient3 = waterBlob(uv, ambientBlob3Pos, 0.10, 7.0);
        fluidMask = max(fluidMask, ambient3 * 0.25);
        
        return clamp(fluidMask, 0.0, 1.0);
      }
      
      void main() {
        // Sample all depth maps and combine
        float baseDepth = 0.5;
        float boostAmount = 0.0;
        float reduceAmount = 0.0;
        
        if (hasDepthMap > 0.5) {
          baseDepth = dot(texture2D(depthMap, vUv).rgb, vec3(0.299, 0.587, 0.114));
        }
        
        if (hasDepthLightened > 0.5) {
          boostAmount = dot(texture2D(depthLightened, vUv).rgb, vec3(0.299, 0.587, 0.114));
        }
        
        if (hasDepthDarkened > 0.5) {
          reduceAmount = 1.0 - dot(texture2D(depthDarkened, vUv).rgb, vec3(0.299, 0.587, 0.114));
        }
        
        float parallaxStrength = 0.16 + (boostAmount * 0.02) - (reduceAmount * 0.01);
        parallaxStrength = clamp(parallaxStrength, 0.13, 0.19);
        
        float combinedDepth = baseDepth * (1.0 + boostAmount * 0.15 - reduceAmount * 0.1);
        combinedDepth = clamp(combinedDepth, 0.2, 1.0);
        
        float bottomRightMask = smoothstep(0.45, 0.65, vUv.x) * smoothstep(0.55, 0.30, vUv.y);
        combinedDepth *= (1.0 - bottomRightMask);
        
        vec2 parallaxOffset = (mousePos - vec2(0.5)) * combinedDepth * parallaxStrength;
        vec2 parallaxUV = vUv - parallaxOffset;
        
        vec4 baseColor = texture2D(baseTexture, parallaxUV);
        vec4 overlayColor = texture2D(overlayTexture, parallaxUV);
        
        float alpha = baseColor.a;
        if (alpha < 0.01) discard;
        
        // Dynamic shadow
        float shadowAmount = (mousePos.x - 0.5) * 0.4;
        shadowAmount = clamp(shadowAmount, -0.15, 0.25);
        vec3 shadedBase = baseColor.rgb * (1.0 - shadowAmount);
        
        // Use base color directly without gold gloss overlay
        vec3 compositeColor = shadedBase;
        
        // B&W layer with animated gloss
        if (hasBwLayer > 0.5 && bwLayerOpacity > 0.01) {
          vec4 bwColor = texture2D(bwLayerTexture, parallaxUV);
          float bwBrightness = dot(bwColor.rgb, vec3(0.299, 0.587, 0.114));
          
          float sweepAngle = 0.7;
          float sweepPos = vUv.x * cos(sweepAngle) + vUv.y * sin(sweepAngle);
          float sweepPhase = mod(bwLightPhase * 0.3, 2.0);
          float sweepCenter = sweepPhase - 0.5;
          
          float glossWidth = 0.15;
          float glossDist = abs(sweepPos - sweepCenter);
          float glossStrength = 1.0 - smoothstep(0.0, glossWidth, glossDist);
          glossStrength = pow(glossStrength, 2.0);
          
          float coreStrength = 1.0 - smoothstep(0.0, glossWidth * 0.2, glossDist);
          float lightMask = smoothstep(0.3, 0.6, bwBrightness);
          
          vec3 glossCore = vec3(1.0, 1.0, 1.0) * coreStrength * lightMask * 1.2;
          vec3 glossEdge = brightGold * glossStrength * lightMask * 0.8;
          vec3 glossEffect = (glossCore + glossEdge) * bwColor.a;
          
          float shimmer = sin(bwLightPhase * 4.0 + bwBrightness * 10.0) * 0.5 + 0.5;
          vec3 shimmerEffect = warmLight * shimmer * smoothstep(0.5, 0.8, bwBrightness) * 0.3 * bwColor.a;
          
          vec3 totalGloss = (glossEffect + shimmerEffect) * bwLayerOpacity;
          compositeColor = compositeColor + totalGloss;
        }
        
        // Store the full color version before converting to greyscale
        vec3 fullColorComposite = compositeColor;
        
        // Convert base to greyscale for normal display (color revealed through x-ray)
        float greyValue = dot(compositeColor, vec3(0.299, 0.587, 0.114));
        vec3 greyscaleComposite = vec3(greyValue);
        
        // ============= FLUID BLOB X-RAY (matches overlay shader) =============
        float mouseXrayMask = calculateFluidMask(vUv);
        
        // Sample the xray texture (yellow kit image) with parallax
        vec4 xrayColor = texture2D(xrayTexture, parallaxUV);
        
        // X-ray reveals the YELLOW KIT image from xrayTexture
        // Use the xray image where it has content, blend with full color elsewhere
        vec3 xrayReveal = mix(fullColorComposite, xrayColor.rgb, xrayColor.a);
        vec3 finalColor = mix(greyscaleComposite, xrayReveal, mouseXrayMask);
        
        // Edge rim light
        float rimLeft = smoothstep(0.1, 0.0, vUv.x) * max(0.0, shadowAmount) * 0.3;
        float rimRight = smoothstep(0.9, 1.0, vUv.x) * max(0.0, -shadowAmount) * 0.3;
        finalColor += goldColor * (rimLeft + rimRight) * alpha;
        
        // Depth-based shading
        if (hasDepthMap > 0.5) {
          float depthShade = combinedDepth * 0.1 + 0.95;
          finalColor *= depthShade;
        }
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `


    // Initialize Three.js
    const initScene = async () => {
      // Validate container dimensions before proceeding
      if (!container.clientWidth || !container.clientHeight) {
        console.warn('Player3DEffect: Container has no dimensions, retrying...');
        // Retry after a short delay
        setTimeout(initScene, 100);
        return;
      }

      const images = await loadImages()
      if (!images || !images.baseImage || !images.overlayImage || !images.xrayImage) {
        setIsLoading(false)
        return
      }

      const { baseImage, overlayImage, xrayImage, depthMap, depthLightened, depthDarkened, kitOverlay, kitDepth, shadowImage, bwLayerImage, whiteMarbleImage } = images

      const scene = new THREE.Scene()
      
      const containerWidth = container.clientWidth || 1;
      const containerHeight = container.clientHeight || 1;
      const aspect = containerWidth / containerHeight
      const frustumSize = 2
      const camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        100
      )
      camera.position.z = 5

      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        premultipliedAlpha: false
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(containerWidth, containerHeight)
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      const baseTexture = new THREE.Texture(baseImage)
      baseTexture.needsUpdate = true
      baseTexture.minFilter = THREE.LinearFilter
      baseTexture.magFilter = THREE.LinearFilter

      const overlayTexture = new THREE.Texture(overlayImage)
      overlayTexture.needsUpdate = true
      overlayTexture.minFilter = THREE.LinearFilter
      overlayTexture.magFilter = THREE.LinearFilter

      const xrayTexture = new THREE.Texture(xrayImage)
      xrayTexture.needsUpdate = true
      xrayTexture.minFilter = THREE.LinearFilter
      xrayTexture.magFilter = THREE.LinearFilter

      // Create depth map textures
      let depthTexture: THREE.Texture | null = null
      let depthLightenedTexture: THREE.Texture | null = null
      let depthDarkenedTexture: THREE.Texture | null = null
      
      if (depthMap) {
        depthTexture = new THREE.Texture(depthMap)
        depthTexture.needsUpdate = true
        depthTexture.minFilter = THREE.LinearFilter
        depthTexture.magFilter = THREE.LinearFilter
      }
      
      if (depthLightened) {
        depthLightenedTexture = new THREE.Texture(depthLightened)
        depthLightenedTexture.needsUpdate = true
        depthLightenedTexture.minFilter = THREE.LinearFilter
        depthLightenedTexture.magFilter = THREE.LinearFilter
      }
      
      if (depthDarkened) {
        depthDarkenedTexture = new THREE.Texture(depthDarkened)
        depthDarkenedTexture.needsUpdate = true
        depthDarkenedTexture.minFilter = THREE.LinearFilter
        depthDarkenedTexture.magFilter = THREE.LinearFilter
      }
      
      // Create kit overlay and depth textures
      let kitOverlayTexture: THREE.Texture | null = null
      let kitDepthTexture: THREE.Texture | null = null
      let shadowTexture: THREE.Texture | null = null
      
      if (kitOverlay) {
        kitOverlayTexture = new THREE.Texture(kitOverlay)
        kitOverlayTexture.needsUpdate = true
        kitOverlayTexture.minFilter = THREE.LinearFilter
        kitOverlayTexture.magFilter = THREE.LinearFilter
      }
      
      if (kitDepth) {
        kitDepthTexture = new THREE.Texture(kitDepth)
        kitDepthTexture.needsUpdate = true
        kitDepthTexture.minFilter = THREE.LinearFilter
        kitDepthTexture.magFilter = THREE.LinearFilter
      }
      
      if (shadowImage) {
        shadowTexture = new THREE.Texture(shadowImage)
        shadowTexture.needsUpdate = true
        shadowTexture.minFilter = THREE.LinearFilter
        shadowTexture.magFilter = THREE.LinearFilter
      }
      
      // Create B&W layer texture
      let bwLayerTexture: THREE.Texture | null = null
      
      if (bwLayerImage) {
        bwLayerTexture = new THREE.Texture(bwLayerImage)
        bwLayerTexture.needsUpdate = true
        bwLayerTexture.minFilter = THREE.LinearFilter
        bwLayerTexture.magFilter = THREE.LinearFilter
      }
      
      // Create white marble texture
      let whiteMarbleTexture: THREE.Texture | null = null
      
      if (whiteMarbleImage) {
        whiteMarbleTexture = new THREE.Texture(whiteMarbleImage)
        whiteMarbleTexture.needsUpdate = true
        whiteMarbleTexture.minFilter = THREE.LinearFilter
        whiteMarbleTexture.magFilter = THREE.LinearFilter
        whiteMarbleTexture.wrapS = THREE.RepeatWrapping
        whiteMarbleTexture.wrapT = THREE.RepeatWrapping
      }

      const isMobile = container.clientWidth < 768
      const imgAspect = baseImage.width / baseImage.height
      
      let planeHeight = isMobile ? 1.4 : 1.6
      let planeWidth = planeHeight * imgAspect

      // ============= PLAYER MESH UNIFORMS =============
      const uniforms = {
        baseTexture: { value: baseTexture },
        overlayTexture: { value: overlayTexture },
        xrayTexture: { value: xrayTexture },
        shadowTexture: { value: shadowTexture || baseTexture },
        kitOverlayTexture: { value: kitOverlayTexture || baseTexture },
        kitDepthTexture: { value: kitDepthTexture || baseTexture },
        depthMap: { value: depthTexture || baseTexture },
        depthLightened: { value: depthLightenedTexture || baseTexture },
        depthDarkened: { value: depthDarkenedTexture || baseTexture },
        hasDepthMap: { value: depthTexture ? 1.0 : 0.0 },
        hasDepthLightened: { value: depthLightenedTexture ? 1.0 : 0.0 },
        hasDepthDarkened: { value: depthDarkenedTexture ? 1.0 : 0.0 },
        hasKitOverlay: { value: kitOverlayTexture ? 1.0 : 0.0 },
        hasKitDepth: { value: kitDepthTexture ? 1.0 : 0.0 },
        hasShadow: { value: shadowTexture ? 1.0 : 0.0 },
        bwLayerTexture: { value: bwLayerTexture || baseTexture },
        hasBwLayer: { value: bwLayerTexture ? 1.0 : 0.0 },
        whiteMarbleTexture: { value: whiteMarbleTexture || baseTexture },
        hasWhiteMarble: { value: whiteMarbleTexture ? 1.0 : 0.0 },
        time: { value: 0 },
        mousePos: { value: new THREE.Vector2(0.5, 0.5) },
        autoPos: { value: new THREE.Vector2(0.5, 0.55) },
        resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        xrayRadius: { value: isMobile ? 0.06 : 0.08 },
        depthScale: { value: 0.15 },
        playerCenter: { value: new THREE.Vector2(0.5, 0.55) },
        userActive: { value: 0.0 },
        xrayOffset: { value: new THREE.Vector2(0.0, 0.0) },
        xrayScale: { value: 1.0 },
        shootingStarPos: { value: new THREE.Vector2(-0.5, -0.5) },
        shootingStarActive: { value: 0.0 },
        kitShinePos: { value: -1.0 },
        bwLightPhase: { value: 0.0 },
        bwLayerOpacity: { value: 0.0 },
        // Fluid blob uniforms - synced with overlay shader
        noiseTime: { value: 0.0 },
        cursorBlobPos: { value: new THREE.Vector2(-1, -1) },
        cursorBlobOpacity: { value: 0.0 },
        cursorVelocity: { value: new THREE.Vector2(0, 0) },
        cursorSpeed: { value: 0.0 },
        cursorTrail1: { value: new THREE.Vector2(-1, -1) },
        cursorTrail2: { value: new THREE.Vector2(-1, -1) },
        cursorTrail3: { value: new THREE.Vector2(-1, -1) },
        cursorTrail4: { value: new THREE.Vector2(-1, -1) },
        trailOpacity1: { value: 0.0 },
        trailOpacity2: { value: 0.0 },
        trailOpacity3: { value: 0.0 },
        trailOpacity4: { value: 0.0 },
        ambientBlob1Pos: { value: new THREE.Vector2(0.3, 0.4) },
        ambientBlob2Pos: { value: new THREE.Vector2(0.7, 0.6) },
        ambientBlob3Pos: { value: new THREE.Vector2(0.5, 0.3) }
      }

      // ============= X-RAY OVERLAY UNIFORMS (full-viewport) =============
      const xrayOverlayUniforms = {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        noiseTime: { value: 0.0 },
        fluidPhase: { value: 0.0 },
        isPhantomMode: { value: 0.0 },
        cursorBlobPos: { value: new THREE.Vector2(-1, -1) },
        cursorBlobOpacity: { value: 0.0 },
        cursorVelocity: { value: new THREE.Vector2(0, 0) },
        cursorSpeed: { value: 0.0 },
        cursorTrail1: { value: new THREE.Vector2(-1, -1) },
        cursorTrail2: { value: new THREE.Vector2(-1, -1) },
        cursorTrail3: { value: new THREE.Vector2(-1, -1) },
        cursorTrail4: { value: new THREE.Vector2(-1, -1) },
        trailOpacity1: { value: 0.0 },
        trailOpacity2: { value: 0.0 },
        trailOpacity3: { value: 0.0 },
        trailOpacity4: { value: 0.0 },
        ambientBlob1Pos: { value: new THREE.Vector2(0.3, 0.4) },
        ambientBlob2Pos: { value: new THREE.Vector2(0.7, 0.6) },
        ambientBlob3Pos: { value: new THREE.Vector2(0.5, 0.3) },
        playerCenter: { value: new THREE.Vector2(0.5, 0.55) },
        playerSize: { value: new THREE.Vector2(planeWidth, planeHeight) }
      }

      // ============= PLAYER MESH =============
      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1)
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })

      const playerMesh = new THREE.Mesh(geometry, material)
      playerMesh.position.x = -0.02
      playerMesh.position.y = isMobile ? 0.15 : 0.05
      playerMesh.position.z = 0 // Player at z=0
      scene.add(playerMesh)

      // ============= FULL-VIEWPORT X-RAY OVERLAY MESH =============
      // This plane covers the entire viewport and renders the fluid X-ray effect
      const overlayWidth = frustumSize * aspect
      const overlayHeight = frustumSize
      const overlayGeometry = new THREE.PlaneGeometry(overlayWidth, overlayHeight, 1, 1)
      const overlayMaterial = new THREE.ShaderMaterial({
        uniforms: xrayOverlayUniforms,
        vertexShader,
        fragmentShader: xrayOverlayFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false
      })

      const xrayOverlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial)
      xrayOverlayMesh.position.z = 1 // Overlay in front of player
      scene.add(xrayOverlayMesh)

      sceneRef.current = {
        scene,
        camera,
        renderer,
        playerMesh,
        xrayMesh: null,
        xrayOverlayMesh,
        uniforms,
        xrayOverlayUniforms,
        animationId: 0
      }

      setIsLoading(false)

      // Animation variables
      let autoTime = 0
      const autoRevealSpeed = 0.3
      let xrayIntensity = 0
      
      // Kit shine animation
      let shineCycleTime = 0
      const SHINE_CYCLE = 12
      const SHINE_DURATION = 0.8
      
      // Shooting star animation
      let starCycleTime = 0
      const STAR_CYCLE = 15
      const STAR_DURATION = 1.5
      
      // Cursor blob tracking for organic fluid reveal
      const cursorBlob = { x: 0.5, y: 0.5 }
      const cursorBlobTarget = { x: 0.5, y: 0.5 }
      const prevCursorPos = { x: 0.5, y: 0.5 }
      let cursorOpacity = 0
      
      // Velocity tracking
      let velocity = { x: 0, y: 0 }
      let speed = 0
      
      // Trailing blobs
      const trail1 = { x: 0.5, y: 0.5 }
      const trail2 = { x: 0.5, y: 0.5 }
      const trail3 = { x: 0.5, y: 0.5 }
      const trail4 = { x: 0.5, y: 0.5 }
      let trail1Opacity = 0
      let trail2Opacity = 0
      let trail3Opacity = 0
      let trail4Opacity = 0
      
      let lastCursorMoveTime = Date.now()

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        
        const currentTime = Date.now()
        const deltaTime = 0.016
        uniforms.time.value += deltaTime
        xrayOverlayUniforms.time.value += deltaTime
        xrayOverlayUniforms.noiseTime.value += deltaTime
        xrayOverlayUniforms.fluidPhase.value += deltaTime * 0.5
        autoTime += deltaTime
        starCycleTime += deltaTime
        shineCycleTime += deltaTime
        
        // === B&W LAYER FADE ANIMATION ===
        uniforms.bwLightPhase.value += deltaTime * 1.2
        const BW_FADE_CYCLE = 6.0
        const bwCycleTime = (uniforms.time.value % BW_FADE_CYCLE)
        if (bwCycleTime < 3.0) {
          uniforms.bwLayerOpacity.value = bwCycleTime / 3.0
        } else {
          uniforms.bwLayerOpacity.value = 1.0 - ((bwCycleTime - 3.0) / 3.0)
        }
        
        if (starCycleTime >= STAR_CYCLE) {
          starCycleTime = 0
        }
        if (shineCycleTime >= SHINE_CYCLE) {
          shineCycleTime = 0
        }
        
        // === FLUID X-RAY REVEAL ===
        const timeSinceCursorMove = currentTime - lastCursorMoveTime
        
        // Use GLOBAL window coordinates (normalized 0-1 across entire viewport)
        // This ensures x-ray effect responds to cursor ANYWHERE on the page
        const globalMouseX = mouseRef.current.x / window.innerWidth
        const globalMouseY = 1 - (mouseRef.current.y / window.innerHeight)
        
        // For the overlay, we use screen-space coordinates directly (0-1)
        let mouseX = globalMouseX
        let mouseY = globalMouseY
        
        // Check if user is actively interacting
        const userTimeSinceInteraction = currentTime - lastInteractionRef.current
        const isUserActive = userTimeSinceInteraction < 500
        
        
        // Update cursor target and track velocity (for real user input)
        if (isUserActive) {
          if (cursorBlobTarget.x >= 0) {
            velocity.x = mouseX - cursorBlobTarget.x
            velocity.y = mouseY - cursorBlobTarget.y
            speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            
            if (speed > 0.001) {
              velocity.x /= speed
              velocity.y /= speed
            }
            speed = Math.min(speed * 15, 1.0)
          }
          
          cursorBlobTarget.x = mouseX
          cursorBlobTarget.y = mouseY
          lastCursorMoveTime = currentTime
        }
        
        // Store previous position
        prevCursorPos.x = cursorBlob.x
        prevCursorPos.y = cursorBlob.y
        
        // Smooth cursor blob following
        cursorBlob.x += (cursorBlobTarget.x - cursorBlob.x) * 0.12
        cursorBlob.y += (cursorBlobTarget.y - cursorBlob.y) * 0.12
        
        // Cascading trail positions
        trail1.x += (cursorBlob.x - trail1.x) * 0.08
        trail1.y += (cursorBlob.y - trail1.y) * 0.08
        trail2.x += (trail1.x - trail2.x) * 0.06
        trail2.y += (trail1.y - trail2.y) * 0.06
        trail3.x += (trail2.x - trail3.x) * 0.04
        trail3.y += (trail2.y - trail3.y) * 0.04
        trail4.x += (trail3.x - trail4.x) * 0.025
        trail4.y += (trail3.y - trail4.y) * 0.025
        
        // Fade out after no movement
        if (timeSinceCursorMove > 1000) {
          cursorOpacity = Math.max(0, cursorOpacity * 0.97)
          trail1Opacity = Math.max(0, trail1Opacity * 0.975)
          trail2Opacity = Math.max(0, trail2Opacity * 0.98)
          trail3Opacity = Math.max(0, trail3Opacity * 0.985)
          trail4Opacity = Math.max(0, trail4Opacity * 0.99)
          speed *= 0.92
        } else {
          cursorOpacity = Math.min(1, cursorOpacity + 0.15)
          trail1Opacity = Math.min(0.85, trail1Opacity + 0.12)
          trail2Opacity = Math.min(0.7, trail2Opacity + 0.09)
          trail3Opacity = Math.min(0.55, trail3Opacity + 0.07)
          trail4Opacity = Math.min(0.4, trail4Opacity + 0.05)
        }
        
        // Update X-RAY OVERLAY uniforms (full-viewport effect)
        xrayOverlayUniforms.cursorBlobPos.value.set(cursorBlob.x, cursorBlob.y)
        xrayOverlayUniforms.cursorBlobOpacity.value = cursorOpacity
        xrayOverlayUniforms.cursorVelocity.value.set(velocity.x, velocity.y)
        xrayOverlayUniforms.cursorSpeed.value = speed
        xrayOverlayUniforms.cursorTrail1.value.set(trail1.x, trail1.y)
        xrayOverlayUniforms.cursorTrail2.value.set(trail2.x, trail2.y)
        xrayOverlayUniforms.cursorTrail3.value.set(trail3.x, trail3.y)
        xrayOverlayUniforms.cursorTrail4.value.set(trail4.x, trail4.y)
        xrayOverlayUniforms.trailOpacity1.value = trail1Opacity
        xrayOverlayUniforms.trailOpacity2.value = trail2Opacity
        xrayOverlayUniforms.trailOpacity3.value = trail3Opacity
        xrayOverlayUniforms.trailOpacity4.value = trail4Opacity
        
        // Disable phantom mode - only cursor interaction
        xrayOverlayUniforms.isPhantomMode.value = 0.0
        
        // Hide ambient blobs by moving them off-screen
        xrayOverlayUniforms.ambientBlob1Pos.value.set(-2, -2)
        xrayOverlayUniforms.ambientBlob2Pos.value.set(-2, -2)
        xrayOverlayUniforms.ambientBlob3Pos.value.set(-2, -2)
        
        // Sync PLAYER MESH uniforms with overlay for matching fluid X-ray reveal
        uniforms.noiseTime.value = xrayOverlayUniforms.noiseTime.value
        uniforms.cursorBlobPos.value.set(cursorBlob.x, cursorBlob.y)
        uniforms.cursorBlobOpacity.value = cursorOpacity
        uniforms.cursorVelocity.value.set(velocity.x, velocity.y)
        uniforms.cursorSpeed.value = speed
        uniforms.cursorTrail1.value.set(trail1.x, trail1.y)
        uniforms.cursorTrail2.value.set(trail2.x, trail2.y)
        uniforms.cursorTrail3.value.set(trail3.x, trail3.y)
        uniforms.cursorTrail4.value.set(trail4.x, trail4.y)
        uniforms.trailOpacity1.value = trail1Opacity
        uniforms.trailOpacity2.value = trail2Opacity
        uniforms.trailOpacity3.value = trail3Opacity
        uniforms.trailOpacity4.value = trail4Opacity
        uniforms.ambientBlob1Pos.value.set(-2, -2)
        uniforms.ambientBlob2Pos.value.set(-2, -2)
        uniforms.ambientBlob3Pos.value.set(-2, -2)
        
        // === KIT SHINE ANIMATION ===
        if (shineCycleTime < SHINE_DURATION) {
          const shineProgress = shineCycleTime / SHINE_DURATION
          const easedShine = 1 - Math.pow(1 - shineProgress, 2)
          const shinePos = -0.2 + easedShine * 1.4
          uniforms.kitShinePos.value = shinePos
        } else {
          uniforms.kitShinePos.value = -1.0
        }
        
        // === SHOOTING STAR ANIMATION ===
        if (starCycleTime < STAR_DURATION) {
          const progress = starCycleTime / STAR_DURATION
          const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
          
          const startAngle = Math.PI * 1.5
          const endAngle = Math.PI * 2
          const currentAngle = startAngle + (endAngle - startAngle) * easedProgress
          
          const arcRadiusX = 0.85
          const arcRadiusY = 0.75
          const centerX = 0.5
          const centerY = 0.5
          
          const starX = centerX + Math.cos(currentAngle) * arcRadiusX
          const starY = centerY + Math.sin(currentAngle) * arcRadiusY
          
          uniforms.shootingStarPos.value.set(starX, starY)
          uniforms.shootingStarActive.value = 1.0
        } else {
          uniforms.shootingStarActive.value = 0.0
          uniforms.shootingStarPos.value.set(-1, -1)
        }
        
        const timeSinceInteraction = currentTime - lastInteractionRef.current
        const isUserInteracting = timeSinceInteraction < 2000
        
        // Auto-reveal pattern
        const a = 3, b = 2
        const delta = Math.PI / 4
        const baseX = 0.5
        const baseY = 0.55
        const rangeX = 0.15
        const rangeY = 0.2
        
        const x1 = Math.sin(autoTime * autoRevealSpeed * a + delta) * rangeX
        const y1 = Math.sin(autoTime * autoRevealSpeed * b) * rangeY
        const wobbleX = Math.sin(autoTime * 0.7) * 0.03
        const wobbleY = Math.cos(autoTime * 0.5) * 0.04
        
        const autoX = baseX + x1 + wobbleX
        const autoY = baseY + y1 + wobbleY
        
        autoRevealPosRef.current.x += (autoX - autoRevealPosRef.current.x) * 0.05
        autoRevealPosRef.current.y += (autoY - autoRevealPosRef.current.y) * 0.05
        
        uniforms.autoPos.value.set(autoRevealPosRef.current.x, autoRevealPosRef.current.y)
        
        // Handle user interaction for player mesh x-ray
        if (isUserInteracting) {
          uniforms.userActive.value = Math.min(1, uniforms.userActive.value + 0.1)
          
          // Map screen coordinates to player-local coordinates for the player mesh shader
          const rect = container.getBoundingClientRect()
          const playerCenterX = (rect.left + rect.width / 2) / window.innerWidth
          const playerCenterY = 1 - ((rect.top + rect.height / 2) / window.innerHeight)
          const scaleX = window.innerWidth / rect.width
          const scaleY = window.innerHeight / rect.height
          
          const localMouseX = 0.5 + (mouseX - playerCenterX) * scaleX
          const localMouseY = 0.5 + (mouseY - playerCenterY) * scaleY
          
          uniforms.mousePos.value.set(localMouseX, localMouseY)
          xrayIntensity = Math.min(1, xrayIntensity + 0.05)
        } else {
          uniforms.userActive.value = Math.max(0, uniforms.userActive.value - 0.05)
          xrayIntensity = 0.7 + Math.sin(autoTime * 0.5) * 0.3
        }
        
        // ONLY show background stats on REAL user interaction, NOT phantom
        if (isUserInteracting) {
          setXrayState({
            isActive: true,
            intensity: xrayIntensity,
            position: { x: cursorBlob.x, y: cursorBlob.y }
          })
        } else {
          setXrayState({
            isActive: false,
            intensity: 0,
            position: { x: 0.5, y: 0.5 }
          })
        }
        
        renderer.render(scene, camera)
        
        if (sceneRef.current) {
          sceneRef.current.animationId = animationId
        }
      }

      animate()
    }

    initScene()

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      lastInteractionRef.current = Date.now()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lastInteractionRef.current = Date.now()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lastInteractionRef.current = Date.now()
      }
    }

    const handleResize = () => {
      if (!sceneRef.current || !container) return
      
      // Validate dimensions
      const containerWidth = container.clientWidth || 1;
      const containerHeight = container.clientHeight || 1;
      if (containerWidth < 10 || containerHeight < 10) return;
      
      const { camera, renderer, uniforms, xrayOverlayUniforms, playerMesh, xrayOverlayMesh } = sceneRef.current
      const aspect = containerWidth / containerHeight
      const frustumSize = 2
      
      camera.left = -frustumSize * aspect / 2
      camera.right = frustumSize * aspect / 2
      camera.top = frustumSize / 2
      camera.bottom = -frustumSize / 2
      camera.updateProjectionMatrix()
      
      renderer.setSize(containerWidth, containerHeight)
      uniforms.resolution.value.set(containerWidth, containerHeight)
      xrayOverlayUniforms.resolution.value.set(containerWidth, containerHeight)
      
      const isMobile = containerWidth < 768
      if (playerMesh) {
        playerMesh.position.y = isMobile ? 0.15 : 0.05
      }
      
      // Resize the overlay mesh to match new viewport
      if (xrayOverlayMesh) {
        const overlayWidth = frustumSize * aspect
        const overlayHeight = frustumSize
        xrayOverlayMesh.geometry.dispose()
        xrayOverlayMesh.geometry = new THREE.PlaneGeometry(overlayWidth, overlayHeight, 1, 1)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("resize", handleResize)

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
        sceneRef.current.renderer.dispose()
        if (container && sceneRef.current.renderer.domElement) {
          container.removeChild(sceneRef.current.renderer.domElement)
        }
      }
    }
  }, [loadImages, setXrayState])

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full cursor-none ${className}`}
    >
      {/* Show static base image immediately while Three.js loads */}
      {isLoading && (
        <img 
          src={`/assets/${imagePrefix}-base.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </div>
  )
}
