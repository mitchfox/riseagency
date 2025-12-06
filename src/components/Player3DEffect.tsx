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

      const [depthMapImg, depthLightenedImg, depthDarkenedImg, kitOverlayImg, kitDepthImg, shadowImg] = await Promise.all([
        depthMapPromise, 
        depthLightenedPromise, 
        depthDarkenedPromise,
        kitOverlayPromise,
        kitDepthPromise,
        shadowPromise,
        ...imagePromises
      ])
      
      const img5 = imageMap["5"]  // Base image
      const img2 = imageMap["2"]  // Gold overlay/gloss
      const img1 = imageMap["1"]  // X-ray image
      
      if (!img5 || !img2 || !img1) {
        console.error("Missing required images")
        return null
      }
      
      console.log("Images loaded:", { base: !!img5, overlay: !!img2, xray: !!img1, kitOverlay: !!kitOverlayImg, kitDepth: !!kitDepthImg, shadow: !!shadowImg })
      
      return { 
        baseImage: img5, 
        overlayImage: img2, 
        xrayImage: img1,
        depthMap: depthMapImg,
        depthLightened: depthLightenedImg,
        depthDarkened: depthDarkenedImg,
        kitOverlay: kitOverlayImg,
        kitDepth: kitDepthImg,
        shadowImage: shadowImg
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

    // Fragment shader with multi-map parallax control and shooting star
    const fragmentShader = `
      uniform sampler2D baseTexture;
      uniform sampler2D overlayTexture;
      uniform sampler2D xrayTexture;
      uniform sampler2D shadowTexture;
      uniform sampler2D kitOverlayTexture;
      uniform sampler2D kitDepthTexture;
      uniform sampler2D depthMap;
      uniform sampler2D depthLightened;
      uniform sampler2D depthDarkened;
      uniform float hasDepthMap;
      uniform float hasDepthLightened;
      uniform float hasDepthDarkened;
      uniform float hasKitOverlay;
      uniform float hasKitDepth;
      uniform float hasShadow;
      uniform float time;
      uniform vec2 mousePos;
      uniform float xrayRadius;
      uniform float userActive;
      uniform vec2 xrayOffset;
      uniform float xrayScale;
      uniform vec2 shootingStarPos;
      uniform float shootingStarActive;
      uniform float kitShinePos;
      
      varying vec2 vUv;
      
      const vec3 goldColor = vec3(0.92, 0.78, 0.45);
      const vec3 brightGold = vec3(1.0, 0.9, 0.5);
      
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
        float parallaxStrength = 0.06 + (boostAmount * 0.02) - (reduceAmount * 0.01);
        parallaxStrength = clamp(parallaxStrength, 0.03, 0.09);
        
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
        
        // === X-RAY EFFECT ===
        vec2 xrayUV = (parallaxUV - 0.5) * xrayScale + 0.5 + xrayOffset;
        vec4 xrayColor = texture2D(xrayTexture, xrayUV);
        float xrayValid = step(0.0, xrayUV.x) * step(xrayUV.x, 1.0) * step(0.0, xrayUV.y) * step(xrayUV.y, 1.0);
        
        // Mouse spotlight (no visible circle, just x-ray reveal)
        float distToMouse = length(vUv - mousePos);
        float mouseXrayMask = (1.0 - smoothstep(0.0, xrayRadius + 0.02, distToMouse)) * userActive;
        
        // === SHOOTING STAR X-RAY REVEAL ===
        float distToStar = length(vUv - shootingStarPos);
        float starXrayMask = (1.0 - smoothstep(0.0, 0.08, distToStar)) * shootingStarActive;
        
        // Combine both x-ray masks
        float totalXrayMask = max(mouseXrayMask, starXrayMask);
        
        // === SHADOW BEHIND X-RAY ===
        // Sample shadow texture and blend it behind the x-ray reveal
        vec4 shadowColor = texture2D(shadowTexture, parallaxUV);
        vec3 xrayWithShadow = xrayColor.rgb;
        if (hasShadow > 0.5) {
          // Shadow goes behind everything - blend based on shadow alpha
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
        
        // === EDGE RIM LIGHT - subtle 3D pop ===
        float rimLeft = smoothstep(0.1, 0.0, vUv.x) * max(0.0, shadowAmount) * 0.3;
        float rimRight = smoothstep(0.9, 1.0, vUv.x) * max(0.0, -shadowAmount) * 0.3;
        finalColor += goldColor * (rimLeft + rimRight) * alpha;
        
        // Subtle depth-based shading for 3D feel
        if (hasDepthMap > 0.5) {
          float depthShade = combinedDepth * 0.1 + 0.95;
          finalColor *= depthShade;
        }
        
        // Gold shimmer in x-ray area
        if (totalXrayMask > 0.0) {
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

      const { baseImage, overlayImage, xrayImage, depthMap, depthLightened, depthDarkened, kitOverlay, kitDepth, shadowImage } = images

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

      const isMobile = container.clientWidth < 768
      const imgAspect = baseImage.width / baseImage.height
      
      let planeHeight = isMobile ? 1.4 : 1.6
      let planeWidth = planeHeight * imgAspect

      // Uniforms with all depth maps for 3D parallax control + shooting star + kit overlay
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
        kitShinePos: { value: -1.0 }
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
      // Position: y offset for vertical centering, x offset -0.01 to shift 5px left
      playerMesh.position.x = -0.01
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

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        
        const currentTime = Date.now()
        const deltaTime = 0.016
        uniforms.time.value += deltaTime
        autoTime += deltaTime
        starCycleTime += deltaTime
        shineCycleTime += deltaTime
        
        // Reset cycles
        if (starCycleTime >= STAR_CYCLE) {
          starCycleTime = 0
        }
        if (shineCycleTime >= SHINE_CYCLE) {
          shineCycleTime = 0
        }
        
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
          const rect = container.getBoundingClientRect()
          const mouseX = (mouseRef.current.x - rect.left) / rect.width
          const mouseY = 1 - (mouseRef.current.y - rect.top) / rect.height
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
