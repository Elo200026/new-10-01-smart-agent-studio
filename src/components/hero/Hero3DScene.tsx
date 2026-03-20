import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sphere, Box, Torus, Icosahedron, Html, useProgress } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Hook to track scroll progress
function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / Math.max(docHeight, 1), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollProgress;
}

// Hook to track mouse position (normalized -1 to 1)
function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const targetPosition = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Normalize mouse position to -1 to 1
    targetPosition.current = {
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: -(event.clientY / window.innerHeight) * 2 + 1
    };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Smooth interpolation loop
    let animationId: number;
    const animate = () => {
      setMousePosition(prev => ({
        x: prev.x + (targetPosition.current.x - prev.x) * 0.08,
        y: prev.y + (targetPosition.current.y - prev.y) * 0.08
      }));
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [handleMouseMove]);

  return mousePosition;
}

// Feature data for tooltips with routes
interface FeatureInfo {
  title: string;
  description: string;
  icon: string;
  route: string;
}

const featureData: Record<string, FeatureInfo> = {
  'ai-agents': {
    title: 'AI Agents',
    description: 'Intelligent autonomous agents that learn and adapt',
    icon: '🤖',
    route: '/agents'
  },
  'knowledge-base': {
    title: 'Knowledge Base',
    description: 'RAG-powered document retrieval and analysis',
    icon: '📚',
    route: '/knowledge-base'
  },
  'workflows': {
    title: 'Workflows',
    description: 'Visual multi-agent orchestration system',
    icon: '⚡',
    route: '/multi-agent-canvas'
  },
  'analytics': {
    title: 'Analytics',
    description: 'Real-time insights and performance metrics',
    icon: '📊',
    route: '/analytics'
  },
  'collaboration': {
    title: 'Collaboration',
    description: 'Team workspaces with real-time sync',
    icon: '👥',
    route: '/team'
  },
  'integrations': {
    title: 'Integrations',
    description: 'Connect with your favorite tools',
    icon: '🔗',
    route: '/marketplace'
  },
  'security': {
    title: 'Security',
    description: 'Enterprise-grade data protection',
    icon: '🔒',
    route: '/settings'
  }
};

// Floating geometric shape with scroll interaction and hover tooltip
function FloatingShape({ 
  position, 
  shape, 
  color, 
  speed = 1,
  distort = 0.3,
  scale = 1,
  scrollProgress = 0,
  scrollIntensity = 1,
  featureKey,
  onShapeClick
}: { 
  position: [number, number, number]; 
  shape: 'sphere' | 'box' | 'torus' | 'icosahedron';
  color: string;
  speed?: number;
  distort?: number;
  scale?: number;
  scrollProgress?: number;
  scrollIntensity?: number;
  featureKey?: string;
  onShapeClick?: (feature: FeatureInfo) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const initialPosition = useRef(position);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverScale = useRef(1);

  const feature = featureKey ? featureData[featureKey] : null;

  useFrame((state) => {
    if (meshRef.current) {
      // Base rotation
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed;
      
      // Scroll-based transformations
      const scrollOffset = scrollProgress * scrollIntensity;
      
      // Move shapes outward and rotate more as user scrolls
      meshRef.current.position.x = initialPosition.current[0] * (1 + scrollOffset * 0.5);
      meshRef.current.position.y = initialPosition.current[1] - scrollOffset * 2;
      meshRef.current.position.z = initialPosition.current[2] - scrollOffset * 3;
      
      // Add extra rotation based on scroll
      meshRef.current.rotation.z = scrollProgress * Math.PI * 2 * scrollIntensity;
      
      // Smooth hover scale animation
      const targetScale = isHovered ? 1.3 : 1;
      hoverScale.current += (targetScale - hoverScale.current) * 0.1;
      
      // Scale down slightly as we scroll, with hover boost
      const scaleModifier = (1 - scrollProgress * 0.3) * hoverScale.current;
      meshRef.current.scale.setScalar(scale * scaleModifier);
    }
  });

  const handlePointerEnter = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
    setShowTooltip(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
    document.body.style.cursor = 'auto';
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (feature && onShapeClick) {
      onShapeClick(feature);
    }
  }, [feature, onShapeClick]);

  const ShapeComponent = {
    sphere: Sphere,
    box: Box,
    torus: Torus,
    icosahedron: Icosahedron
  }[shape];

  const args = shape === 'torus' ? [0.8, 0.3, 16, 32] : shape === 'icosahedron' ? [1, 0] : [1, 32, 32];

  return (
    <Float speed={speed * 2} rotationIntensity={0.5 - scrollProgress * 0.3} floatIntensity={1 - scrollProgress * 0.5}>
      <group ref={groupRef}>
        <ShapeComponent 
          ref={meshRef} 
          args={args as any} 
          scale={scale} 
          position={position}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <MeshDistortMaterial
            color={isHovered ? '#ffffff' : color}
            attach="material"
            distort={isHovered ? distort * 1.5 : distort + scrollProgress * 0.2}
            speed={isHovered ? 4 : 2 + scrollProgress * 3}
            roughness={isHovered ? 0.1 : 0.2}
            metalness={isHovered ? 0.9 : 0.8}
            transparent
            opacity={isHovered ? 0.9 : 0.7 - scrollProgress * 0.3}
          />
        </ShapeComponent>
        
        {/* Tooltip */}
        {feature && showTooltip && scrollProgress < 0.3 && (
          <Html
            position={[position[0], position[1] + 1.2, position[2]]}
            center
            distanceFactor={6}
            style={{
              pointerEvents: 'none',
              transition: 'all 0.2s ease-out',
              opacity: showTooltip ? 1 : 0,
              transform: showTooltip ? 'translateY(0)' : 'translateY(10px)'
            }}
          >
            <div className="bg-background/95 backdrop-blur-md border border-primary/30 rounded-lg px-4 py-3 shadow-xl min-w-[180px] animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{feature.icon}</span>
                <span className="font-semibold text-foreground text-sm">{feature.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              <div className="mt-2 text-[10px] text-primary font-medium">Click to learn more →</div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
}

// Particle field with scroll interaction
function ParticleField({ count = 200, scrollProgress = 0 }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    return positions;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      // Base rotation
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01;
      
      // Scroll-based explosion effect
      const explosionScale = 1 + scrollProgress * 2;
      pointsRef.current.scale.setScalar(explosionScale);
      
      // Fade out particles as we scroll
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.6 - scrollProgress * 0.4;
      
      // Increase rotation speed with scroll
      pointsRef.current.rotation.z = scrollProgress * Math.PI;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03 + scrollProgress * 0.02}
        color="#8b5cf6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Animated ring with scroll interaction
function AnimatedRing({ radius = 3, color = "#8b5cf6", scrollProgress = 0, index = 0 }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      // Base animation
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      
      // Scroll-based expansion
      const expandedRadius = radius * (1 + scrollProgress * 0.5);
      ringRef.current.scale.setScalar(expandedRadius / radius);
      
      // Tilt based on scroll
      ringRef.current.rotation.y = scrollProgress * Math.PI * (index % 2 === 0 ? 1 : -1);
      
      // Fade out
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 - scrollProgress * 0.2;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0, -2]}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </mesh>
  );
}

// Glowing core with scroll interaction
function GlowingCore({ scrollProgress = 0 }) {
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (coreRef.current) {
      // Pulse effect
      const baseScale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Shrink and intensify with scroll
      const scrollScale = 1 - scrollProgress * 0.5;
      coreRef.current.scale.setScalar(baseScale * scrollScale);
      
      // Move backward with scroll
      coreRef.current.position.z = -3 - scrollProgress * 5;
      
      // Update material
      const material = coreRef.current.material as THREE.MeshStandardMaterial;
      if (material.opacity !== undefined) {
        material.opacity = 0.4 + scrollProgress * 0.3;
      }
    }
  });

  return (
    <mesh ref={coreRef} position={[0, 0, -3]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <MeshWobbleMaterial
        color="#8b5cf6"
        factor={0.3 + scrollProgress * 0.5}
        speed={2 + scrollProgress * 2}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

// Camera controller for scroll and mouse-based movement
function CameraController({ 
  scrollProgress = 0, 
  mousePosition = { x: 0, y: 0 } 
}: { 
  scrollProgress?: number; 
  mousePosition?: { x: number; y: number } 
}) {
  const { camera } = useThree();
  const smoothedMouse = useRef({ x: 0, y: 0 });
  
  useFrame(() => {
    // Smooth mouse following with easing
    smoothedMouse.current.x += (mousePosition.x - smoothedMouse.current.x) * 0.05;
    smoothedMouse.current.y += (mousePosition.y - smoothedMouse.current.y) * 0.05;
    
    // Base camera position from scroll
    const baseZ = 6 + scrollProgress * 2;
    const baseY = scrollProgress * -1;
    
    // Add mouse influence (reduced when scrolling)
    const mouseInfluence = 1 - scrollProgress * 0.7;
    const mouseOffsetX = smoothedMouse.current.x * 1.5 * mouseInfluence;
    const mouseOffsetY = smoothedMouse.current.y * 0.8 * mouseInfluence;
    
    // Apply camera position
    camera.position.x = mouseOffsetX;
    camera.position.y = baseY + mouseOffsetY;
    camera.position.z = baseZ;
    
    // Look at point follows mouse subtly
    const lookAtX = smoothedMouse.current.x * 0.5 * mouseInfluence;
    const lookAtY = scrollProgress * -0.5 + smoothedMouse.current.y * 0.3 * mouseInfluence;
    camera.lookAt(lookAtX, lookAtY, 0);
  });
  
  return null;
}

// Mouse-reactive light that follows cursor
function MouseLight({ mousePosition }: { mousePosition: { x: number; y: number } }) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.x = mousePosition.x * 5;
      lightRef.current.position.y = mousePosition.y * 3;
    }
  });
  
  return (
    <pointLight 
      ref={lightRef} 
      position={[0, 0, 3]} 
      intensity={0.8} 
      color="#a855f7" 
      distance={15}
    />
  );
}

// Scene wrapper that handles scroll and mouse
function Scene({ 
  scrollProgress, 
  mousePosition,
  onFeatureClick
}: { 
  scrollProgress: number; 
  mousePosition: { x: number; y: number };
  onFeatureClick: (feature: FeatureInfo) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[10, -10, 5]} intensity={0.5} color="#06b6d4" />
      <MouseLight mousePosition={mousePosition} />

      <CameraController scrollProgress={scrollProgress} mousePosition={mousePosition} />

      {/* Floating geometric shapes with feature tooltips */}
      <FloatingShape position={[-3.5, 1.5, -1]} shape="icosahedron" color="#8b5cf6" speed={0.8} scale={0.6} distort={0.4} scrollProgress={scrollProgress} scrollIntensity={1.2} featureKey="ai-agents" onShapeClick={onFeatureClick} />
      <FloatingShape position={[3.5, -1, 0]} shape="sphere" color="#06b6d4" speed={1.2} scale={0.5} distort={0.5} scrollProgress={scrollProgress} scrollIntensity={0.8} featureKey="knowledge-base" onShapeClick={onFeatureClick} />
      <FloatingShape position={[-2, -2, 1]} shape="torus" color="#d946ef" speed={0.6} scale={0.4} distort={0.2} scrollProgress={scrollProgress} scrollIntensity={1.5} featureKey="workflows" onShapeClick={onFeatureClick} />
      <FloatingShape position={[2.5, 2, -2]} shape="box" color="#8b5cf6" speed={1} scale={0.4} distort={0.3} scrollProgress={scrollProgress} scrollIntensity={1.0} featureKey="analytics" onShapeClick={onFeatureClick} />
      <FloatingShape position={[0, -2.5, -1]} shape="icosahedron" color="#06b6d4" speed={0.9} scale={0.35} distort={0.4} scrollProgress={scrollProgress} scrollIntensity={1.3} featureKey="collaboration" onShapeClick={onFeatureClick} />
      <FloatingShape position={[-4, 0, -2]} shape="sphere" color="#d946ef" speed={0.7} scale={0.3} distort={0.6} scrollProgress={scrollProgress} scrollIntensity={0.9} featureKey="integrations" onShapeClick={onFeatureClick} />
      <FloatingShape position={[4, 1, -1]} shape="torus" color="#8b5cf6" speed={1.1} scale={0.35} distort={0.2} scrollProgress={scrollProgress} scrollIntensity={1.1} featureKey="security" onShapeClick={onFeatureClick} />

      {/* Ambient elements */}
      <ParticleField count={300} scrollProgress={scrollProgress} />
      <AnimatedRing radius={4} color="#8b5cf6" scrollProgress={scrollProgress} index={0} />
      <AnimatedRing radius={3.2} color="#06b6d4" scrollProgress={scrollProgress} index={1} />
      <GlowingCore scrollProgress={scrollProgress} />
    </>
  );
}

// 3D Loading Screen Component
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      {/* Loading Animation */}
      <div className="relative w-32 h-32 mb-8">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 border-4 border-primary/20 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary"
            strokeDasharray={364}
            strokeDashoffset={364 - (364 * progress) / 100}
            style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
          />
        </svg>
        {/* Center icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="text-4xl">✨</div>
        </motion.div>
      </div>

      {/* Progress text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <div className="text-3xl font-bold text-foreground mb-2">
          {Math.round(progress)}%
        </div>
        <p className="text-muted-foreground text-sm">Preparing your experience...</p>
      </motion.div>

      {/* Animated dots */}
      <div className="flex gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function Hero3DScene() {
  const scrollProgress = useScrollProgress();
  const mousePosition = useMousePosition();
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Simulate loading progress (since we're not using useProgress outside Canvas)
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoaded(true), 500);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleFeatureClick = useCallback((feature: FeatureInfo) => {
    setSelectedFeature(feature);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  const handleExploreFeature = useCallback(() => {
    if (selectedFeature) {
      navigate(selectedFeature.route);
    }
  }, [selectedFeature, navigate]);

  return (
    <>
      {/* Loading Screen */}
      <AnimatePresence>
        {!isLoaded && <LoadingScreen progress={Math.min(loadProgress, 100)} />}
      </AnimatePresence>

      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 60 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <Scene 
            scrollProgress={scrollProgress} 
            mousePosition={mousePosition} 
            onFeatureClick={handleFeatureClick}
          />
        </Canvas>
      </div>

      {/* Feature Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-card border border-primary/20 rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-center">
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="text-5xl mb-4 block"
                >
                  {selectedFeature.icon}
                </motion.span>
                <h3 className="text-2xl font-bold text-foreground mb-3">{selectedFeature.title}</h3>
                <p className="text-muted-foreground mb-6">{selectedFeature.description}</p>
                
                <div className="flex gap-3 justify-center">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExploreFeature}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Explore Feature
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeModal}
                    className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Hero3DScene;
