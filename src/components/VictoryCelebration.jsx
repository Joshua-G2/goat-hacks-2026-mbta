import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, Center, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

function JumpingPerson() {
  const personRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Jumping animation
    if (personRef.current) {
      personRef.current.position.y = Math.abs(Math.sin(time * 4)) * 2;
      personRef.current.rotation.z = Math.sin(time * 8) * 0.2;
    }
  });

  return (
    <group ref={personRef}>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.8, 32]} />
        <meshStandardMaterial color="#4A90E2" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Arms - raised */}
      <mesh position={[-0.5, 1.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
      <mesh position={[0.5, 1.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.15, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#2C3E50" />
      </mesh>
      <mesh position={[0.15, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#2C3E50" />
      </mesh>
    </group>
  );
}

function Confetti() {
  const confettiRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (confettiRef.current) {
      confettiRef.current.children.forEach((piece, i) => {
        piece.position.y = 3 - (time * 2 + i * 0.2) % 4;
        piece.rotation.x = time * 2 + i;
        piece.rotation.y = time * 3 + i;
      });
    }
  });

  return (
    <group ref={confettiRef}>
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 6,
            Math.random() * 4,
            (Math.random() - 0.5) * 6
          ]}
        >
          <boxGeometry args={[0.1, 0.1, 0.02]} />
          <meshStandardMaterial 
            color={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5]}
            emissive={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5]}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function VictoryCelebration({ points = 0 }) {
  return (
    <div style={{ 
      width: '100%', 
      height: '400px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px'
    }}>
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#FFD700" />
        
        <JumpingPerson />
        <Confetti />
        
        <Center position={[0, 3.5, 0]}>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={0.5}
            height={0.1}
          >
            Victory!
            <MeshWobbleMaterial 
              color="#10b981" 
              factor={0.5}
              speed={2}
              emissive="#10b981"
              emissiveIntensity={0.3}
            />
          </Text3D>
        </Center>
        
        <Center position={[0, -1, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.3}
            height={0.05}
          >
            {`${points} Points!`}
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} />
          </Text3D>
        </Center>
      </Canvas>
    </div>
  );
}

export default VictoryCelebration;
