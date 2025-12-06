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

    // Fragment shader with multi-map parallax control, shooting star, and fluid X-ray reveal
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
      
      // Fluid X-ray reveal uniforms
      uniform vec2 cursorBlobPos;
      uniform float cursorBlobOpacity;
      uniform vec2 cursorTrail1;
      uniform vec2 cursorTrail2;
      uniform float trailOpacity1;
      uniform float trailOpacity2;
      uniform vec2 ambientBlob1Pos;
      uniform vec2 ambientBlob2Pos;
      uniform vec2 ambientBlob3Pos;
      
      varying vec2 vUv;
      
      const vec3 goldColor = vec3(0.92, 0.78, 0.45);
      const vec3 brightGold = vec3(1.0, 0.9, 0.5);
      const vec3 warmLight = vec3(1.0, 0.95, 0.85);
      const vec3 revealWhite = vec3(1.0, 1.0, 1.0);
      const vec3 revealGrey = vec3(0.7, 0.7, 0.75);
      const vec3 riseGold = vec3(0.92, 0.78, 0.45);
      
      // Metaball influence function for fluid blob shapes
      float metaballInfluence(vec2 uv, vec2 blobPos, float radius) {
        float dist = length(uv - blobPos);
        return pow(radius / max(dist, 0.001), 2.0);
      }
      
      void main() {
        // Sample all depth maps and combine
        float baseDepth = 0.5;
        float boostAmount = 0.0;
        float reduceAmount = 0.0;
        
        if (hasDepthMap > 0.5) {
          baseDepth = dot(texture2D(depthMap, vUv).rgb, vec3(0.299, 0.587, 0.114));
        }
        
        // Lightened map = areas for MORE effect (brighter = more boost)
        if (hasDepthLightened > 0.5) {
          boostAmount = dot(texture2D(depthLightened, vUv).rgb, vec3(0.299, 0.587, 0.114));
        }
        
        // Darkened map = areas for LESS effect (darker = more reduction)
        if (hasDepthDarkened > 0.5) {
          reduceAmount = 1.0 - dot(texture2D(depthDarkened, vUv).rgb, vec3(0.299, 0.587, 0.114));
        }
        
        // Combine: boost adds to depth, reduce subtracts from it
        float parallaxStrength = 0.16 + (boostAmount * 0.02) - (reduceAmount * 0.01);
        parallaxStrength = clamp(parallaxStrength, 0.13, 0.19);
        
        // Combined depth - less aggressive modifiers for more even distribution
        float combinedDepth = baseDepth * (1.0 + boostAmount * 0.15 - reduceAmount * 0.1);
        combinedDepth = clamp(combinedDepth, 0.2, 1.0);
        
        // Zero out parallax in bottom-right corner (football area)
        float bottomRightMask = smoothstep(0.45, 0.65, vUv.x) * smoothstep(0.55, 0.30, vUv.y);
        combinedDepth *= (1.0 - bottomRightMask);
        
        // Parallax offset based on mouse position and combined depth
        vec2 parallaxOffset = (mousePos - vec2(0.5)) * combinedDepth * parallaxStrength;
        vec2 parallaxUV = vUv - parallaxOffset;
        
        // Sample base texture with parallax
        vec4 baseColor = texture2D(baseTexture, parallaxUV);
        vec4 overlayColor = texture2D(overlayTexture, parallaxUV);
        
        // Alpha from base texture
        float alpha = baseColor.a;
        if (alpha < 0.01) discard;
        
        // === DYNAMIC SHADOW based on cursor X position ===
        float shadowAmount = (mousePos.x - 0.5) * 0.4;
        shadowAmount = clamp(shadowAmount, -0.15, 0.25);
        
        // Apply shadow/highlight to base color
        vec3 shadedBase = baseColor.rgb * (1.0 - shadowAmount);
        
        // === GLOSS OVERLAY (image 2) - subtle pulsing ===
        float glossPulse = sin(time * 0.6) * 0.5 + 0.5;
        glossPulse = pow(glossPulse, 2.5);
        
        // Additive blend for gold gloss highlights
        vec3 glossHighlight = overlayColor.rgb * overlayColor.a * glossPulse * 0.5;
        vec3 compositeColor = shadedBase + glossHighlight;
        
        // === B&W LAYER WITH ANIMATED GLOSS SHINE ===
        if (hasBwLayer > 0.5 && bwLayerOpacity > 0.01) {
          vec4 bwColor = texture2D(bwLayerTexture, parallaxUV);
          
          // Calculate brightness from B&W image
          float bwBrightness = dot(bwColor.rgb, vec3(0.299, 0.587, 0.114));
          
          // Sweeping gloss effect - diagonal shine across the image
          float sweepAngle = 0.7; // Diagonal angle
          float sweepPos = vUv.x * cos(sweepAngle) + vUv.y * sin(sweepAngle);
          float sweepPhase = mod(bwLightPhase * 0.3, 2.0); // Slower sweep
          float sweepCenter = sweepPhase - 0.5;
          
          // Sharp glossy highlight band
          float glossWidth = 0.15;
          float glossDist = abs(sweepPos - sweepCenter);
          float glossStrength = 1.0 - smoothstep(0.0, glossWidth, glossDist);
          glossStrength = pow(glossStrength, 2.0); // Sharper falloff
          
          // Core bright line in the center of the gloss
          float coreStrength = 1.0 - smoothstep(0.0, glossWidth * 0.2, glossDist);
          
          // Apply to lighter areas more (face/arms)
          float lightMask = smoothstep(0.3, 0.6, bwBrightness);
          
          // Gloss colors - bright white core with warm gold edges
          vec3 glossCore = vec3(1.0, 1.0, 1.0) * coreStrength * lightMask * 1.2;
          vec3 glossEdge = brightGold * glossStrength * lightMask * 0.8;
          vec3 glossEffect = (glossCore + glossEdge) * bwColor.a;
          
          // Add ambient shimmer on highlights
          float shimmer = sin(bwLightPhase * 4.0 + bwBrightness * 10.0) * 0.5 + 0.5;
          vec3 shimmerEffect = warmLight * shimmer * smoothstep(0.5, 0.8, bwBrightness) * 0.3 * bwColor.a;
          
          // Combine and apply with opacity fade
          vec3 totalGloss = (glossEffect + shimmerEffect) * bwLayerOpacity;
          compositeColor = compositeColor + totalGloss;
        }
        
        // === KIT OVERLAY - Always visible, with sweeping shine on top ===
        if (hasKitOverlay > 0.5) {
          vec4 kitColor = texture2D(kitOverlayTexture, parallaxUV);
          
          // Always show kit overlay
          compositeColor = mix(compositeColor, kitColor.rgb, kitColor.a);
          
          // Sample kit depth map for shine intensity control
          float kitDepth = 0.5;
          if (hasKitDepth > 0.5) {
            kitDepth = dot(texture2D(kitDepthTexture, parallaxUV).rgb, vec3(0.299, 0.587, 0.114));
          }
          
          // Add sweeping shine effect on top (only when active)
          if (kitShinePos >= 0.0) {
            float shineWidth = 0.15;
            float shineDist = abs(vUv.x - kitShinePos);
            float shineMask = 1.0 - smoothstep(0.0, shineWidth, shineDist);
            
            // Depth map controls intensity - brighter areas shine more
            shineMask *= kitDepth;
            
            // Add bright glow at the shine center
            float shineGlow = (1.0 - smoothstep(0.0, shineWidth * 0.3, shineDist)) * 0.6 * kitDepth;
            
            // Add bright gold shine highlight on top
            compositeColor += brightGold * shineGlow * kitColor.a;
          }
        }
        
        // === FLUID X-RAY REVEAL EFFECT ===
        // Calculate metaball influences for fluid blob shapes
        float fluidRevealMask = 0.0;
        
        // Cursor-controlled blobs (high opacity when active)
        fluidRevealMask += metaballInfluence(vUv, cursorBlobPos, 0.15) * cursorBlobOpacity;
        fluidRevealMask += metaballInfluence(vUv, cursorTrail1, 0.12) * trailOpacity1;
        fluidRevealMask += metaballInfluence(vUv, cursorTrail2, 0.10) * trailOpacity2;
        
        // Autonomous ambient blobs (lower opacity - 40% of cursor)
        fluidRevealMask += metaballInfluence(vUv, ambientBlob1Pos, 0.18) * 0.4;
        fluidRevealMask += metaballInfluence(vUv, ambientBlob2Pos, 0.15) * 0.35;
        fluidRevealMask += metaballInfluence(vUv, ambientBlob3Pos, 0.12) * 0.3;
        
        // Threshold for clean edges with smooth falloff
        fluidRevealMask = smoothstep(0.5, 1.5, fluidRevealMask);
        
        // Sample x-ray/background for reveal
        vec2 xrayUV = (parallaxUV - 0.5) * xrayScale + 0.5 + xrayOffset;
        vec4 xrayColor = texture2D(xrayTexture, xrayUV);
        float xrayValid = step(0.0, xrayUV.x) * step(xrayUV.x, 1.0) * step(0.0, xrayUV.y) * step(xrayUV.y, 1.0);
        
        // Color tinting for reveal - whites/greys with gold accents
        vec3 revealTint = mix(revealGrey, revealWhite, fluidRevealMask * 0.5);
        float goldAccent = sin(time * 0.8 + vUv.x * 5.0) * 0.3 + 0.3;
        revealTint = mix(revealTint, riseGold, goldAccent * 0.3);
        
        // Blend x-ray with tint
        vec3 tintedReveal = mix(xrayColor.rgb, revealTint, 0.15);
        
        // Apply fluid reveal - reveals through where mask is high
        compositeColor = mix(compositeColor, tintedReveal, fluidRevealMask * xrayValid);
        
        // === ADDITIONAL MOUSE SPOTLIGHT X-RAY (original effect) ===
        float distToMouse = length(vUv - mousePos);
        float mouseXrayMask = (1.0 - smoothstep(0.0, xrayRadius + 0.02, distToMouse)) * userActive;
        
        // === SHOOTING STAR X-RAY REVEAL ===
        float distToStar = length(vUv - shootingStarPos);
        float starXrayMask = (1.0 - smoothstep(0.0, 0.08, distToStar)) * shootingStarActive;
        
        // Combine additional x-ray masks
        float totalXrayMask = max(mouseXrayMask, starXrayMask);
        
        // === SHADOW BEHIND X-RAY ===
        vec4 shadowColor = texture2D(shadowTexture, parallaxUV);
        vec3 xrayWithShadow = xrayColor.rgb;
        if (hasShadow > 0.5) {
          xrayWithShadow = mix(shadowColor.rgb, xrayColor.rgb, xrayColor.a);
        }
        
        vec3 finalColor = mix(compositeColor, xrayWithShadow, totalXrayMask * xrayValid);
        
        // === SHOOTING STAR GLOW ===
        if (shootingStarActive > 0.0) {
          float starGlow = (1.0 - smoothstep(0.0, 0.12, distToStar)) * shootingStarActive;
          float starCore = (1.0 - smoothstep(0.0, 0.02, distToStar)) * shootingStarActive;
          finalColor += brightGold * starCore * 0.8 * alpha;
          finalColor += goldColor * starGlow * 0.3 * alpha;
        }
        
        // === FLUID BLOB GLOW EFFECTS ===
        // Add subtle glow around cursor blob
        if (cursorBlobOpacity > 0.01) {
          float cursorGlow = metaballInfluence(vUv, cursorBlobPos, 0.2) * cursorBlobOpacity;
          cursorGlow = smoothstep(0.3, 1.0, cursorGlow) * 0.15;
          finalColor += revealWhite * cursorGlow * alpha;
        }
        
        // === EDGE RIM LIGHT - subtle 3D pop ===
        float rimLeft = smoothstep(0.1, 0.0, vUv.x) * max(0.0, shadowAmount) * 0.3;
        float rimRight = smoothstep(0.9, 1.0, vUv.x) * max(0.0, -shadowAmount) * 0.3;
        finalColor += goldColor * (rimLeft + rimRight) * alpha;
        
        // Subtle depth-based shading for 3D feel
        if (hasDepthMap > 0.5) {
          float depthShade = combinedDepth * 0.1 + 0.95;
          finalColor *= depthShade;
        }
        
        // Gold shimmer in revealed areas
        if (fluidRevealMask > 0.01 || totalXrayMask > 0.0) {
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
        // Fluid X-ray reveal uniforms
        cursorBlobPos: { value: new THREE.Vector2(-1, -1) },
        cursorBlobOpacity: { value: 0.0 },
        cursorTrail1: { value: new THREE.Vector2(-1, -1) },
        cursorTrail2: { value: new THREE.Vector2(-1, -1) },
        trailOpacity1: { value: 0.0 },
        trailOpacity2: { value: 0.0 },
        ambientBlob1Pos: { value: new THREE.Vector2(0.3, 0.4) },
        ambientBlob2Pos: { value: new THREE.Vector2(0.7, 0.6) },
        ambientBlob3Pos: { value: new THREE.Vector2(0.5, 0.3) }
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
      
      // Fluid X-ray reveal state
      let lastCursorMoveTime = 0
      const cursorBlobTarget = { x: -1, y: -1 }
      const cursorBlob = { x: -1, y: -1 }
      const trail1 = { x: -1, y: -1 }
      const trail2 = { x: -1, y: -1 }
      let cursorOpacity = 0
      let trail1Opacity = 0
      let trail2Opacity = 0

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        
        const currentTime = Date.now()
        const deltaTime = 0.016
        uniforms.time.value += deltaTime
        autoTime += deltaTime
        starCycleTime += deltaTime
        shineCycleTime += deltaTime
        
        // === B&W LAYER FADE ANIMATION - 3s fade in, 3s fade out (6s total cycle) ===
        uniforms.bwLightPhase.value += deltaTime * 1.2  // Speed of light animation
        const BW_FADE_CYCLE = 6.0  // 6 second total cycle
        const bwCycleTime = (uniforms.time.value % BW_FADE_CYCLE)
        // 0-3s: fade in (0 to 1), 3-6s: fade out (1 to 0)
        if (bwCycleTime < 3.0) {
          uniforms.bwLayerOpacity.value = bwCycleTime / 3.0
        } else {
          uniforms.bwLayerOpacity.value = 1.0 - ((bwCycleTime - 3.0) / 3.0)
        }
        // Reset cycles
        if (starCycleTime >= STAR_CYCLE) {
          starCycleTime = 0
        }
        if (shineCycleTime >= SHINE_CYCLE) {
          shineCycleTime = 0
        }
        
        // === FLUID X-RAY REVEAL - CURSOR BLOBS ===
        const timeSinceCursorMove = currentTime - lastCursorMoveTime
        const rect = container.getBoundingClientRect()
        const mouseX = (mouseRef.current.x - rect.left) / rect.width
        const mouseY = 1 - (mouseRef.current.y - rect.top) / rect.height
        
        // Update cursor target when mouse moves
        if (mouseX >= 0 && mouseX <= 1 && mouseY >= 0 && mouseY <= 1) {
          const timeSinceInteractionCheck = currentTime - lastInteractionRef.current
          if (timeSinceInteractionCheck < 100) {
            cursorBlobTarget.x = mouseX
            cursorBlobTarget.y = mouseY
            lastCursorMoveTime = currentTime
          }
        }
        
        // Smooth cursor blob following
        cursorBlob.x += (cursorBlobTarget.x - cursorBlob.x) * 0.1
        cursorBlob.y += (cursorBlobTarget.y - cursorBlob.y) * 0.1
        
        // Trail positions follow with delay
        trail1.x += (cursorBlob.x - trail1.x) * 0.05
        trail1.y += (cursorBlob.y - trail1.y) * 0.05
        trail2.x += (trail1.x - trail2.x) * 0.03
        trail2.y += (trail1.y - trail2.y) * 0.03
        
        // Fade out after 1 second of no movement
        if (timeSinceCursorMove > 1000) {
          cursorOpacity = Math.max(0, cursorOpacity - 0.02)
          trail1Opacity = Math.max(0, trail1Opacity - 0.015)
          trail2Opacity = Math.max(0, trail2Opacity - 0.01)
        } else {
          cursorOpacity = Math.min(1, cursorOpacity + 0.1)
          trail1Opacity = Math.min(0.8, trail1Opacity + 0.08)
          trail2Opacity = Math.min(0.6, trail2Opacity + 0.06)
        }
        
        // Update cursor blob uniforms
        uniforms.cursorBlobPos.value.set(cursorBlob.x, cursorBlob.y)
        uniforms.cursorBlobOpacity.value = cursorOpacity
        uniforms.cursorTrail1.value.set(trail1.x, trail1.y)
        uniforms.cursorTrail2.value.set(trail2.x, trail2.y)
        uniforms.trailOpacity1.value = trail1Opacity
        uniforms.trailOpacity2.value = trail2Opacity
        
        // === AUTONOMOUS AMBIENT BLOBS - Lissajous curves for organic movement ===
        const ambientSpeed = 0.08
        const t = uniforms.time.value
        
        // Blob 1 - larger, slower movement
        const amb1X = 0.5 + Math.sin(t * ambientSpeed * 1.3) * 0.3
        const amb1Y = 0.5 + Math.sin(t * ambientSpeed * 0.9 + 1.0) * 0.25
        uniforms.ambientBlob1Pos.value.set(amb1X, amb1Y)
        
        // Blob 2 - medium, different phase
        const amb2X = 0.5 + Math.sin(t * ambientSpeed * 0.7 + 2.5) * 0.35
        const amb2Y = 0.5 + Math.cos(t * ambientSpeed * 1.1) * 0.3
        uniforms.ambientBlob2Pos.value.set(amb2X, amb2Y)
        
        // Blob 3 - smaller, faster
        const amb3X = 0.5 + Math.cos(t * ambientSpeed * 1.0 + 0.5) * 0.25
        const amb3Y = 0.5 + Math.sin(t * ambientSpeed * 1.4 + 1.8) * 0.2
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
