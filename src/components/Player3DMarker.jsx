import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

// 3D Emoji Character Component
function Character3D() {
  const meshRef = useRef();
  const floatOffset = useRef(0);

  // Animate floating and slight rotation
  useFrame(() => {
    if (meshRef.current) {
      floatOffset.current += 0.05;
      meshRef.current.position.y = Math.sin(floatOffset.current) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Center>
      <group ref={meshRef}>
        {/* Main Character Sphere */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FF8C00"
            emissiveIntensity={0.3}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
        
        {/* Emoji Face - Using a simple sprite texture approach */}
        <mesh position={[0, 0, 0.51]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial transparent opacity={1}>
            <primitive 
              attach="map" 
              object={useMemo(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                ctx.font = 'bold 100px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧍', 64, 64);
                const texture = new THREE.CanvasTexture(canvas);
                return texture;
              }, [])}
            />
          </meshBasicMaterial>
        </mesh>

        {/* Glow Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial 
            color="#00FFFF" 
            transparent 
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </Center>
  );
}

// Wrapper component for the 3D marker
function Player3DMarker() {
  return (
    <div style={{
      width: '80px',
      height: '80px',
      position: 'relative',
      pointerEvents: 'none'
    }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0EA5E9" />
        <Character3D />
      </Canvas>
    </div>
  );
}

export default Player3DMarker;
