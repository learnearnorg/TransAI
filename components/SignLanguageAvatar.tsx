import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Sphere, Cylinder, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Accessibility, Play, Loader2, RefreshCw, Info, MessageSquare, Globe } from 'lucide-react';
import { translateToSignLanguageGloss } from '../services/geminiService';

interface SignLanguageAvatarProps {
  sourceLang: string;
}

function Avatar({ isSigning }: { isSigning: boolean }) {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (isSigning) {
      // Frantic/expressive signing motion
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(t * 8) * 0.6 - 0.5;
        leftArmRef.current.rotation.z = Math.cos(t * 6) * 0.4 + 0.2;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = Math.cos(t * 7) * 0.6 - 0.5;
        rightArmRef.current.rotation.z = Math.sin(t * 9) * -0.4 - 0.2;
      }
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 3) * 0.2;
        headRef.current.rotation.x = Math.sin(t * 4) * 0.1;
      }
    } else {
      // Idle breathing motion
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.2, 0.1);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.2, 0.1);
      }
      if (headRef.current) {
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.1);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 0.1);
      }
    }
  });

  return (
    <group position={[0, -1.5, 0]}>
      {/* Head */}
      <Sphere ref={headRef} args={[0.4, 32, 32]} position={[0, 2.6, 0]}>
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.1} />
      </Sphere>
      {/* Body */}
      <Cylinder args={[0.6, 0.5, 1.6, 32]} position={[0, 1.4, 0]}>
        <meshStandardMaterial color="#4f46e5" roughness={0.7} />
      </Cylinder>
      {/* Left Arm Pivot */}
      <group ref={leftArmRef} position={[0.8, 2.0, 0]}>
        <Cylinder args={[0.15, 0.12, 1.2, 16]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </Cylinder>
        <Sphere args={[0.18, 16, 16]} position={[0, -1.1, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.4} />
        </Sphere>
      </group>
      {/* Right Arm Pivot */}
      <group ref={rightArmRef} position={[-0.8, 2.0, 0]}>
        <Cylinder args={[0.15, 0.12, 1.2, 16]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </Cylinder>
        <Sphere args={[0.18, 16, 16]} position={[0, -1.1, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.4} />
        </Sphere>
      </group>
    </group>
  );
}

export default function SignLanguageAvatar({ sourceLang }: SignLanguageAvatarProps) {
  const [sourceText, setSourceText] = useState('Hello, my name is TransAI. How can I help you today?');
  const [targetSignLang, setTargetSignLang] = useState('American Sign Language (ASL)');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [result, setResult] = useState<{ gloss: string; explanation: string } | null>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setResult(null);
    try {
      const res = await translateToSignLanguageGloss(sourceText, targetSignLang);
      setResult(res);
      
      // Simulate signing duration based on text length
      setIsSigning(true);
      const signDuration = Math.max(3000, res.gloss.split(' ').length * 800);
      setTimeout(() => {
        setIsSigning(false);
      }, signDuration);
      
    } catch (error) {
      console.error("Sign language translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-200">
            <Accessibility className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Sign Language Avatar</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Real-time 3D Accessibility
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <Globe size={16} className="text-indigo-400" />
          <select 
            value={targetSignLang}
            onChange={(e) => setTargetSignLang(e.target.value)}
            className="text-xs font-black text-slate-600 uppercase tracking-widest bg-transparent outline-none cursor-pointer"
          >
            <option value="American Sign Language (ASL)">ASL (American)</option>
            <option value="British Sign Language (BSL)">BSL (British)</option>
            <option value="French Sign Language (LSF)">LSF (French)</option>
            <option value="Japanese Sign Language (JSL)">JSL (Japanese)</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Controls Panel */}
        <div className="w-full lg:w-96 bg-white border-r border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-500" /> Spoken/Written Text
            </h3>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Enter text to translate to sign language..."
            />
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim() || isSigning}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isTranslating ? 'Translating...' : isSigning ? 'Avatar is Signing...' : 'Translate & Sign'}
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {result ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Accessibility size={16} className="text-emerald-500" /> {targetSignLang} Gloss
                </h3>
                <div className="p-4 bg-slate-900 rounded-xl shadow-inner">
                  <p className="text-lg font-black text-emerald-400 tracking-wider leading-relaxed">
                    {result.gloss}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Info size={16} className="text-blue-500" /> Linguistic Rationale
                </h3>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm font-medium text-blue-900 leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-6">
              <Accessibility size={48} className="text-slate-300 mb-4" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Enter text to see the ASL Gloss translation and avatar animation.
              </p>
            </div>
          )}
        </div>

        {/* 3D Canvas Area */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden cursor-move">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)] pointer-events-none" />
          
          <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Suspense fallback={null}>
              <Avatar isSigning={isSigning} />
              <Environment preset="city" />
              <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={10} blur={2} far={4} />
            </Suspense>
            
            <OrbitControls 
              enablePan={false} 
              minPolarAngle={Math.PI / 4} 
              maxPolarAngle={Math.PI / 1.5}
              minDistance={3}
              maxDistance={8}
            />
          </Canvas>

          {/* Overlay UI */}
          <div className="absolute bottom-8 left-0 w-full flex justify-center pointer-events-none">
            {isSigning && result && (
              <div className="px-6 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white text-xl font-black uppercase tracking-widest shadow-2xl animate-pulse">
                {result.gloss}
              </div>
            )}
          </div>
          
          <div className="absolute top-6 right-6 flex gap-2 pointer-events-none">
            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSigning ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
              {isSigning ? 'Signing Active' : 'Avatar Idle'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
