"use client";

import { useRef, useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Stars, RoundedBox, Text, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

/* ───────────────────── SEEDED RANDOM FOR SSR/CSR ────────────────────── */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ─────────────────── ANIMATED DOT GRID BACKGROUND ───────────────────── */

function AnimatedDotGrid() {
  return (
    <>
      <style jsx global>{`
        @keyframes dotDrift {
          0% { background-position: 0px 0px; }
          100% { background-position: 40px 40px; }
        }
      `}</style>
      <div
        className="fixed inset-0 z-0 opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'dotDrift 20s linear infinite',
        }}
      />
    </>
  );
}

/* ──────────────────── FLOATING RECEIPT ICONS ────────────────────────── */

const FLOATING_ICONS = [
  // Receipt
  "M4 2C3.45 2 3 2.45 3 3v17.59c0 .66.75 1.04 1.28.65L6 19.86l1.72 1.38c.39.31.94.31 1.33 0L10.5 19.86l1.45 1.16c.39.31.94.31 1.33 0L14.5 19.86l1.72 1.38c.53.39 1.28.01 1.28-.65V3c0-.55-.45-1-1-1H4zm10 12H7v-1.5h7V14zm1-3H7v-1.5h8V11zm0-3H7V6.5h8V8z",
  // Credit card
  "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  // Dollar
  "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  // Shopping bag
  "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  // Chart
  "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
];

function FloatingReceipts() {
  const receipts = useMemo(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 25 }, (_, i) => {
      const size = 24 + rand() * 36;
      const iconIndex = Math.floor(rand() * FLOATING_ICONS.length);
      const left = rand() * 100;
      const top = rand() * 100;
      const duration = 15 + rand() * 25;
      const delay = rand() * -40;
      const yDrift = 40 + rand() * 80;
      const xDrift = 20 + rand() * 60;
      const rotateDeg = -20 + rand() * 40;
      const opacity = 0.08 + rand() * 0.12;
      const directionY = rand() > 0.5 ? 1 : -1;
      const directionX = rand() > 0.5 ? 1 : -1;

      return {
        id: i,
        size,
        left,
        top,
        duration,
        delay,
        yDrift: yDrift * directionY,
        xDrift: xDrift * directionX,
        rotateDeg,
        opacity,
        iconIndex,
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {receipts.map((r) => (
        <motion.div
          key={r.id}
          className="absolute"
          style={{
            left: `${r.left}%`,
            top: `${r.top}%`,
            width: r.size,
            height: r.size * 1.3,
            opacity: r.opacity,
          }}
          animate={{
            y: [0, r.yDrift, 0],
            x: [0, r.xDrift, 0],
            rotate: [0, r.rotateDeg, 0],
          }}
          transition={{
            duration: r.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: r.delay,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill={r.iconIndex === 0 ? "#a1a1aa" : "none"}
            stroke={r.iconIndex === 0 ? "none" : "#a1a1aa"}
            strokeWidth={r.iconIndex === 0 ? 0 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full"
          >
            <path d={FLOATING_ICONS[r.iconIndex]} />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────── SECTION GLOW COMPONENT ────────────────────────── */

function PulsingGlow({
  color,
  className,
  duration = 5,
  minOpacity = 0.5,
  maxOpacity = 1,
}: {
  color: string;
  className: string;
  duration?: number;
  minOpacity?: number;
  maxOpacity?: number;
}) {
  return (
    <motion.div
      className={className}
      style={{ background: color }}
      animate={{ opacity: [minOpacity, maxOpacity, minOpacity] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/* ─────────────────────────── 3D RECEIPT CARD ─────────────────────────── */

function ReceiptCard() {
  const meshRef = useRef<THREE.Group>(null!);
  const mouse = useMotionValue({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.set({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [mouse]);

  useFrame(() => {
    if (!meshRef.current) return;
    const m = mouse.get();
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      m.x * 0.3,
      0.05
    );
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      m.y * 0.15,
      0.05
    );
  });

  const receiptLines = [
    { text: "RECEIPTS", y: 1.1, size: 0.18, bold: true },
    { text: "━━━━━━━━━━━━━━━━━", y: 0.85, size: 0.1, bold: false },
    { text: "Organic Avocados  x2", y: 0.55, size: 0.09, bold: false },
    { text: "                $4.98", y: 0.55, size: 0.09, bold: false },
    { text: "Sourdough Bread", y: 0.3, size: 0.09, bold: false },
    { text: "                $5.49", y: 0.3, size: 0.09, bold: false },
    { text: "Oat Milk Latte", y: 0.05, size: 0.09, bold: false },
    { text: "                $6.75", y: 0.05, size: 0.09, bold: false },
    { text: "━━━━━━━━━━━━━━━━━", y: -0.2, size: 0.1, bold: false },
    { text: "SUBTOTAL        $17.22", y: -0.45, size: 0.09, bold: false },
    { text: "TAX              $1.38", y: -0.65, size: 0.09, bold: false },
    { text: "━━━━━━━━━━━━━━━━━", y: -0.85, size: 0.1, bold: false },
    { text: "TOTAL           $18.60", y: -1.05, size: 0.12, bold: true },
  ];

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={meshRef}>
        {/* Card body */}
        <RoundedBox args={[2.4, 3.2, 0.04]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial
            color="#fafaf9"
            roughness={0.6}
            clearcoat={0.3}
            clearcoatRoughness={0.4}
          />
        </RoundedBox>

        {/* Receipt text */}
        {receiptLines.map((line, i) => (
          <Text
            key={i}
            position={[-0.95, line.y, 0.025]}
            fontSize={line.size}
            color="#1c1917"
            anchorX="left"
            anchorY="middle"
            font="/fonts/SpaceMono-Regular.ttf"
            fontWeight={line.bold ? "bold" : "normal"}
          >
            {line.text}
          </Text>
        ))}

        {/* Subtle paper edge shadow */}
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[2.5, 3.3, 0.01]} />
          <meshBasicMaterial color="#000" transparent opacity={0.1} />
        </mesh>
      </group>
    </Float>
  );
}

/* ─────────────────────── 3D PHONE + NFC WAVES ────────────────────────── */

function PhoneMockup() {
  const groupRef = useRef<THREE.Group>(null!);
  const waveRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.1;

    waveRefs.current.forEach((wave, i) => {
      if (!wave) return;
      const t = (clock.elapsedTime * 0.8 + i * 0.6) % 2;
      const scale = 1 + t * 0.6;
      wave.scale.set(scale, scale, 1);
      wave.material instanceof THREE.MeshBasicMaterial &&
        (wave.material.opacity = Math.max(0, 0.5 - t * 0.3));
    });
  });

  return (
    <group ref={groupRef}>
      {/* Phone body */}
      <RoundedBox args={[1.4, 2.6, 0.12]} radius={0.12} smoothness={4}>
        <meshPhysicalMaterial
          color="#18181b"
          roughness={0.3}
          metalness={0.8}
          clearcoat={1}
        />
      </RoundedBox>

      {/* Screen */}
      <RoundedBox
        args={[1.2, 2.3, 0.01]}
        radius={0.08}
        smoothness={4}
        position={[0, 0, 0.065]}
      >
        <meshBasicMaterial color="#0a0a0a" />
      </RoundedBox>

      {/* Screen content - receipt on phone */}
      <Text
        position={[0, 0.7, 0.08]}
        fontSize={0.1}
        color="#10b981"
        anchorX="center"
      >
        Receipt Saved
      </Text>
      <Text
        position={[0, 0.4, 0.08]}
        fontSize={0.07}
        color="#71717a"
        anchorX="center"
      >
        Whole Foods Market
      </Text>
      <Text
        position={[0, 0.15, 0.08]}
        fontSize={0.15}
        color="#fafafa"
        anchorX="center"
      >
        $18.60
      </Text>
      <Text
        position={[0, -0.15, 0.08]}
        fontSize={0.06}
        color="#52525b"
        anchorX="center"
      >
        Tap confirmed  •  No paper
      </Text>

      {/* NFC waves */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) waveRefs.current[i] = el; }}
          position={[0, -1.6, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.3 + i * 0.15, 0.35 + i * 0.15, 32]} />
          <meshBasicMaterial
            color="#10b981"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────── 3D SCENE WRAPPER ────────────────────────── */

function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-3, 2, 4]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[3, -2, 4]} intensity={0.3} color="#10b981" />

      <Stars
        radius={80}
        depth={60}
        count={1500}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />

      <Suspense fallback={null}>
        <ReceiptCard />
      </Suspense>
    </Canvas>
  );
}

function SolutionScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 5]} intensity={0.6} />
      <pointLight position={[0, -2, 3]} intensity={0.8} color="#10b981" />

      <Suspense fallback={null}>
        <PhoneMockup />
      </Suspense>
    </Canvas>
  );
}

/* ─────────────────────── ANIMATED COUNTER ─────────────────────────────── */

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 2000 });

  useEffect(() => {
    if (isInView) motionVal.set(target);
  }, [isInView, motionVal, target]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent =
          target >= 1000000
            ? (v / 1000000).toFixed(1) + "M"
            : target >= 1000
              ? (v / 1000).toFixed(0) + "K"
              : v.toFixed(0);
      }
    });
    return unsubscribe;
  }, [spring, target]);

  return (
    <>
      <span ref={ref}>0</span>
      {suffix}
    </>
  );
}

/* ─────────────────────────── SECTION COMPONENTS ──────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 60 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } as const,
};

const stagger = {
  hidden: {} as const,
  visible: { transition: { staggerChildren: 0.15 } } as const,
};

function HeroSection() {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Section-specific glows: violet + emerald pulse */}
      <PulsingGlow
        color="radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)"
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[80px] pointer-events-none z-[2]"
        duration={5}
        minOpacity={0.4}
        maxOpacity={0.9}
      />
      <PulsingGlow
        color="radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)"
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[80px] pointer-events-none z-[2]"
        duration={6}
        minOpacity={0.3}
        maxOpacity={0.8}
      />

      {/* 3D background */}
      {webglOk && <HeroScene />}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/30 via-transparent to-[#050507] pointer-events-none z-10" />

      {/* Text overlay */}
      <motion.div
        className="relative z-20 text-center px-6"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter"
        >
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-emerald-400 bg-clip-text text-transparent">
            The Future
          </span>
          <br />
          <span className="text-white">of Receipts</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-lg mx-auto font-light tracking-wide"
        >
          Every purchase. Every store. One app.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex gap-4 justify-center">
          <Link
            href="/signup"
            className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-medium text-sm tracking-wide overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/20"
          >
            <span className="relative z-10">Get Started Free</span>
            <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-full border border-white/10 text-zinc-400 font-medium text-sm tracking-wide hover:text-white hover:border-white/20 transition-all"
          >
            Sign In
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-zinc-600 text-xs tracking-[0.3em] uppercase">Scroll</span>
        <motion.div
          className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center pt-1.5"
        >
          <motion.div
            className="w-1 h-1.5 rounded-full bg-zinc-500"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-200px" });

  const stats = [
    { value: 3000000000, label: "lbs of waste per year", suffix: "+" },
    { value: 93, label: "contain toxic BPA", suffix: "%" },
    { value: 90, label: "end up in landfills", suffix: "%" },
  ];

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center py-32 px-6">
      {/* Red/orange glow — enhanced with pulsing animation */}
      <PulsingGlow
        color="radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        duration={5}
        minOpacity={0.4}
        maxOpacity={1}
      />
      <PulsingGlow
        color="radial-gradient(circle, rgba(234,88,12,0.05) 0%, transparent 70%)"
        className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
        duration={4}
        minOpacity={0.3}
        maxOpacity={0.9}
      />

      <motion.div
        className="max-w-4xl mx-auto text-center"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={stagger}
      >
        <motion.p
          variants={fadeUp}
          className="text-red-400/80 text-sm font-medium tracking-[0.2em] uppercase mb-6"
        >
          The Problem
        </motion.p>

        <motion.h2
          variants={fadeUp}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]"
        >
          Americans waste{" "}
          <span className="text-red-400">
            <Counter target={12400000} />
          </span>{" "}
          trees per year on receipts
        </motion.h2>

        <motion.div
          variants={fadeUp}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
            >
              <div className="text-3xl sm:text-4xl font-black text-white">
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-2 text-zinc-500 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function SolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-200px" });
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center py-32 px-6">
      {/* Emerald glow — enhanced with pulsing animation */}
      <PulsingGlow
        color="radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        duration={5}
        minOpacity={0.4}
        maxOpacity={1}
      />
      <PulsingGlow
        color="radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)"
        className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none"
        duration={6}
        minOpacity={0.3}
        maxOpacity={0.8}
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* 3D Phone */}
        <div className="relative h-[500px] order-2 lg:order-1">
          {webglOk && <SolutionScene />}
        </div>

        {/* Text */}
        <motion.div
          className="order-1 lg:order-2"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            className="text-emerald-400/80 text-sm font-medium tracking-[0.2em] uppercase mb-6"
          >
            The Solution
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]"
          >
            One tap.{" "}
            <span className="text-emerald-400">Zero paper.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-zinc-400 text-lg leading-relaxed"
          >
            Connect your email, tap at checkout, or snap a photo.
            Every receipt lands in one place — organized, searchable,
            and ready for tax time.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 space-y-4">
            {[
              "Auto-import from Gmail, Outlook",
              "NFC tap at any POS terminal",
              "Works with Amazon, Walmart, Target, Uber + more",
              "AI-powered receipt parsing",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-zinc-300 text-sm">{feature}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-150px" });

  const steps = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-9.86a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      title: "Connect",
      desc: "Link your email, stores, and payment accounts in seconds.",
      color: "violet",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      ),
      title: "Capture",
      desc: "Receipts are auto-parsed with AI. Or snap a photo of paper ones.",
      color: "emerald",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
      ),
      title: "Organize",
      desc: "Search, categorize, and get spending insights automatically.",
      color: "fuchsia",
    },
  ];

  const colorMap: Record<string, string> = {
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/10 group-hover:border-violet-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/10 group-hover:border-emerald-500/30",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-600/5 border-fuchsia-500/10 group-hover:border-fuchsia-500/30",
  };

  const iconColorMap: Record<string, string> = {
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    fuchsia: "text-fuchsia-400",
  };

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center py-32 px-6">
      {/* Fuchsia glow — pulsing animation */}
      <PulsingGlow
        color="radial-gradient(circle, rgba(217,70,239,0.06) 0%, transparent 70%)"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        duration={4.5}
        minOpacity={0.3}
        maxOpacity={1}
      />
      <PulsingGlow
        color="radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)"
        className="absolute top-1/4 right-1/3 w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none"
        duration={5.5}
        minOpacity={0.2}
        maxOpacity={0.7}
      />

      <motion.div
        className="max-w-5xl mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="text-center mb-16">
          <p className="text-zinc-500 text-sm font-medium tracking-[0.2em] uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Three steps to paperless
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={`group relative p-8 rounded-2xl bg-gradient-to-b ${colorMap[step.color]} border backdrop-blur-sm transition-all duration-500 hover:translate-y-[-4px]`}
            >
              <div className="absolute top-6 right-6 text-6xl font-black text-white/[0.03]">
                {i + 1}
              </div>
              <div className={`${iconColorMap[step.color]} mb-6`}>{step.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative min-h-[80vh] flex items-center justify-center py-32 px-6">
      {/* Dual glow — enhanced with pulsing animations */}
      <PulsingGlow
        color="radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)"
        className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
        duration={5}
        minOpacity={0.4}
        maxOpacity={1}
      />
      <PulsingGlow
        color="radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)"
        className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
        duration={6}
        minOpacity={0.3}
        maxOpacity={0.9}
      />

      <motion.div
        className="text-center max-w-2xl mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={stagger}
      >
        <motion.h2
          variants={fadeUp}
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[1.05]"
        >
          Save Trees.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">
            Use eReceipts.
          </span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-zinc-400 text-lg max-w-md mx-auto"
        >
          Join the movement to eliminate paper waste.
          Your receipts, digitized and organized forever.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="group relative inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-semibold tracking-wide shadow-2xl shadow-violet-500/20 transition-all hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10">Get Started Free</span>
            <svg
              className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
          </Link>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-zinc-600 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── MAIN EXPORT ─────────────────────────────── */

export default function ReceiptStorm() {
  return (
    <div className="bg-[#050507]">
      {/* Background layer 1: Animated dot grid */}
      <AnimatedDotGrid />

      {/* Background layer 2: Floating receipt icons */}
      <FloatingReceipts />

      {/* Page sections (z-10+ content sits above background layers) */}
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <CTASection />
    </div>
  );
}
