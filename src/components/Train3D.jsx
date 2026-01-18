import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedTrain({ color = '#DA291C' }) {
  const trainRef = useRef();
  const smokeRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Gentle bobbing motion
    if (trainRef.current) {
      trainRef.current.position.y = Math.sin(time * 2) * 0.1;
    }
    
    // Pulsing smoke/steam effect
    if (smokeRef.current) {
      smokeRef.current.scale.set(
        1 + Math.sin(time * 3) * 0.1,
        1 + Math.cos(time * 3) * 0.1,
        1 + Math.sin(time * 3) * 0.1
      );
      smokeRef.current.material.opacity = 0.3 + Math.sin(time * 2) * 0.2;
    }
  });

  return (
    <group ref={trainRef}>
      {/* Train body */}
      <mesh castShadow>
        <boxGeometry args={[2, 1, 1]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Train front */}
      <mesh position={[1.2, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Windows */}
      <mesh position={[0, 0.3, 0.51]}>
        <boxGeometry args={[1.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Wheels */}
      {[-0.6, 0.6].map((x, i) => (
        <group key={i}>
          <mesh position={[x, -0.6, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
            <meshStandardMaterial color="#333" metalness={1} roughness={0.3} />
          </mesh>
          <mesh position={[x, -0.6, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
            <meshStandardMaterial color="#333" metalness={1} roughness={0.3} />
          </mesh>
        </group>
      ))}
      
      {/* Steam/smoke effect */}
      <mesh ref={smokeRef} position={[1.5, 0.8, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.4}
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

function Train3DCanvas({ color = '#DA291C', routeName = 'Red Line' }) {
  return (
    <div style={{ width: '200px', height: '200px' }}>
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />
        
        <AnimatedTrain color={color} />
        
        {/* Route name below train */}
        <Center position={[0, -1.5, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.3}
            height={0.05}
          >
            {routeName}
            <meshStandardMaterial color={color} metalness={0.5} />
          </Text3D>
        </Center>
        
        <OrbitControls 
          enableZoom={false}
          autoRotate
          autoRotateSpeed={2}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}

export default Train3DCanvas;
