"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import JSZip from "jszip"
import { useXRay } from "@/contexts/XRayContext"

interface Player3DEffectProps {
  className?: string
}

export const Player3DEffect = ({ className = "" }: Player3DEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { setXrayState } = useXRay()
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.OrthographicCamera
    renderer: THREE.WebGLRenderer
    playerMesh: THREE.Mesh | null
    xrayMesh: THREE.Mesh | null
    uniforms: any
    animationId: number
  } | null>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const lastInteractionRef = useRef(0)
  const autoRevealPosRef = useRef({ x: 0.5, y: 0.5 })

  // Utility to yield to main thread, preventing long tasks
  const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  // Load images from zip + custom depth maps
  const loadImages = useCallback(async () => {
    try {
      // Load all depth maps in parallel
      const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
      })

      const depthMapPromise = loadImage("/assets/player-depth-map.png")
      const depthLightenedPromise = loadImage("/assets/player-depth-lightened.png")
      const depthDarkenedPromise = loadImage("/assets/player-depth-darkened.png")
      const kitOverlayPromise = loadImage("/assets/player-kit-overlay.png")
      const kitDepthPromise = loadImage("/assets/player-kit-depth.png")
      const shadowPromise = loadImage("/assets/player-shadow.png")
      const bwLayerPromise = loadImage("/assets/player-bw-layer.png")
      
      // Import white marble from assets
      const whiteMarbleModule = await import("@/assets/white-marble.png")
      const whiteMarblePromise = loadImage(whiteMarbleModule.default)

      // Yield before heavy zip processing
      await yieldToMain();

      const response = await fetch("/assets/Website_Hero_RISE.zip")
      const zipData = await response.arrayBuffer()
      
      // Yield after fetch, before JSZip processing
      await yieldToMain();
      
      const zip = await JSZip.loadAsync(zipData)
      
      // Yield after zip parsing
      await yieldToMain();
      
      const imageMap: { [key: string]: HTMLImageElement } = {}
      const imagePromises: Promise<void>[] = []

      const files = Object.entries(zip.files);
      for (let i = 0; i < files.length; i++) {
        const [relativePath, file] = files[i];
        if (relativePath.endsWith(".png") && !relativePath.startsWith("__MACOSX")) {
          const match = relativePath.match(/(\d+)\.png$/i)
          if (match) {
            const imageNum = match[1]
            const promise = file.async("blob").then((blob) => {
              return new Promise<void>((resolve) => {
                const img = new Image()
                img.onload = () => {
                  imageMap[imageNum] = img
                  resolve()
                }
                img.onerror = () => resolve()
                img.src = URL.createObjectURL(blob)
              })
            })
            imagePromises.push(promise)
          }
        }
        // Yield every few files to prevent blocking
        if (i % 3 === 0) await yieldToMain();
      }

      const [depthMapImg, depthLightenedImg, depthDarkenedImg, kitOverlayImg, kitDepthImg, shadowImg, bwLayerImg, whiteMarbleImg] = await Promise.all([
        depthMapPromise, 
        depthLightenedPromise, 
        depthDarkenedPromise,
        kitOverlayPromise,
        kitDepthPromise,
        shadowPromise,
        bwLayerPromise,
        whiteMarblePromise,
        ...imagePromises
      ])
      
      const img5 = imageMap["5"]  // Base image
      const img2 = imageMap["2"]  // Gold overlay/gloss
      const img1 = imageMap["1"]  // X-ray image
      
      if (!img5 || !img2 || !img1) {
        console.error("Missing required images")
        return null
      }
      
      console.log("Images loaded:", { base: !!img5, overlay: !!img2, xray: !!img1, kitOverlay: !!kitOverlayImg, kitDepth: !!kitDepthImg, shadow: !!shadowImg, bwLayer: !!bwLayerImg, whiteMarble: !!whiteMarbleImg })
      
      return { 
        baseImage: img5, 
        overlayImage: img2, 
        xrayImage: img1,
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
  }, [])

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

    // Fragment shader with multi-map parallax control, shooting star, and organic fluid X-ray reveal
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
      uniform float noiseTime;
      uniform float fluidPhase;
      uniform float isPhantomMode;
      
      varying vec2 vUv;
      
      const vec3 goldColor = vec3(0.92, 0.78, 0.45);
      const vec3 brightGold = vec3(1.0, 0.9, 0.5);
      const vec3 warmLight = vec3(1.0, 0.95, 0.85);
      const vec3 revealWhite = vec3(1.0, 1.0, 1.0);
      const vec3 revealGrey = vec3(0.75, 0.75, 0.78);
      const vec3 riseGold = vec3(0.92, 0.78, 0.45);
      
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
      
      // Flow-based FBM for smooth organic distortion (NOT radial)
      float flowFBM(vec2 p, float t) {
        float value = 0.0;
        float amplitude = 0.5;
        vec2 flow = vec2(t * 0.15, t * 0.1);
        for (int i = 0; i < 3; i++) {
          value += amplitude * snoise(p + flow);
          p *= 2.1;
          flow *= 1.3;
          amplitude *= 0.5;
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
      // Creates smooth, organic water-like blob using SDF with flow distortion
      float waterBlob(vec2 uv, vec2 center, float baseRadius, float timeOffset) {
        // Flow-based distortion applied to UV space (NOT radial like before)
        vec2 flowDistort = vec2(
          flowFBM(uv * 4.0 + timeOffset, noiseTime * 0.8) * 0.04,
          flowFBM(uv * 4.0 + timeOffset + 100.0, noiseTime * 0.7) * 0.04
        );
        vec2 distortedUV = uv + flowDistort;
        
        // Base circle SDF
        float dist = circleSDF(distortedUV, center, baseRadius);
        
        // Add flowing edge distortion (smooth waves, not spiky)
        float edgeWave = flowFBM(uv * 6.0 + center * 3.0 + timeOffset, noiseTime * 0.5) * 0.025;
        dist += edgeWave;
        
        // Soft, smooth edge
        return 1.0 - smoothstep(-0.02, 0.04, dist);
      }
      
      // ============= CONNECTED WATER LOBES =============
      // Creates 2-3 smaller connected blobs that merge into main mass
      float waterLobes(vec2 uv, vec2 center, float baseRadius, vec2 velocity, float speed, float timeOffset) {
        float combinedSDF = circleSDF(uv, center, baseRadius);
        
        // Generate 3 connected lobes with noise-driven positions
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          
          // Lobe offset driven by smooth noise (not angle-based)
          vec2 lobeOffset = vec2(
            snoise(vec2(fi * 3.0 + timeOffset, noiseTime * 0.3)) * 0.12,
            snoise(vec2(fi * 3.0 + 50.0 + timeOffset, noiseTime * 0.25)) * 0.12
          );
          
          // Add velocity bias - lobes extend more in movement direction
          if (speed > 0.02) {
            lobeOffset += velocity * (0.06 + fi * 0.03);
          }
          
          vec2 lobeCenter = center + lobeOffset;
          float lobeRadius = baseRadius * (0.4 + snoise(vec2(fi, noiseTime * 0.4)) * 0.15);
          
          float lobeSDF = circleSDF(uv, lobeCenter, lobeRadius);
          
          // Smooth-min blend creates organic connection
          combinedSDF = smin(combinedSDF, lobeSDF, 0.08);
        }
        
        // Apply flow distortion to the combined SDF
        float flowDistort = flowFBM(uv * 5.0 + timeOffset, noiseTime * 0.6) * 0.02;
        combinedSDF += flowDistort;
        
        return 1.0 - smoothstep(-0.015, 0.035, combinedSDF);
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
        // NOTE: discard moved AFTER fluidMask calculation - see below
        
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
        
        // Kit overlay with fluctuating transparency (55% to 100% every 6 seconds)
        if (hasKitOverlay > 0.5) {
          vec4 kitColor = texture2D(kitOverlayTexture, parallaxUV);
          
          // Fluctuate opacity between 0.55 (55%) and 1.0 (100%) over 6 seconds
          float kitPulse = sin(time * 1.0472) * 0.5 + 0.5;  // 1.0472 = 2*PI/6 for 6 second cycle
          float kitOpacity = mix(0.55, 1.0, kitPulse);
          
          compositeColor = mix(compositeColor, kitColor.rgb, kitColor.a * kitOpacity);
          
          float kitDepthVal = 0.5;
          if (hasKitDepth > 0.5) {
            kitDepthVal = dot(texture2D(kitDepthTexture, parallaxUV).rgb, vec3(0.299, 0.587, 0.114));
          }
          
          if (kitShinePos >= 0.0) {
            float shineWidth = 0.15;
            float shineDist = abs(vUv.x - kitShinePos);
            float shineMask = 1.0 - smoothstep(0.0, shineWidth, shineDist);
            shineMask *= kitDepthVal;
            float shineGlow = (1.0 - smoothstep(0.0, shineWidth * 0.3, shineDist)) * 0.6 * kitDepthVal;
            compositeColor += brightGold * shineGlow * kitColor.a * kitOpacity;
          }
        }
        
        // ============= WATER-LIKE FLUID X-RAY REVEAL =============
        // In phantom mode, skip ALL visual fluid effects - only the bubble content shows
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
        
        // Sample x-ray texture
        vec2 xrayUV = (parallaxUV - 0.5) * xrayScale + 0.5 + xrayOffset;
        vec4 xrayColor = texture2D(xrayTexture, xrayUV);
        float xrayValid = step(0.0, xrayUV.x) * step(xrayUV.x, 1.0) * step(0.0, xrayUV.y) * step(xrayUV.y, 1.0);
        
        // ============= TRANSPARENT REVEAL TO SHOW PAGE BACKGROUND =============
        // The fluid cursor makes the player TRANSPARENT, revealing the actual page marble background
        // Color bands appear at the edge of the transparent area
        
        // Band definitions - ONLY apply to background areas (alpha < 0.1), NOT the player
        // REDUCED for phantom mode - no illumination, just reveal
        float phantomReduction = isPhantomMode > 0.5 ? 0.0 : 1.0;
        float coreTransparency = smoothstep(0.4, 0.75, fluidMask);  // Core becomes transparent
        float goldBand = 0.0;
        float greyBand = 0.0;
        
        // Only show bands outside the player - and only for manual interaction
        if (alpha < 0.1 && phantomReduction > 0.0) {
          goldBand = smoothstep(0.2, 0.4, fluidMask) * (1.0 - smoothstep(0.5, 0.7, fluidMask));
          greyBand = smoothstep(0.05, 0.2, fluidMask) * (1.0 - smoothstep(0.25, 0.45, fluidMask));
          
          // Directional stretch - color bands stretch in movement direction
          vec2 velDir = normalize(cursorVelocity + vec2(0.0001));
          float velMag = length(cursorVelocity);
          vec2 toPixel = vUv - cursorBlobPos;
          float alongVel = dot(toPixel, velDir);
          float directionalStretch = 1.0 + max(0.0, alongVel) * velMag * 8.0;
          
          goldBand *= mix(1.0, directionalStretch, 0.4);
          greyBand *= mix(1.0, directionalStretch, 0.6);
          
          // Shiny shimmer for gold band
          float goldShimmer = sin(noiseTime * 1.2 + vUv.x * 12.0 + vUv.y * 10.0) * 0.2 + 0.9;
          goldShimmer += sin(noiseTime * 2.0 + vUv.y * 18.0) * 0.1;
          vec3 shinyGold = riseGold * goldShimmer * 1.15;
          
          // Apply gold/grey edge bands (only outside player)
          compositeColor = mix(compositeColor, revealGrey, greyBand * 0.5);
          compositeColor = mix(compositeColor, shinyGold, goldBand * 0.7);
        }
        
        // NOW discard - only if no player AND no fluid effect active
        if (alpha < 0.01 && coreTransparency < 0.05) discard;
        
        // ============= ORIGINAL MOUSE SPOTLIGHT X-RAY =============
        float distToMouse = length(vUv - mousePos);
        float mouseXrayMask = (1.0 - smoothstep(0.0, xrayRadius + 0.02, distToMouse)) * userActive;
        
        float totalXrayMask = mouseXrayMask;
        
        // Shadow behind x-ray
        vec4 shadowColor = texture2D(shadowTexture, parallaxUV);
        vec3 xrayWithShadow = xrayColor.rgb;
        if (hasShadow > 0.5) {
          xrayWithShadow = mix(shadowColor.rgb, xrayColor.rgb, xrayColor.a);
        }
        
        vec3 finalColor = mix(compositeColor, xrayWithShadow, totalXrayMask * xrayValid);
        
        // ============= FLUID BLOB GLOW EFFECTS =============
        // Water glow around cursor blob - REDUCED for phantom mode
        float glowMultiplier = isPhantomMode > 0.5 ? 0.0 : 1.0;
        if (cursorBlobOpacity > 0.01 && glowMultiplier > 0.0) {
          float glowMask = waterBlob(vUv, cursorBlobPos, 0.22, 0.0);
          float outerGlow = smoothstep(0.0, 0.5, glowMask) * (1.0 - smoothstep(0.5, 1.0, glowMask));
          finalColor += mix(revealGrey, riseGold, 0.3) * outerGlow * cursorBlobOpacity * 0.15 * alpha * glowMultiplier;
        }
        
        // Edge rim light - only for manual interaction
        float rimLeft = smoothstep(0.1, 0.0, vUv.x) * max(0.0, shadowAmount) * 0.3 * glowMultiplier;
        float rimRight = smoothstep(0.9, 1.0, vUv.x) * max(0.0, -shadowAmount) * 0.3 * glowMultiplier;
        finalColor += goldColor * (rimLeft + rimRight) * alpha;
        
        // Depth-based shading
        if (hasDepthMap > 0.5) {
          float depthShade = combinedDepth * 0.1 + 0.95;
          finalColor *= depthShade;
        }
        
        // Shimmer in revealed areas - reduced for phantom
        if ((fluidMask > 0.01 || totalXrayMask > 0.0) && glowMultiplier > 0.0) {
          float shimmer = sin(time * 2.5 + vUv.x * 15.0 + vUv.y * 15.0) * 0.03 + 1.0;
          finalColor *= shimmer;
        }
        
        // ============= FINAL OUTPUT =============
        // Outside player: black normally, white marble when fluid hovers
        // Inside player: ALWAYS normal player, NEVER touched
        if (alpha < 0.1) {
          // OUTSIDE PLAYER (background area)
          if (coreTransparency > 0.05) {
            // Fluid hovering over background - make TRANSPARENT so page content shows through
            // The gold/grey bands at the edge will still be visible
            float edgeBands = goldBand + greyBand;
            if (edgeBands > 0.01) {
              // Show the edge band colors with partial transparency
              gl_FragColor = vec4(compositeColor, edgeBands * 0.8);
            } else {
              // Core area - fully transparent to show page content (R90, programming, etc.)
              gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            }
          } else {
            // No fluid - transparent background (let video show through)
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          }
        } else {
          // INSIDE PLAYER - ALWAYS show normal player, NO EXCEPTIONS
          gl_FragColor = vec4(finalColor, alpha);
        }
      }
    `


    // Initialize Three.js
    const initScene = async () => {
      const images = await loadImages()
      if (!images || !images.baseImage || !images.overlayImage || !images.xrayImage) {
        setIsLoading(false)
        return
      }

      const { baseImage, overlayImage, xrayImage, depthMap, depthLightened, depthDarkened, kitOverlay, kitDepth, shadowImage, bwLayerImage, whiteMarbleImage } = images

      const scene = new THREE.Scene()
      
      const aspect = container.clientWidth / container.clientHeight
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
      renderer.setSize(container.clientWidth, container.clientHeight)
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

      // Uniforms with all depth maps for 3D parallax control + shooting star + kit overlay + fluid reveal
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
        // Organic fluid X-ray reveal uniforms
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
        noiseTime: { value: 0.0 },
        fluidPhase: { value: 0.0 },
        isPhantomMode: { value: 0.0 }
      }

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
      // Position: shifted 3px left (using -0.02 for visible effect)
      playerMesh.position.x = -0.02
      playerMesh.position.y = isMobile ? 0.15 : 0.05
      scene.add(playerMesh)

      sceneRef.current = {
        scene,
        camera,
        renderer,
        playerMesh,
        xrayMesh: null,
        uniforms,
        animationId: 0
      }

      setIsLoading(false)

      const autoRevealSpeed = 0.15
      let autoTime = Math.random() * 100
      let xrayIntensity = 0
      
      // Shooting star timing: 3s duration, 10s cycle
      const STAR_DURATION = 3.0  // seconds
      const STAR_CYCLE = 10.0   // seconds
      let starCycleTime = 0
      
      // Kit shine timing: 2s duration, 8s cycle
      const SHINE_DURATION = 2.0  // seconds
      const SHINE_CYCLE = 8.0   // seconds
      let shineCycleTime = 0
      
      // Organic fluid X-ray reveal state
      let lastCursorMoveTime = 0
      const cursorBlobTarget = { x: -1, y: -1 }
      const cursorBlob = { x: -1, y: -1 }
      const prevCursorPos = { x: -1, y: -1 }
      const trail1 = { x: -1, y: -1 }
      const trail2 = { x: -1, y: -1 }
      const trail3 = { x: -1, y: -1 }
      const trail4 = { x: -1, y: -1 }
      let cursorOpacity = 0
      let trail1Opacity = 0
      let trail2Opacity = 0
      let trail3Opacity = 0
      let trail4Opacity = 0
      const velocity = { x: 0, y: 0 }
      let speed = 0
      
      // Phantom touch (auto-swipe) state - supports multiple overlapping swipes
      const PHANTOM_INTERVAL = 2000 // 2 seconds between new phantoms
      let lastPhantomTime = Date.now()
      
      interface PhantomSwipe {
        startTime: number
        duration: number // Variable duration per swipe
        start: { x: number; y: number }
        end: { x: number; y: number }
      }
      const activePhantoms: PhantomSwipe[] = []
      
      const generatePhantomSwipe = (): PhantomSwipe => {
        // Start from current cursor position to avoid jarring resets
        // If no current position, use center of screen
        const startX = cursorBlobTarget.x >= 0 ? cursorBlobTarget.x : 0.5
        const startY = cursorBlobTarget.y >= 0 ? cursorBlobTarget.y : 0.5
        
        // Random duration: mix of short (800ms-1500ms) and long (3000ms-5000ms)
        const isLongSwipe = Math.random() < 0.3 // 30% chance of long swipe
        const duration = isLongSwipe 
          ? 3000 + Math.random() * 2000  // 3-5 seconds
          : 800 + Math.random() * 700    // 0.8-1.5 seconds
        
        // Longer swipes travel further
        const baseLength = isLongSwipe ? 0.3 : 0.15
        const lengthVariance = isLongSwipe ? 0.3 : 0.25
        
        // Random direction and length
        const angle = Math.random() * Math.PI * 2
        const length = baseLength + Math.random() * lengthVariance
        
        return {
          startTime: Date.now(),
          duration,
          start: { x: startX, y: startY },
          end: {
            x: Math.max(0.1, Math.min(0.9, startX + Math.cos(angle) * length)),
            y: Math.max(0.1, Math.min(0.9, startY + Math.sin(angle) * length))
          }
        }
      }

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        
        const currentTime = Date.now()
        const deltaTime = 0.016
        uniforms.time.value += deltaTime
        uniforms.noiseTime.value += deltaTime
        uniforms.fluidPhase.value += deltaTime * 0.5
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
        
        // === ORGANIC FLUID X-RAY REVEAL ===
        const timeSinceCursorMove = currentTime - lastCursorMoveTime
        const rect = container.getBoundingClientRect()
        
        // Use GLOBAL window coordinates (normalized 0-1 across entire viewport)
        // This ensures x-ray effect responds to cursor ANYWHERE on the page
        const globalMouseX = mouseRef.current.x / window.innerWidth
        const globalMouseY = 1 - (mouseRef.current.y / window.innerHeight)
        
        // Map global coordinates to where they would appear on the player
        // The player container occupies a portion of the screen - we need to map
        // global cursor position to the equivalent local position for the shader
        const playerCenterX = (rect.left + rect.width / 2) / window.innerWidth
        const playerCenterY = 1 - ((rect.top + rect.height / 2) / window.innerHeight)
        const scaleX = window.innerWidth / rect.width
        const scaleY = window.innerHeight / rect.height
        
        // Transform: where is the global cursor relative to player center, then scale
        let mouseX = 0.5 + (globalMouseX - playerCenterX) * scaleX
        let mouseY = 0.5 + (globalMouseY - playerCenterY) * scaleY
        
        // Check if user is actively interacting (anywhere on page)
        const userTimeSinceInteraction = currentTime - lastInteractionRef.current
        const isUserActive = userTimeSinceInteraction < 500
        
        // === PHANTOM TOUCH (Auto-swipe when user inactive) ===
        if (!isUserActive) {
          const timeSincePhantom = currentTime - lastPhantomTime
          
          // Start a new phantom swipe every interval (can overlap)
          if (timeSincePhantom >= PHANTOM_INTERVAL) {
            activePhantoms.push(generatePhantomSwipe())
            lastPhantomTime = currentTime
          }
          
          // Process all active phantoms - follow the NEWEST one, don't blend
          // Remove completed phantoms first
          for (let i = activePhantoms.length - 1; i >= 0; i--) {
            const phantom = activePhantoms[i]
            const phantomElapsed = currentTime - phantom.startTime
            const phantomProgress = phantomElapsed / phantom.duration
            
            if (phantomProgress >= 1) {
              activePhantoms.splice(i, 1)
            }
          }
          
          // Follow only the most recent (newest) phantom - no blending
          if (activePhantoms.length > 0) {
            // Get the newest phantom (last in array since we push new ones)
            const newestPhantom = activePhantoms[activePhantoms.length - 1]
            const phantomElapsed = currentTime - newestPhantom.startTime
            const phantomProgress = phantomElapsed / newestPhantom.duration
            
            // Ease in-out for smooth motion
            const easedProgress = phantomProgress < 0.5
              ? 2 * phantomProgress * phantomProgress
              : 1 - Math.pow(-2 * phantomProgress + 2, 2) / 2
            
            mouseX = newestPhantom.start.x + (newestPhantom.end.x - newestPhantom.start.x) * easedProgress
            mouseY = newestPhantom.start.y + (newestPhantom.end.y - newestPhantom.start.y) * easedProgress
            
            // Update velocity for phantom
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
        } else {
          // User is active - just reset phantom timer, DON'T clear active phantoms
          // This allows overlapping phantoms to continue their animation
          lastPhantomTime = currentTime
        }
        
        // Update cursor target and track velocity (for real user input)
        // Always track cursor globally - x-ray effect works across entire page
        if (isUserActive) {
          // Calculate velocity before updating target
          if (cursorBlobTarget.x >= 0) {
            velocity.x = mouseX - cursorBlobTarget.x
            velocity.y = mouseY - cursorBlobTarget.y
            speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            
            // Normalize velocity
            if (speed > 0.001) {
              velocity.x /= speed
              velocity.y /= speed
            }
            // Scale speed for shader
            speed = Math.min(speed * 15, 1.0)
          }
          
          cursorBlobTarget.x = mouseX
          cursorBlobTarget.y = mouseY
          lastCursorMoveTime = currentTime
        }
        
        // Store previous position for velocity calculation
        prevCursorPos.x = cursorBlob.x
        prevCursorPos.y = cursorBlob.y
        
        // Smooth cursor blob following with fluid interpolation
        cursorBlob.x += (cursorBlobTarget.x - cursorBlob.x) * 0.12
        cursorBlob.y += (cursorBlobTarget.y - cursorBlob.y) * 0.12
        
        // Cascading trail positions with varying delays for fluid effect
        trail1.x += (cursorBlob.x - trail1.x) * 0.08
        trail1.y += (cursorBlob.y - trail1.y) * 0.08
        trail2.x += (trail1.x - trail2.x) * 0.06
        trail2.y += (trail1.y - trail2.y) * 0.06
        trail3.x += (trail2.x - trail3.x) * 0.04
        trail3.y += (trail2.y - trail3.y) * 0.04
        trail4.x += (trail3.x - trail4.x) * 0.025
        trail4.y += (trail3.y - trail4.y) * 0.025
        
        // Fade out after 1 second of no movement - organic collapse
        if (timeSinceCursorMove > 1000) {
          const fadeProgress = Math.min((timeSinceCursorMove - 1000) / 1500, 1.0)
          const fadeMultiplier = 1.0 - fadeProgress * fadeProgress // Ease out
          
          cursorOpacity = Math.max(0, cursorOpacity * 0.97)
          trail1Opacity = Math.max(0, trail1Opacity * 0.975)
          trail2Opacity = Math.max(0, trail2Opacity * 0.98)
          trail3Opacity = Math.max(0, trail3Opacity * 0.985)
          trail4Opacity = Math.max(0, trail4Opacity * 0.99)
          
          // Decay speed when not moving
          speed *= 0.92
        } else {
          // Ramp up opacity when cursor is moving
          cursorOpacity = Math.min(1, cursorOpacity + 0.15)
          trail1Opacity = Math.min(0.85, trail1Opacity + 0.12)
          trail2Opacity = Math.min(0.7, trail2Opacity + 0.09)
          trail3Opacity = Math.min(0.55, trail3Opacity + 0.07)
          trail4Opacity = Math.min(0.4, trail4Opacity + 0.05)
        }
        
        // Update cursor blob uniforms
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
        
        // Set phantom mode - disables glow effects for phantom touches
        uniforms.isPhantomMode.value = (!isUserActive && activePhantoms.length > 0) ? 1.0 : 0.0
        
        // === AUTONOMOUS AMBIENT BLOBS - Organic Lissajous with noise ===
        const ambientSpeed = 0.06
        const t = uniforms.time.value
        
        // Blob 1 - large, slow organic movement
        const amb1NoiseX = Math.sin(t * 0.13) * 0.05
        const amb1NoiseY = Math.cos(t * 0.17) * 0.04
        const amb1X = 0.5 + Math.sin(t * ambientSpeed * 1.1) * 0.32 + amb1NoiseX
        const amb1Y = 0.5 + Math.sin(t * ambientSpeed * 0.7 + 1.0) * 0.28 + amb1NoiseY
        uniforms.ambientBlob1Pos.value.set(amb1X, amb1Y)
        
        // Blob 2 - medium, different phase with wobble
        const amb2NoiseX = Math.sin(t * 0.19 + 2.0) * 0.04
        const amb2NoiseY = Math.cos(t * 0.23 + 1.5) * 0.05
        const amb2X = 0.5 + Math.sin(t * ambientSpeed * 0.6 + 2.5) * 0.38 + amb2NoiseX
        const amb2Y = 0.5 + Math.cos(t * ambientSpeed * 0.9) * 0.32 + amb2NoiseY
        uniforms.ambientBlob2Pos.value.set(amb2X, amb2Y)
        
        // Blob 3 - smaller, faster with more erratic movement
        const amb3NoiseX = Math.sin(t * 0.31) * 0.06
        const amb3NoiseY = Math.cos(t * 0.29 + 0.7) * 0.05
        const amb3X = 0.5 + Math.cos(t * ambientSpeed * 0.85 + 0.5) * 0.28 + amb3NoiseX
        const amb3Y = 0.5 + Math.sin(t * ambientSpeed * 1.2 + 1.8) * 0.24 + amb3NoiseY
        uniforms.ambientBlob3Pos.value.set(amb3X, amb3Y)
        
        // === KIT SHINE ANIMATION ===
        // Sweep from left (-0.2) to right (1.2) over 1 second
        if (shineCycleTime < SHINE_DURATION) {
          const shineProgress = shineCycleTime / SHINE_DURATION
          // Ease out for smooth motion
          const easedShine = 1 - Math.pow(1 - shineProgress, 2)
          const shinePos = -0.2 + easedShine * 1.4  // -0.2 to 1.2
          uniforms.kitShinePos.value = shinePos
        } else {
          uniforms.kitShinePos.value = -1.0  // Hide shine
        }
        
        // === SHOOTING STAR ANIMATION - 90° ARC FROM LEFT TO RIGHT ===
        // Arc from 270° (left, off-screen) to 360° (right, off-screen)
        if (starCycleTime < STAR_DURATION) {
          const progress = starCycleTime / STAR_DURATION
          // Ease in-out for smooth motion
          const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
          
          // 90° arc: 270° to 360° (left off-screen to right off-screen)
          const startAngle = Math.PI * 1.5  // 270° (left side)
          const endAngle = Math.PI * 2      // 360° (right side)
          const currentAngle = startAngle + (endAngle - startAngle) * easedProgress
          
          // Large radius so start/end points are off-screen
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
        
        // Auto-reveal ALWAYS continues (Lissajous pattern)
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
        
        // Always update auto position
        uniforms.autoPos.value.set(autoRevealPosRef.current.x, autoRevealPosRef.current.y)
        
        // Check if phantom touch is active
        const isPhantomActive = activePhantoms.length > 0 && cursorOpacity > 0.3
        
        // Handle user interaction OR phantom touch for visual x-ray effect on player
        if (isUserInteracting || isPhantomActive) {
          uniforms.userActive.value = Math.min(1, uniforms.userActive.value + 0.1)
          uniforms.mousePos.value.set(mouseX, mouseY)
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
      
      const { camera, renderer, uniforms, playerMesh } = sceneRef.current
      const aspect = container.clientWidth / container.clientHeight
      const frustumSize = 2
      
      camera.left = -frustumSize * aspect / 2
      camera.right = frustumSize * aspect / 2
      camera.top = frustumSize / 2
      camera.bottom = -frustumSize / 2
      camera.updateProjectionMatrix()
      
      renderer.setSize(container.clientWidth, container.clientHeight)
      uniforms.resolution.value.set(container.clientWidth, container.clientHeight)
      
      const isMobile = container.clientWidth < 768
      if (playerMesh) {
        // Only adjust vertical position, don't reset any other state
        playerMesh.position.y = isMobile ? 0.15 : 0.05
      }
      // Don't reset cursor or phantom swipe positions on resize
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
    />
  )
}
