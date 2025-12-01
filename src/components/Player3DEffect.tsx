"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import JSZip from "jszip"

interface Player3DEffectProps {
  className?: string
}

export const Player3DEffect = ({ className = "" }: Player3DEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
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
      return { baseImage: imageMap["7"], xrayImage: imageMap["11"] }
    } catch (error) {
      console.error("Error loading zip:", error)
      return null
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let animationId: number

    // Vertex shader with depth displacement for 3D pop
    const vertexShader = `
      uniform float time;
      uniform vec2 mousePos;
      uniform float depthScale;
      uniform sampler2D baseTexture;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vDepth;
      varying float vLuminance;
      
      // Simplex noise for organic depth
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      void main() {
        vUv = uv;
        
        // Sample base texture to create depth from luminance (brighter = closer)
        vec4 texColor = texture2D(baseTexture, uv);
        float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        vLuminance = luminance;
        
        // Create depth based on luminance and UV position
        float centerDist = length(uv - vec2(0.5));
        float baseDepth = luminance * 0.8 + (1.0 - centerDist * 1.2) * 0.2;
        baseDepth = clamp(baseDepth, 0.0, 1.0);
        
        // Add organic noise for body contours
        float noise = snoise(vec3(uv * 4.0, time * 0.15)) * 0.15;
        
        // Subtle breathing animation
        float breathe = sin(time * 0.8) * 0.015;
        
        // Calculate final depth
        vDepth = baseDepth + noise * 0.5;
        float displacement = vDepth * depthScale + breathe;
        
        // Displace along Z axis for 3D pop
        vec3 newPosition = position;
        newPosition.z += displacement;
        
        // Mouse/auto-reveal influence - subtle bulge toward cursor
        vec2 mouseInfluence = mousePos - uv;
        float mouseDist = length(mouseInfluence);
        float mouseEffect = smoothstep(0.4, 0.0, mouseDist) * 0.03;
        newPosition.z += mouseEffect;
        
        // Calculate normals for lighting
        float eps = 0.01;
        float dzdx = (snoise(vec3((uv + vec2(eps, 0.0)) * 4.0, time * 0.15)) - 
                      snoise(vec3((uv - vec2(eps, 0.0)) * 4.0, time * 0.15))) / (2.0 * eps);
        float dzdy = (snoise(vec3((uv + vec2(0.0, eps)) * 4.0, time * 0.15)) - 
                      snoise(vec3((uv - vec2(0.0, eps)) * 4.0, time * 0.15))) / (2.0 * eps);
        vec3 perturbedNormal = normalize(vec3(-dzdx * depthScale, -dzdy * depthScale, 1.0));
        
        vNormal = normalize(normalMatrix * perturbedNormal);
        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    // Fragment shader with alpha, roughness, and lighting
    const fragmentShader = `
      uniform sampler2D baseTexture;
      uniform sampler2D xrayTexture;
      uniform float time;
      uniform vec2 mousePos;
      uniform vec2 resolution;
      uniform float xrayRadius;
      uniform float roughness;
      uniform float isAutoReveal;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vDepth;
      varying float vLuminance;
      
      // Gold color
      const vec3 goldColor = vec3(0.792, 0.694, 0.443);
      const vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
      
      void main() {
        vec4 baseColor = texture2D(baseTexture, vUv);
        vec4 xrayColor = texture2D(xrayTexture, vUv);
        
        // Alpha from base texture
        float alpha = baseColor.a;
        
        // Discard fully transparent pixels
        if (alpha < 0.01) discard;
        
        // Calculate mouse position in UV space
        vec2 mouseUV = mousePos;
        float distToMouse = length(vUv - mouseUV);
        
        // X-ray reveal - smooth edge, no border
        float xrayMask = 1.0 - smoothstep(xrayRadius - 0.03, xrayRadius + 0.01, distToMouse);
        
        // Mix base and x-ray based on mouse proximity
        vec4 color = mix(baseColor, xrayColor, xrayMask);
        
        // === LIGHTING & ROUGHNESS for base image ===
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        // Diffuse lighting
        float NdotL = max(dot(normal, lightDir), 0.0);
        float diffuse = NdotL * 0.3 + 0.7; // Ambient + diffuse
        
        // Specular (affected by roughness - lower roughness = sharper highlights)
        vec3 halfDir = normalize(lightDir + viewDir);
        float NdotH = max(dot(normal, halfDir), 0.0);
        float specPower = mix(64.0, 4.0, roughness); // Roughness controls sharpness
        float specular = pow(NdotH, specPower) * (1.0 - roughness) * 0.4;
        
        // Rim lighting (edge glow)
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(rim, 3.0) * 0.25;
        
        // Fresnel effect for roughness visualization
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
        float fresnelRoughness = fresnel * (1.0 - roughness) * 0.15;
        
        // Apply lighting to base image (not x-ray)
        vec3 litColor = color.rgb * diffuse;
        litColor += goldColor * specular * (1.0 - xrayMask);
        litColor += goldColor * rim * (1.0 - xrayMask);
        litColor += goldColor * fresnelRoughness * (1.0 - xrayMask);
        
        // Depth-based ambient occlusion
        float ao = vDepth * 0.15 + 0.85;
        litColor *= ao;
        
        // Gold shimmer in x-ray area
        if (xrayMask > 0.0) {
          float shimmer = sin(time * 3.0 + vUv.x * 20.0 + vUv.y * 20.0) * 0.05 + 0.95;
          litColor *= shimmer;
          
          // Subtle gold tint in x-ray
          litColor = mix(litColor, litColor * vec3(1.05, 1.0, 0.9), xrayMask * 0.3);
        }
        
        // Auto-reveal pulsing glow
        if (isAutoReveal > 0.5) {
          float pulse = sin(time * 2.0) * 0.1 + 0.9;
          float autoGlow = xrayMask * pulse * 0.1;
          litColor += goldColor * autoGlow;
        }
        
        gl_FragColor = vec4(litColor, alpha);
      }
    `

    // X-ray shader for effects overlay
    const xrayOverlayVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const xrayOverlayFragmentShader = `
      uniform float time;
      uniform vec2 mousePos;
      uniform vec2 resolution;
      uniform float xrayRadius;
      uniform vec2 playerCenter;
      uniform float isAutoReveal;
      
      varying vec2 vUv;
      
      const vec3 goldColor = vec3(0.792, 0.694, 0.443);
      const float PI = 3.14159265359;
      
      void main() {
        vec2 mouseUV = mousePos;
        float distToMouse = length(vUv - mouseUV);
        
        // Only render inside x-ray area
        if (distToMouse > xrayRadius + 0.08) discard;
        
        float xrayMask = 1.0 - smoothstep(xrayRadius - 0.03, xrayRadius, distToMouse);
        
        vec3 color = vec3(0.0);
        float alpha = 0.0;
        
        // 5D Matrix lines from player center
        float angles[5];
        angles[0] = -90.0 * PI / 180.0;
        angles[1] = -162.0 * PI / 180.0;
        angles[2] = -234.0 * PI / 180.0;
        angles[3] = -306.0 * PI / 180.0;
        angles[4] = -18.0 * PI / 180.0;
        
        vec2 toPoint = vUv - playerCenter;
        float pointAngle = atan(toPoint.y, toPoint.x);
        float pointDist = length(toPoint);
        
        // Draw lines and particles
        for (int i = 0; i < 5; i++) {
          float angle = angles[i];
          vec2 lineDir = vec2(cos(angle), sin(angle));
          
          // Line distance calculation
          float lineLength = 0.25 + sin(time * 2.5 + float(i) * 1.2) * 0.08;
          vec2 lineEnd = playerCenter + lineDir * lineLength;
          
          // Point to line distance
          vec2 pa = vUv - playerCenter;
          vec2 ba = lineEnd - playerCenter;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          float lineDist = length(pa - ba * h);
          
          // Line glow
          float lineGlow = smoothstep(0.006, 0.0, lineDist);
          color += goldColor * lineGlow * 0.8 * xrayMask;
          alpha = max(alpha, lineGlow * 0.9 * xrayMask);
          
          // Streaming particles
          for (int p = 0; p < 6; p++) {
            float particleProgress = fract(time * 0.5 + float(p) * 0.12 + float(i) * 0.2);
            vec2 particlePos = playerCenter + lineDir * lineLength * particleProgress;
            float particleDist = length(vUv - particlePos);
            float particleGlow = smoothstep(0.012, 0.0, particleDist);
            float particleAlpha = sin(particleProgress * PI) * 0.9;
            color += goldColor * particleGlow * particleAlpha * xrayMask;
            alpha = max(alpha, particleGlow * particleAlpha * xrayMask);
          }
          
          // End nodes
          float endDist = length(vUv - lineEnd);
          float endGlow = smoothstep(0.018, 0.004, endDist);
          color += goldColor * endGlow * xrayMask;
          alpha = max(alpha, endGlow * xrayMask);
        }
        
        // Center core
        float coreDist = length(vUv - playerCenter);
        float corePulse = sin(time * 3.0) * 0.3 + 0.7;
        float coreGlow = smoothstep(0.022, 0.008, coreDist) * corePulse;
        color += goldColor * coreGlow * xrayMask;
        alpha = max(alpha, coreGlow * xrayMask);
        
        // Cursor indicator
        float cursorDist = length(vUv - mouseUV);
        float cursorPulse = sin(time * 5.0) * 0.2 + 0.8;
        float cursorGlow = smoothstep(0.018, 0.006, cursorDist) * cursorPulse;
        color += goldColor * cursorGlow;
        alpha = max(alpha, cursorGlow * 0.9);
        
        // Inner ring around cursor
        float ringDist = abs(cursorDist - 0.022);
        float ringGlow = smoothstep(0.004, 0.0, ringDist) * cursorPulse * 0.6;
        color += goldColor * ringGlow;
        alpha = max(alpha, ringGlow);
        
        // Falling particles from edge (reduced for auto-reveal)
        float particleIntensity = isAutoReveal > 0.5 ? 0.5 : 1.0;
        for (int i = 0; i < 12; i++) {
          float particleAngle = float(i) / 12.0 * 2.0 * PI + time * 0.3;
          float fallProgress = fract(time * 0.8 + float(i) * 0.15);
          
          vec2 startPos = mouseUV + vec2(cos(particleAngle), sin(particleAngle)) * xrayRadius;
          vec2 fallPos = startPos + vec2(sin(time * 2.0 + float(i)) * 0.02, fallProgress * 0.12);
          
          float fallDist = length(vUv - fallPos);
          float fallAlpha = (1.0 - fallProgress) * 0.6 * particleIntensity;
          float fallGlow = smoothstep(0.008, 0.0, fallDist) * fallAlpha;
          color += goldColor * fallGlow;
          alpha = max(alpha, fallGlow);
        }
        
        // Rotating sparks around circle edge (no visible border line)
        for (int i = 0; i < 8; i++) {
          float sparkAngle = float(i) / 8.0 * 2.0 * PI + time * 2.0;
          float sparkRadius = xrayRadius + 0.012 + sin(time * 5.0 + float(i)) * 0.006;
          vec2 sparkPos = mouseUV + vec2(cos(sparkAngle), sin(sparkAngle)) * sparkRadius;
          
          float sparkDist = length(vUv - sparkPos);
          float sparkAlpha = 0.5 + sin(time * 8.0 + float(i) * 2.0) * 0.4;
          float sparkGlow = smoothstep(0.006, 0.0, sparkDist) * sparkAlpha;
          color += goldColor * sparkGlow;
          alpha = max(alpha, sparkGlow);
        }
        
        gl_FragColor = vec4(color, alpha);
      }
    `

    // Initialize Three.js
    const initScene = async () => {
      const images = await loadImages()
      if (!images || !images.baseImage || !images.xrayImage) {
        setIsLoading(false)
        return
      }

      const { baseImage, xrayImage } = images

      // Create scene
      const scene = new THREE.Scene()
      
      // Orthographic camera for 2D-like rendering with depth
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

      // Renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        premultipliedAlpha: false
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      // Create textures
      const baseTexture = new THREE.Texture(baseImage)
      baseTexture.needsUpdate = true
      baseTexture.minFilter = THREE.LinearFilter
      baseTexture.magFilter = THREE.LinearFilter

      const xrayTexture = new THREE.Texture(xrayImage)
      xrayTexture.needsUpdate = true
      xrayTexture.minFilter = THREE.LinearFilter
      xrayTexture.magFilter = THREE.LinearFilter

      // Calculate dimensions
      const isMobile = container.clientWidth < 768
      const imgAspect = baseImage.width / baseImage.height
      
      let planeHeight = isMobile ? 1.4 : 1.6
      let planeWidth = planeHeight * imgAspect

      // Uniforms
      const uniforms = {
        baseTexture: { value: baseTexture },
        xrayTexture: { value: xrayTexture },
        time: { value: 0 },
        mousePos: { value: new THREE.Vector2(0.5, 0.6) },
        resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        xrayRadius: { value: 0.12 },
        depthScale: { value: 0.12 },
        roughness: { value: 0.5 },
        playerCenter: { value: new THREE.Vector2(0.5, 0.55) },
        isAutoReveal: { value: 1.0 }
      }

      // Player mesh with depth shader
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

      // X-ray overlay mesh (slightly in front)
      const overlayGeometry = new THREE.PlaneGeometry(3, 3)
      const overlayMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: xrayOverlayVertexShader,
        fragmentShader: xrayOverlayFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })

      const xrayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial)
      xrayMesh.position.z = 0.01
      scene.add(xrayMesh)

      // Store refs
      sceneRef.current = {
        scene,
        camera,
        renderer,
        playerMesh,
        xrayMesh,
        uniforms,
        animationId: 0
      }

      setIsLoading(false)

      // Auto-reveal path parameters
      const autoRevealSpeed = 0.15
      let autoTime = Math.random() * 100

      // Animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate)
        
        const currentTime = Date.now()
        uniforms.time.value += 0.016
        autoTime += 0.016
        
        // Check if user is interacting (within last 2 seconds)
        const timeSinceInteraction = currentTime - lastInteractionRef.current
        const isUserInteracting = timeSinceInteraction < 2000
        
        if (isUserInteracting) {
          // User is controlling - use mouse position
          uniforms.isAutoReveal.value = 0.0
          const rect = container.getBoundingClientRect()
          const mouseX = (mouseRef.current.x - rect.left) / rect.width
          const mouseY = 1 - (mouseRef.current.y - rect.top) / rect.height
          uniforms.mousePos.value.set(mouseX, mouseY)
        } else {
          // Auto-reveal mode - organic blob movement across player
          uniforms.isAutoReveal.value = 1.0
          
          // Lissajous curve for smooth, organic movement
          const a = 3, b = 2
          const delta = Math.PI / 4
          
          // Base position centered on player (0.35 to 0.65 horizontal, 0.35 to 0.75 vertical)
          const baseX = 0.5
          const baseY = 0.55
          const rangeX = 0.15
          const rangeY = 0.2
          
          // Primary movement
          const x1 = Math.sin(autoTime * autoRevealSpeed * a + delta) * rangeX
          const y1 = Math.sin(autoTime * autoRevealSpeed * b) * rangeY
          
          // Secondary wobble for organic feel
          const wobbleX = Math.sin(autoTime * 0.7) * 0.03
          const wobbleY = Math.cos(autoTime * 0.5) * 0.04
          
          const autoX = baseX + x1 + wobbleX
          const autoY = baseY + y1 + wobbleY
          
          // Smooth transition
          autoRevealPosRef.current.x += (autoX - autoRevealPosRef.current.x) * 0.05
          autoRevealPosRef.current.y += (autoY - autoRevealPosRef.current.y) * 0.05
          
          uniforms.mousePos.value.set(autoRevealPosRef.current.x, autoRevealPosRef.current.y)
        }
        
        renderer.render(scene, camera)
        
        if (sceneRef.current) {
          sceneRef.current.animationId = animationId
        }
      }

      animate()
    }

    initScene()

    // Mouse/touch handlers
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

    // Resize handler
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
      
      // Update player position for mobile
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
  }, [loadImages])

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full cursor-none ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-primary font-bebas tracking-wider animate-pulse">
            LOADING...
          </div>
        </div>
      )}
    </div>
  )
}
