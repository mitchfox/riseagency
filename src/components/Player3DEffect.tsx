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

      const response = await fetch("/assets/Website_Hero_RISE.zip")
      const zipData = await response.arrayBuffer()
      const zip = await JSZip.loadAsync(zipData)
      
      const imageMap: { [key: string]: HTMLImageElement } = {}
      const imagePromises: Promise<void>[] = []

      zip.forEach((relativePath, file) => {
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
      })

      const [depthMapImg, depthLightenedImg, depthDarkenedImg, kitOverlayImg, kitDepthImg, shadowImg, bwLayerImg] = await Promise.all([
        depthMapPromise, 
        depthLightenedPromise, 
        depthDarkenedPromise,
        kitOverlayPromise,
        kitDepthPromise,
        shadowPromise,
        bwLayerPromise,
        ...imagePromises
      ])
      
      const img5 = imageMap["5"]  // Base image
      const img2 = imageMap["2"]  // Gold overlay/gloss
      const img1 = imageMap["1"]  // X-ray image
      
      if (!img5 || !img2 || !img1) {
        console.error("Missing required images")
        return null
      }
      
      console.log("Images loaded:", { base: !!img5, overlay: !!img2, xray: !!img1, kitOverlay: !!kitOverlayImg, kitDepth: !!kitDepthImg, shadow: !!shadowImg, bwLayer: !!bwLayerImg })
      
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
        bwLayerImage: bwLayerImg
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
      
      // Fractal brownian motion for more organic noise
      float fbm(vec2 p, float t) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * snoise(p * frequency + t * 0.3);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      // ============= ORGANIC FLUID BLOB FUNCTION =============
      float organicBlob(vec2 uv, vec2 center, float baseRadius, vec2 velocity, float speed, float timeOffset) {
        vec2 diff = uv - center;
        float dist = length(diff);
        float angle = atan(diff.y, diff.x);
        
        // Velocity-based directional stretching
        float velAlignment = 0.0;
        if (speed > 0.01) {
          velAlignment = dot(normalize(diff + 0.001), velocity);
        }
        // Stretch blob backward in movement direction (creates trailing effect)
        float stretch = 1.0 + speed * max(0.0, -velAlignment) * 3.0;
        float stretchedDist = dist / mix(1.0, stretch, 0.7);
        
        // Multi-octave noise distortion for organic, irregular edges
        float n1 = snoise(vec2(angle * 2.0 + noiseTime * 0.4 + timeOffset, noiseTime * 0.2)) * 0.4;
        float n2 = snoise(vec2(angle * 4.0 - noiseTime * 0.3 + timeOffset * 2.0, noiseTime * 0.35)) * 0.25;
        float n3 = snoise(vec2(angle * 8.0 + noiseTime * 0.5, noiseTime * 0.5 + timeOffset)) * 0.15;
        float n4 = snoise(vec2(angle * 16.0, noiseTime * 0.7)) * 0.08;
        
        float noiseDistortion = n1 + n2 + n3 + n4;
        
        // Pulsing radius for organic breathing effect
        float pulse = sin(noiseTime * 1.5 + timeOffset * 3.0) * 0.1 + 1.0;
        
        float distortedRadius = baseRadius * (1.0 + noiseDistortion) * pulse;
        
        // Soft falloff for fluid blending
        float blob = 1.0 - smoothstep(distortedRadius * 0.3, distortedRadius, stretchedDist);
        
        return blob;
      }
      
      // ============= SPLASH POCKET FUNCTION =============
      // Creates smaller satellite blobs around main blob for splash effect
      float splashPockets(vec2 uv, vec2 center, vec2 velocity, float speed, float baseRadius, float timeOffset) {
        float splash = 0.0;
        
        // Generate splash pockets in velocity direction
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float pocketAngle = fi * 1.2566 + noiseTime * 0.2 + timeOffset; // ~72 degrees apart
          
          // Pockets spread out more with speed
          float spreadDist = baseRadius * (0.8 + fi * 0.25) * (1.0 + speed * 2.0);
          
          // Add velocity bias - pockets extend more in movement direction
          vec2 pocketOffset = vec2(cos(pocketAngle), sin(pocketAngle)) * spreadDist;
          if (speed > 0.01) {
            pocketOffset += velocity * spreadDist * (0.5 + fi * 0.2);
          }
          
          vec2 pocketPos = center + pocketOffset;
          float pocketRadius = baseRadius * (0.15 + snoise(vec2(fi * 3.0, noiseTime * 0.5)) * 0.08);
          
          // Organic pocket shape
          float pocket = organicBlob(uv, pocketPos, pocketRadius, velocity, speed * 0.5, timeOffset + fi);
          
          // Fade pockets with distance
          float distFade = 1.0 - fi * 0.15;
          splash = max(splash, pocket * distFade * 0.6);
        }
        
        return splash;
      }
      
      // ============= TENDRIL FUNCTION =============
      // Creates flowing tendrils extending from blob
      float fluidTendrils(vec2 uv, vec2 center, vec2 velocity, float speed, float timeOffset) {
        float tendrils = 0.0;
        
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          // Tendrils flow in velocity direction with some spread
          float tendrilAngle = atan(velocity.y, velocity.x) + (fi - 1.5) * 0.5;
          
          // Length varies with speed and noise
          float tendrilLength = (0.15 + speed * 0.4) * (1.0 + snoise(vec2(fi, noiseTime * 0.3)) * 0.3);
          float tendrilWidth = 0.02 + snoise(vec2(fi * 2.0, noiseTime * 0.4)) * 0.01;
          
          // Create tendril as elongated shape
          vec2 tendrilDir = vec2(cos(tendrilAngle), sin(tendrilAngle));
          vec2 tendrilStart = center;
          
          // Distance along tendril direction
          vec2 toPoint = uv - tendrilStart;
          float alongTendril = dot(toPoint, tendrilDir);
          float perpTendril = length(toPoint - tendrilDir * alongTendril);
          
          // Tendril shape - tapers toward end
          if (alongTendril > 0.0 && alongTendril < tendrilLength) {
            float taper = 1.0 - alongTendril / tendrilLength;
            float tendrilMask = smoothstep(tendrilWidth * taper, 0.0, perpTendril);
            
            // Add noise to tendril edge
            float edgeNoise = snoise(vec2(alongTendril * 20.0 + noiseTime, fi)) * 0.02;
            tendrilMask *= smoothstep(tendrilWidth * taper + edgeNoise, 0.0, perpTendril);
            
            tendrils = max(tendrils, tendrilMask * taper * 0.5);
          }
        }
        
        return tendrils * speed;
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
        
        // Gloss overlay
        float glossPulse = sin(time * 0.6) * 0.5 + 0.5;
        glossPulse = pow(glossPulse, 2.5);
        vec3 glossHighlight = overlayColor.rgb * overlayColor.a * glossPulse * 0.5;
        vec3 compositeColor = shadedBase + glossHighlight;
        
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
        
        // Kit overlay
        if (hasKitOverlay > 0.5) {
          vec4 kitColor = texture2D(kitOverlayTexture, parallaxUV);
          compositeColor = mix(compositeColor, kitColor.rgb, kitColor.a);
          
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
            compositeColor += brightGold * shineGlow * kitColor.a;
          }
        }
        
        // ============= ORGANIC FLUID X-RAY REVEAL =============
        float fluidMask = 0.0;
        
        // Main cursor blob with organic shape
        float mainBlob = organicBlob(vUv, cursorBlobPos, 0.18, cursorVelocity, cursorSpeed, 0.0);
        fluidMask += mainBlob * cursorBlobOpacity;
        
        // Splash pockets around cursor
        float cursorSplash = splashPockets(vUv, cursorBlobPos, cursorVelocity, cursorSpeed, 0.12, 0.0);
        fluidMask += cursorSplash * cursorBlobOpacity * 0.8;
        
        // Tendrils extending from cursor blob
        float cursorTendrils = fluidTendrils(vUv, cursorBlobPos, cursorVelocity, cursorSpeed, 0.0);
        fluidMask += cursorTendrils * cursorBlobOpacity;
        
        // Trailing blobs with organic shapes
        float trail1Blob = organicBlob(vUv, cursorTrail1, 0.14, cursorVelocity, cursorSpeed * 0.7, 1.0);
        fluidMask += trail1Blob * trailOpacity1 * 0.85;
        fluidMask += splashPockets(vUv, cursorTrail1, cursorVelocity, cursorSpeed * 0.5, 0.08, 1.0) * trailOpacity1 * 0.5;
        
        float trail2Blob = organicBlob(vUv, cursorTrail2, 0.11, cursorVelocity, cursorSpeed * 0.5, 2.0);
        fluidMask += trail2Blob * trailOpacity2 * 0.7;
        fluidMask += splashPockets(vUv, cursorTrail2, cursorVelocity, cursorSpeed * 0.3, 0.06, 2.0) * trailOpacity2 * 0.4;
        
        float trail3Blob = organicBlob(vUv, cursorTrail3, 0.08, cursorVelocity, cursorSpeed * 0.3, 3.0);
        fluidMask += trail3Blob * trailOpacity3 * 0.55;
        
        float trail4Blob = organicBlob(vUv, cursorTrail4, 0.06, cursorVelocity, cursorSpeed * 0.2, 4.0);
        fluidMask += trail4Blob * trailOpacity4 * 0.4;
        
        // Autonomous ambient blobs - lower opacity, organic movement
        float ambient1 = organicBlob(vUv, ambientBlob1Pos, 0.22, vec2(0.0), 0.0, 5.0);
        float ambient1Splash = splashPockets(vUv, ambientBlob1Pos, vec2(sin(noiseTime * 0.3), cos(noiseTime * 0.4)), 0.15, 0.1, 5.0);
        fluidMask += (ambient1 + ambient1Splash * 0.5) * 0.38;
        
        float ambient2 = organicBlob(vUv, ambientBlob2Pos, 0.18, vec2(0.0), 0.0, 6.0);
        float ambient2Splash = splashPockets(vUv, ambientBlob2Pos, vec2(cos(noiseTime * 0.25), sin(noiseTime * 0.35)), 0.12, 0.08, 6.0);
        fluidMask += (ambient2 + ambient2Splash * 0.4) * 0.32;
        
        float ambient3 = organicBlob(vUv, ambientBlob3Pos, 0.14, vec2(0.0), 0.0, 7.0);
        fluidMask += ambient3 * 0.28;
        
        // Clamp and smooth the combined mask
        fluidMask = clamp(fluidMask, 0.0, 1.0);
        
        // Sample x-ray texture
        vec2 xrayUV = (parallaxUV - 0.5) * xrayScale + 0.5 + xrayOffset;
        vec4 xrayColor = texture2D(xrayTexture, xrayUV);
        float xrayValid = step(0.0, xrayUV.x) * step(xrayUV.x, 1.0) * step(0.0, xrayUV.y) * step(xrayUV.y, 1.0);
        
        // ============= COLOR LAYERS: WHITE/GREY/GOLD =============
        // Core intensity (center of blobs) - bright white
        float coreIntensity = smoothstep(0.6, 1.0, fluidMask);
        // Mid intensity - grey transition
        float midIntensity = smoothstep(0.3, 0.6, fluidMask);
        // Edge intensity - gold accent
        float edgeIntensity = smoothstep(0.0, 0.35, fluidMask);
        
        // Build reveal color from layers
        vec3 revealColor = xrayColor.rgb;
        
        // Edge layer: subtle gold shimmer
        float goldShimmer = sin(noiseTime * 0.8 + vUv.x * 8.0 + vUv.y * 6.0) * 0.15 + 0.85;
        revealColor = mix(revealColor, mix(xrayColor.rgb, riseGold * goldShimmer, 0.25), edgeIntensity * 0.4);
        
        // Mid layer: grey tint
        revealColor = mix(revealColor, mix(xrayColor.rgb, revealGrey, 0.15), midIntensity * 0.5);
        
        // Core layer: bright white highlight
        revealColor = mix(revealColor, mix(xrayColor.rgb, revealWhite, 0.12), coreIntensity * 0.6);
        
        // Apply fluid reveal to composite
        compositeColor = mix(compositeColor, revealColor, fluidMask * xrayValid);
        
        // ============= ORIGINAL MOUSE SPOTLIGHT X-RAY =============
        float distToMouse = length(vUv - mousePos);
        float mouseXrayMask = (1.0 - smoothstep(0.0, xrayRadius + 0.02, distToMouse)) * userActive;
        
        // Shooting star x-ray
        float distToStar = length(vUv - shootingStarPos);
        float starXrayMask = (1.0 - smoothstep(0.0, 0.08, distToStar)) * shootingStarActive;
        
        float totalXrayMask = max(mouseXrayMask, starXrayMask);
        
        // Shadow behind x-ray
        vec4 shadowColor = texture2D(shadowTexture, parallaxUV);
        vec3 xrayWithShadow = xrayColor.rgb;
        if (hasShadow > 0.5) {
          xrayWithShadow = mix(shadowColor.rgb, xrayColor.rgb, xrayColor.a);
        }
        
        vec3 finalColor = mix(compositeColor, xrayWithShadow, totalXrayMask * xrayValid);
        
        // Shooting star glow
        if (shootingStarActive > 0.0) {
          float starGlow = (1.0 - smoothstep(0.0, 0.12, distToStar)) * shootingStarActive;
          float starCore = (1.0 - smoothstep(0.0, 0.02, distToStar)) * shootingStarActive;
          finalColor += brightGold * starCore * 0.8 * alpha;
          finalColor += goldColor * starGlow * 0.3 * alpha;
        }
        
        // ============= FLUID BLOB GLOW EFFECTS =============
        // Organic glow around cursor blob
        if (cursorBlobOpacity > 0.01) {
          float glowMask = organicBlob(vUv, cursorBlobPos, 0.25, cursorVelocity, cursorSpeed, 0.0);
          float outerGlow = smoothstep(0.0, 0.5, glowMask) * (1.0 - smoothstep(0.5, 1.0, glowMask));
          finalColor += mix(revealGrey, riseGold, 0.3) * outerGlow * cursorBlobOpacity * 0.2 * alpha;
        }
        
        // Edge rim light
        float rimLeft = smoothstep(0.1, 0.0, vUv.x) * max(0.0, shadowAmount) * 0.3;
        float rimRight = smoothstep(0.9, 1.0, vUv.x) * max(0.0, -shadowAmount) * 0.3;
        finalColor += goldColor * (rimLeft + rimRight) * alpha;
        
        // Depth-based shading
        if (hasDepthMap > 0.5) {
          float depthShade = combinedDepth * 0.1 + 0.95;
          finalColor *= depthShade;
        }
        
        // Shimmer in revealed areas
        if (fluidMask > 0.01 || totalXrayMask > 0.0) {
          float shimmer = sin(time * 2.5 + vUv.x * 15.0 + vUv.y * 15.0) * 0.03 + 1.0;
          finalColor *= shimmer;
        }
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `


    // Initialize Three.js
    const initScene = async () => {
      const images = await loadImages()
      if (!images || !images.baseImage || !images.overlayImage || !images.xrayImage) {
        setIsLoading(false)
        return
      }

      const { baseImage, overlayImage, xrayImage, depthMap, depthLightened, depthDarkened, kitOverlay, kitDepth, shadowImage, bwLayerImage } = images

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
        fluidPhase: { value: 0.0 }
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
      // Position: y offset for vertical centering, x offset to shift 5px left
      playerMesh.position.x = -0.025
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
        const mouseX = (mouseRef.current.x - rect.left) / rect.width
        const mouseY = 1 - (mouseRef.current.y - rect.top) / rect.height
        
        // Update cursor target and track velocity
        if (mouseX >= 0 && mouseX <= 1 && mouseY >= 0 && mouseY <= 1) {
          const timeSinceInteractionCheck = currentTime - lastInteractionRef.current
          if (timeSinceInteractionCheck < 100) {
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
        
        // === SHOOTING STAR ANIMATION ===
        // Arc from bottom-left (270°) to top-right (360°/0°)
        if (starCycleTime < STAR_DURATION) {
          const progress = starCycleTime / STAR_DURATION
          // Ease in-out for smooth motion
          const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
          
          // Arc path: 270° to 360° (bottom to right, curving up)
          // Center of arc is at (0.5, 0.5), radius extends beyond screen
          const startAngle = Math.PI * 1.5  // 270° (bottom)
          const endAngle = Math.PI * 2      // 360° (right/top)
          const currentAngle = startAngle + (endAngle - startAngle) * easedProgress
          
          // Large arc radius to sweep across the image
          const arcRadius = 0.9
          const centerX = 0.5
          const centerY = 0.5
          
          const starX = centerX + Math.cos(currentAngle) * arcRadius
          const starY = centerY + Math.sin(currentAngle) * arcRadius
          
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
        
        // Handle user interaction separately
        if (isUserInteracting) {
          uniforms.userActive.value = Math.min(1, uniforms.userActive.value + 0.1)
          uniforms.mousePos.value.set(mouseX, mouseY)
          xrayIntensity = Math.min(1, xrayIntensity + 0.05)
          
          // Only show background stats when user is actively interacting
          setXrayState({
            isActive: true,
            intensity: xrayIntensity,
            position: { x: uniforms.mousePos.value.x, y: uniforms.mousePos.value.y }
          })
        } else {
          uniforms.userActive.value = Math.max(0, uniforms.userActive.value - 0.05)
          xrayIntensity = 0.7 + Math.sin(autoTime * 0.5) * 0.3
          
          // Hide background stats when not interacting
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
        playerMesh.position.y = isMobile ? 0.15 : 0.05
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
    />
  )
}
