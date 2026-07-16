import React, { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment, ContactShadows, Float, Center, RoundedBox, Cylinder } from '@react-three/drei';
import { Box as BoxIcon, Type, Globe, RefreshCw, Loader2, Maximize, Cuboid, Monitor, MapPin } from 'lucide-react';
import { Box } from '@react-three/drei';
import { translatePowerhouse } from '../services/geminiService';
import { ProfessionalField, LinguisticPersona, StyleGuide } from '../types';

interface ARVRPreviewProps {
  sourceLang: string;
  targetLang: string;
  field: ProfessionalField;
  persona?: LinguisticPersona;
  customStyleGuide?: StyleGuide;
}

type EnvironmentType = 'billboard' | 'curved-screen' | 'product-box';

function Billboard({ text }: { text: string }) {
  return (
    <group position={[0, 1, 0]}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
        <RoundedBox args={[4, 2, 0.2]} radius={0.1} smoothness={4}>
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.2} />
        </RoundedBox>
        <Center position={[0, 0, 0.11]}>
          <Text
            fontSize={0.3}
            maxWidth={3.5}
            lineHeight={1.2}
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
            color="#ffffff"
            textAlign="center"
          >
            {text || "Enter text to preview"}
          </Text>
        </Center>
      </Float>
    </group>
  );
}

function CurvedScreen({ text }: { text: string }) {
  return (
    <group position={[0, 1, 0]}>
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
        <mesh>
          <cylinderGeometry args={[3, 3, 2, 32, 1, true, -Math.PI / 4, Math.PI / 2]} />
          <meshStandardMaterial color="#0f172a" side={2} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* We use a slightly smaller cylinder for the screen surface */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2.98, 2.98, 1.9, 32, 1, true, -Math.PI / 4.1, Math.PI / 2.05]} />
          <meshBasicMaterial color="#000000" side={2} />
        </mesh>
        {/* Text mapped onto the curve using a simple position trick, or just floating in front */}
        <Center position={[0, 0, 2.5]}>
          <Text
            fontSize={0.25}
            maxWidth={3}
            lineHeight={1.2}
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
            color="#38bdf8"
            textAlign="center"
          >
            {text || "Curved Display Preview"}
          </Text>
        </Center>
      </Float>
    </group>
  );
}

function ProductBox({ text }: { text: string }) {
  return (
    <group position={[0, 0.5, 0]}>
      <Float speed={2.5} rotationIntensity={0.4} floatIntensity={0.3}>
        <Box args={[1.5, 2, 1.5]}>
          <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.8} />
        </Box>
        <Center position={[0, 0, 0.76]}>
          <Text
            fontSize={0.15}
            maxWidth={1.2}
            lineHeight={1.2}
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
            color="#0f172a"
            textAlign="center"
          >
            {text || "Product Packaging"}
          </Text>
        </Center>
        <Center position={[0.76, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Text
            fontSize={0.1}
            maxWidth={1.2}
            lineHeight={1.2}
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
            color="#64748b"
            textAlign="center"
          >
            {text || "Side Panel"}
          </Text>
        </Center>
      </Float>
    </group>
  );
}

export default function ARVRPreview({ sourceLang, targetLang, field, persona, customStyleGuide }: ARVRPreviewProps) {
  const [sourceText, setSourceText] = useState('Experience the future of spatial computing.');
  const [translatedText, setTranslatedText] = useState('Découvrez l\'avenir de l\'informatique spatiale.');
  const [isTranslating, setIsTranslating] = useState(false);
  const [envType, setEnvType] = useState<EnvironmentType>('billboard');

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    try {
      const result = await translatePowerhouse(
        sourceText,
        sourceLang,
        targetLang,
        field,
        [],
        'Standard',
        '',
        persona,
        [],
        customStyleGuide?.instructions || ''
      );
      setTranslatedText(result.text);
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-translate on mount if we have default text
  useEffect(() => {
    handleTranslate();
  }, [targetLang]);

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <Cuboid className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Spatial Context Preview</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              AR/VR 3D Environment Testing
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Controls Panel */}
        <div className="w-full lg:w-96 bg-white border-r border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-xl">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Type size={16} className="text-indigo-500" /> Source Text
            </h3>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Enter text to visualize in 3D..."
            />
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isTranslating ? 'Translating...' : 'Translate & Update'}
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={16} className="text-emerald-500" /> Spatial Environment
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setEnvType('billboard')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  envType === 'billboard' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Maximize size={18} className={envType === 'billboard' ? 'text-indigo-500' : 'text-slate-400'} />
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-wider">Digital Signage</div>
                  <div className="text-[10px] text-slate-400">Large format outdoor display</div>
                </div>
              </button>
              
              <button
                onClick={() => setEnvType('curved-screen')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  envType === 'curved-screen' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Monitor size={18} className={envType === 'curved-screen' ? 'text-indigo-500' : 'text-slate-400'} />
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-wider">Curved HUD</div>
                  <div className="text-[10px] text-slate-400">Immersive VR interface</div>
                </div>
              </button>

              <button
                onClick={() => setEnvType('product-box')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  envType === 'product-box' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BoxIcon size={18} className={envType === 'product-box' ? 'text-indigo-500' : 'text-slate-400'} />
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-wider">Product Packaging</div>
                  <div className="text-[10px] text-slate-400">Physical retail box</div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Tip: Click and drag the 3D view to rotate. Scroll to zoom in and out.
            </p>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden cursor-move">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1)_0%,transparent_70%)] pointer-events-none" />
          
          <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Suspense fallback={null}>
              {envType === 'billboard' && <Billboard text={translatedText} />}
              {envType === 'curved-screen' && <CurvedScreen text={translatedText} />}
              {envType === 'product-box' && <ProductBox text={translatedText} />}
              
              <Environment preset="city" />
              <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
            </Suspense>
            
            <OrbitControls 
              enablePan={false} 
              minPolarAngle={Math.PI / 4} 
              maxPolarAngle={Math.PI / 1.5}
              minDistance={2}
              maxDistance={10}
            />
          </Canvas>

          {/* Overlay UI */}
          <div className="absolute top-6 right-6 flex gap-2 pointer-events-none">
            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
              Live Render
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
