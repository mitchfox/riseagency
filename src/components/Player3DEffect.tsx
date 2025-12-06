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

  // Load images from zip
  const loadImages = useCallback(async () => {
    try {
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

      await Promise.all(imagePromises)
      
      const img5 = imageMap["5"]  // Base image
      const img2 = imageMap["2"]  // Gold overlay/gloss
      const img1 = imageMap["1"]  // X-ray image
      const img7 = imageMap["7"]  // Depth map
      
      if (!img5 || !img2 || !img1) {
        console.error("Missing required images")
        return null
      }
      
      // img7 is optional - depth map
      return { 
        baseImage: img5, 
        overlayImage: img2, 
        xrayImage: img1,
        depthMap: img7 || null
      }
    } catch (error) {
      console.error("Error loading zip:", error)
      return null
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let animationId: number

    // Vertex shader with depth map displacement for 3D parallax
    const vertexShader = `
      uniform float time;
      uniform vec2 mousePos;
      uniform float depthScale;
      uniform sampler2D depthMap;
      uniform float hasDepthMap;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vDepth;
      
      void main() {
        vUv = uv;
        
        // Sample depth map (white = close, black = far)
        float depth = 0.5;
        if (hasDepthMap > 0.5) {
          vec4 depthSample = texture2D(depthMap, uv);
          depth = dot(depthSample.rgb, vec3(0.299, 0.587, 0.114));
        }
        vDepth = depth;
        
        // Subtle breathing animation
        float breathe = sin(time * 0.8) * 0.008;
        
        // Calculate displacement from depth map - MORE POP
        float displacement = depth * depthScale * 1.5 + breathe;
        
        // Mouse parallax - WIDER MOVEMENT (increased from 0.03 to 0.12)
        vec2 mouseOffset = (mousePos - vec2(0.5)) * depth * 0.12;
        
        // Displace position
        vec3 newPosition = position;
        newPosition.z += displacement;
        newPosition.xy += mouseOffset;
        
        // Calculate normals from depth gradient for lighting
        float eps = 0.005;
        float depthL = hasDepthMap > 0.5 ? dot(texture2D(depthMap, uv - vec2(eps, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) : 0.5;
        float depthR = hasDepthMap > 0.5 ? dot(texture2D(depthMap, uv + vec2(eps, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) : 0.5;
        float depthD = hasDepthMap > 0.5 ? dot(texture2D(depthMap, uv - vec2(0.0, eps)).rgb, vec3(0.299, 0.587, 0.114)) : 0.5;
        float depthU = hasDepthMap > 0.5 ? dot(texture2D(depthMap, uv + vec2(0.0, eps)).rgb, vec3(0.299, 0.587, 0.114)) : 0.5;
        
        float dzdx = (depthR - depthL) / (2.0 * eps);
        float dzdy = (depthU - depthD) / (2.0 * eps);
        vec3 perturbedNormal = normalize(vec3(-dzdx * depthScale * 2.0, -dzdy * depthScale * 2.0, 1.0));
        
        vNormal = normalize(normalMatrix * perturbedNormal);
        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    // Fragment shader with depth-based roughness lighting
    const fragmentShader = `
      uniform sampler2D baseTexture;
      uniform sampler2D overlayTexture;
      uniform sampler2D xrayTexture;
      uniform sampler2D depthMap;
      uniform float hasDepthMap;
      uniform float time;
      uniform vec2 mousePos;
      uniform vec2 autoPos;
      uniform vec2 resolution;
      uniform float xrayRadius;
      uniform float userActive;
      uniform vec2 xrayOffset;
      uniform float xrayScale;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vDepth;
      
      // Gold color
      const vec3 goldColor = vec3(0.92, 0.78, 0.45);
      const vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
      
      void main() {
        vec4 baseColor = texture2D(baseTexture, vUv);
        vec4 overlayColor = texture2D(overlayTexture, vUv);
        
        // Alpha from base texture - punch out the player
        float alpha = baseColor.a;
        if (alpha < 0.01) discard;
        
        // Overlay gloss effect - SUBTLE to preserve texture
        float glossPulse = sin(time * 0.8) * 0.5 + 0.5;
        glossPulse = pow(glossPulse, 3.0); // Sharper falloff
        
        // Use SOFT LIGHT blend instead of screen to preserve texture
        // Soft light: enhances contrast without washing out colors
        vec3 softLight = baseColor.rgb * (overlayColor.rgb + vec3(0.5));
        softLight = clamp(softLight, 0.0, 1.0);
        vec4 compositeBase = vec4(mix(baseColor.rgb, softLight, overlayColor.a * glossPulse * 0.4), alpha);
        
        // Sample x-ray with offset and scale
        vec2 xrayUV = (vUv - 0.5) * xrayScale + 0.5 + xrayOffset;
        vec4 xrayColor = texture2D(xrayTexture, xrayUV);
        float xrayValid = step(0.0, xrayUV.x) * step(xrayUV.x, 1.0) * step(0.0, xrayUV.y) * step(xrayUV.y, 1.0);
        xrayColor = mix(compositeBase, xrayColor, xrayValid * xrayColor.a);
        
        // X-ray circle on hover
        float distToMouse = length(vUv - mousePos);
        float xrayMask = (1.0 - smoothstep(xrayRadius - 0.03, xrayRadius + 0.01, distToMouse)) * userActive;
        
        vec4 color = mix(compositeBase, xrayColor, xrayMask * xrayValid);
        
        // === ROUGHNESS-BASED LIGHTING ===
        // Use depth map as roughness: darker = more reflective (lower roughness)
        float roughness = 0.5;
        if (hasDepthMap > 0.5) {
          roughness = 1.0 - vDepth; // Invert: dark areas = shiny, light areas = matte
        }
        roughness = clamp(roughness * 0.8 + 0.1, 0.1, 0.9); // Range 0.1-0.9
        
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        // Diffuse lighting
        float NdotL = max(dot(normal, lightDir), 0.0);
        float diffuse = NdotL * 0.4 + 0.6;
        
        // Specular - more intense on low roughness (dark areas)
        vec3 halfDir = normalize(lightDir + viewDir);
        float NdotH = max(dot(normal, halfDir), 0.0);
        float specPower = mix(128.0, 4.0, roughness); // Sharp spec on shiny areas
        float specular = pow(NdotH, specPower) * (1.0 - roughness) * 0.6;
        
        // Rim lighting
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(rim, 3.0) * 0.3 * (1.0 - roughness);
        
        // Fresnel effect - stronger on shiny surfaces
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        float fresnelEffect = fresnel * (1.0 - roughness) * 0.2;
        
        // Apply lighting
        vec3 litColor = color.rgb * diffuse;
        litColor += goldColor * specular * (1.0 - xrayMask);
        litColor += goldColor * rim * (1.0 - xrayMask);
        litColor += goldColor * fresnelEffect * (1.0 - xrayMask);
        
        // Subtle gold shimmer in x-ray area
        if (xrayMask > 0.0) {
          float shimmer = sin(time * 3.0 + vUv.x * 20.0 + vUv.y * 20.0) * 0.05 + 0.95;
          litColor *= shimmer;
        }
        
        gl_FragColor = vec4(litColor, alpha);
      }
    `


    // Initialize Three.js
    const initScene = async () => {
      const images = await loadImages()
      if (!images || !images.baseImage || !images.overlayImage || !images.xrayImage) {
        setIsLoading(false)
        return
      }

      const { baseImage, overlayImage, xrayImage, depthMap } = images

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

      // Create depth map texture if available
      let depthTexture: THREE.Texture | null = null
      if (depthMap) {
        depthTexture = new THREE.Texture(depthMap)
        depthTexture.needsUpdate = true
        depthTexture.minFilter = THREE.LinearFilter
        depthTexture.magFilter = THREE.LinearFilter
      }

      const isMobile = container.clientWidth < 768
      const imgAspect = baseImage.width / baseImage.height
      
      let planeHeight = isMobile ? 1.4 : 1.6
      let planeWidth = planeHeight * imgAspect

      // Uniforms with depth map for 3D parallax and roughness
      const uniforms = {
        baseTexture: { value: baseTexture },
        overlayTexture: { value: overlayTexture },
        xrayTexture: { value: xrayTexture },
        depthMap: { value: depthTexture || baseTexture }, // Fallback to base if no depth
        hasDepthMap: { value: depthTexture ? 1.0 : 0.0 },
        time: { value: 0 },
        mousePos: { value: new THREE.Vector2(0.5, 0.5) },
        autoPos: { value: new THREE.Vector2(0.5, 0.55) },
        resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        xrayRadius: { value: isMobile ? 0.015 : 0.04 },
        depthScale: { value: 0.15 },
        playerCenter: { value: new THREE.Vector2(0.5, 0.55) },
        userActive: { value: 0.0 },
        xrayOffset: { value: new THREE.Vector2(0.0, 0.0) },
        xrayScale: { value: 1.0 }
      }

      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 128, 128)
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })

      const playerMesh = new THREE.Mesh(geometry, material)
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

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        
        const currentTime = Date.now()
        uniforms.time.value += 0.016
        autoTime += 0.016
        
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
