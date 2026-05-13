"use client";

import { useRef, useMemo } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Receipt SVG — crumpled paper shapes
// ---------------------------------------------------------------------------

const RECEIPT_PATHS = [
  // Variant A – tall crumpled receipt
  "M4 0C3 2 1 3 0 6L1 14C2 16 0 18 1 22L2 30C1 32 3 34 4 36L8 36C9 34 11 33 12 30L11 22C12 19 10 17 11 14L12 6C11 3 9 1 8 0Z",
  // Variant B – wider crumple
  "M2 0C0 3 1 5 0 8L2 16C0 19 2 22 1 26L3 34C5 36 7 35 10 36L12 34C14 32 13 28 14 26L12 18C14 15 12 12 14 8L12 2C10 0 6 1 2 0Z",
  // Variant C – narrow slip
  "M3 0C2 1 1 3 0 5L1 12C0 15 2 17 1 20L2 28C1 31 3 33 3 36L7 36C7 33 9 31 8 28L9 20C8 17 10 15 9 12L10 5C9 3 8 1 7 0Z",
  // Variant D – wavy edges
  "M1 0C0 4 2 6 1 10L0 18C2 21 0 24 2 28L1 34C3 36 5 36 8 36L10 34C12 30 10 26 12 22L11 16C13 12 11 8 12 4L10 0C7 1 4 1 1 0Z",
  // Variant E – compact receipt
  "M3 0C1 2 0 4 1 8L0 14C2 17 1 20 2 24L4 28C3 30 5 30 7 28L9 24C10 20 8 17 10 14L9 8C10 4 9 2 7 0Z",
];

function ReceiptSVG({ variant, color }: { variant: number; color: string }) {
  const path = RECEIPT_PATHS[variant % RECEIPT_PATHS.length];
  return (
    <svg
      viewBox="0 0 14 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <path d={path} fill={color} fillOpacity={0.85} />
      {/* faint crumple lines */}
      <line
        x1="3"
        y1="8"
        x2="10"
        y2="10"
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={0.4}
      />
      <line
        x1="2"
        y1="18"
        x2="11"
        y2="16"
        stroke={color}
        strokeOpacity={0.25}
        strokeWidth={0.3}
      />
      <line
        x1="4"
        y1="26"
        x2="9"
        y2="24"
        stroke={color}
        strokeOpacity={0.2}
        strokeWidth={0.35}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Data generation — deterministic so SSR/CSR match
// ---------------------------------------------------------------------------

interface ReceiptData {
  id: number;
  x: number; // vw percentage for left
  size: number; // px
  rotation: number;
  variant: number;
  color: string;
  speedOffset: number; // 0-1, affects fall timing
  swayAmount: number;
  originSide: "top" | "left" | "right";
}

function generateReceipts(count: number): ReceiptData[] {
  const rand = seededRandom(42);
  const colors = [
    "#e4e4e7", // zinc-200
    "#d4d4d8", // zinc-300
    "#a1a1aa", // zinc-400
    "#f5f5f4", // stone-100
    "#e7e5e4", // stone-200
    "#d6d3d1", // stone-300
    "#fafaf9", // stone-50
  ];
  const receipts: ReceiptData[] = [];
  for (let i = 0; i < count; i++) {
    const originSide: "top" | "left" | "right" =
      rand() < 0.5 ? "top" : rand() < 0.5 ? "left" : "right";
    receipts.push({
      id: i,
      x: rand() * 90 + 5,
      size: 28 + rand() * 40,
      rotation: rand() * 720 - 360,
      variant: Math.floor(rand() * RECEIPT_PATHS.length),
      color: colors[Math.floor(rand() * colors.length)],
      speedOffset: rand(),
      swayAmount: rand() * 60 - 30,
      originSide,
    });
  }
  return receipts;
}

// ---------------------------------------------------------------------------
// Single animated receipt
// ---------------------------------------------------------------------------

function AnimatedReceipt({
  receipt,
  scrollProgress,
}: {
  receipt: ReceiptData;
  scrollProgress: MotionValue<number>;
}) {
  // Phase 1: fall (0 -> 0.20), Phase 2: pile (0.20 -> 0.40)
  const fallStart = receipt.speedOffset * 0.08;
  const fallEnd = 0.18 + receipt.speedOffset * 0.06;
  const pileEnd = 0.35 + receipt.speedOffset * 0.05;

  // Starting position based on origin side
  const startY =
    receipt.originSide === "top"
      ? -150
      : -80 + receipt.speedOffset * -100;
  const startX =
    receipt.originSide === "left"
      ? -120
      : receipt.originSide === "right"
        ? 120
        : receipt.swayAmount;

  // Final pile position at bottom
  const pileY = 600 + (1 - receipt.speedOffset) * 180;
  const pileX = (receipt.x - 50) * 0.4;

  const y = useTransform(
    scrollProgress,
    [fallStart, fallEnd, pileEnd, 0.5],
    [startY, pileY * 0.7, pileY, pileY + 20]
  );

  const x = useTransform(
    scrollProgress,
    [fallStart, fallEnd, pileEnd],
    [startX, receipt.swayAmount * 0.3, pileX]
  );

  const rotate = useTransform(
    scrollProgress,
    [fallStart, fallEnd, pileEnd],
    [0, receipt.rotation, receipt.rotation * 0.5]
  );

  const opacity = useTransform(
    scrollProgress,
    [fallStart, fallStart + 0.01, 0.42, 0.52],
    [0, 1, 1, 0.15]
  );

  const scale = useTransform(
    scrollProgress,
    [fallStart, fallEnd, pileEnd, 0.55],
    [0.6, 1, 0.85, 0.6]
  );

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${receipt.x}%`,
        top: "15%",
        width: receipt.size,
        height: receipt.size * 2.5,
        y,
        x,
        rotate,
        opacity,
        scale,
        zIndex: Math.floor(receipt.speedOffset * 50),
      }}
    >
      <ReceiptSVG variant={receipt.variant} color={receipt.color} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// POS / Card-tap Machine
// ---------------------------------------------------------------------------

function POSMachine({
  scrollProgress,
}: {
  scrollProgress: MotionValue<number>;
}) {
  const y = useTransform(scrollProgress, [0.38, 0.52], [400, 0]);
  const opacity = useTransform(scrollProgress, [0.38, 0.46], [0, 1]);
  const scale = useTransform(scrollProgress, [0.38, 0.52], [0.7, 1]);

  // NFC wave pulse
  const nfcOpacity = useTransform(
    scrollProgress,
    [0.46, 0.5, 0.54, 0.58],
    [0, 1, 1, 0.6]
  );

  return (
    <motion.div
      className="absolute left-1/2 bottom-[18%] -translate-x-1/2 z-30"
      style={{ y, opacity, scale }}
    >
      <div className="relative w-[160px] h-[240px]">
        {/* Machine body */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 shadow-2xl shadow-black/60">
          {/* Screen */}
          <div className="mx-4 mt-4 h-[72px] rounded-lg bg-gradient-to-br from-emerald-400/90 to-teal-500/90 border border-emerald-300/30 flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <div className="text-[8px] font-mono text-emerald-950/70 tracking-wider">
                TAP TO PAY
              </div>
              <div className="text-[18px] font-bold text-emerald-950/80 tracking-tight">
                $0.00
              </div>
              <div className="text-[7px] font-mono text-emerald-950/50">
                GO PAPERLESS
              </div>
            </div>
          </div>

          {/* Keypad grid */}
          <div className="mx-4 mt-3 grid grid-cols-3 gap-[5px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((key, i) => (
              <div
                key={i}
                className="h-[18px] rounded-[3px] bg-zinc-700/80 border border-zinc-600/40 flex items-center justify-center"
              >
                <span className="text-[7px] text-zinc-400 font-mono">
                  {key}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mx-4 mt-2 flex gap-1">
            <div className="flex-1 h-[14px] rounded-sm bg-red-900/60 border border-red-800/40" />
            <div className="flex-1 h-[14px] rounded-sm bg-yellow-900/60 border border-yellow-800/40" />
            <div className="flex-1 h-[14px] rounded-sm bg-emerald-900/60 border border-emerald-800/40" />
          </div>

          {/* Card slot */}
          <div className="mx-6 mt-3 h-[8px] rounded-full bg-zinc-950 border border-zinc-700/50 shadow-inner" />
        </div>

        {/* NFC wave indicator */}
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2"
          style={{ opacity: nfcOpacity }}
        >
          <svg
            width="60"
            height="40"
            viewBox="0 0 60 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30 36C30 36 22 28 22 20C22 12 30 4 30 4"
              stroke="#34d399"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M30 36C30 36 18 26 18 20C18 14 30 4 30 4"
              stroke="#34d399"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M30 36C30 36 14 24 14 20C14 16 30 4 30 4"
              stroke="#34d399"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.2"
            />
            <path
              d="M30 36C30 36 38 28 38 20C38 12 30 4 30 4"
              stroke="#34d399"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M30 36C30 36 42 26 42 20C42 14 30 4 30 4"
              stroke="#34d399"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M30 36C30 36 46 24 46 20C46 16 30 4 30 4"
              stroke="#34d399"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.2"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tree — trunk, branches, leaves
// ---------------------------------------------------------------------------

interface BranchData {
  angle: number;
  length: number;
  startY: number;
  side: "left" | "right";
  leafCount: number;
  leafDelay: number;
}

const BRANCHES: BranchData[] = [
  { angle: -35, length: 55, startY: 50, side: "left", leafCount: 4, leafDelay: 0 },
  { angle: 30, length: 50, startY: 55, side: "right", leafCount: 3, leafDelay: 0.01 },
  { angle: -45, length: 65, startY: 35, side: "left", leafCount: 5, leafDelay: 0.02 },
  { angle: 40, length: 60, startY: 30, side: "right", leafCount: 4, leafDelay: 0.03 },
  { angle: -25, length: 45, startY: 20, side: "left", leafCount: 3, leafDelay: 0.04 },
  { angle: 20, length: 40, startY: 15, side: "right", leafCount: 4, leafDelay: 0.05 },
  { angle: -10, length: 30, startY: 5, side: "left", leafCount: 3, leafDelay: 0.06 },
];

function LeafCluster({
  cx,
  cy,
  count,
  scrollProgress,
  bloomStart,
}: {
  cx: number;
  cy: number;
  count: number;
  scrollProgress: MotionValue<number>;
  bloomStart: number;
}) {
  const scale = useTransform(
    scrollProgress,
    [bloomStart, bloomStart + 0.06],
    [0, 1]
  );
  const opacity = useTransform(
    scrollProgress,
    [bloomStart, bloomStart + 0.04],
    [0, 1]
  );

  const rand = seededRandom(cx * 100 + cy);
  const leaves = useMemo(() => {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        dx: rand() * 24 - 12,
        dy: rand() * 20 - 10,
        size: 6 + rand() * 8,
        hue: 120 + rand() * 40,
        lightness: 35 + rand() * 20,
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cx, cy]);

  return (
    <motion.g style={{ scale, opacity, originX: `${cx}px`, originY: `${cy}px` }}>
      {leaves.map((leaf, i) => (
        <ellipse
          key={i}
          cx={cx + leaf.dx}
          cy={cy + leaf.dy}
          rx={leaf.size}
          ry={leaf.size * 0.7}
          fill={`hsl(${leaf.hue}, 55%, ${leaf.lightness}%)`}
          fillOpacity={0.85}
        />
      ))}
    </motion.g>
  );
}

function Tree({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const trunkHeight = useTransform(scrollProgress, [0.5, 0.62], [0, 200]);
  const trunkOpacity = useTransform(scrollProgress, [0.5, 0.54], [0, 1]);
  const treeY = useTransform(scrollProgress, [0.5, 0.58], [60, 0]);
  const treeScale = useTransform(scrollProgress, [0.5, 0.65], [0.8, 1]);

  return (
    <motion.div
      className="absolute left-1/2 bottom-[28%] -translate-x-1/2 z-20"
      style={{ y: treeY, scale: treeScale }}
    >
      <svg
        width="260"
        height="320"
        viewBox="0 0 260 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Trunk */}
        <motion.rect
          x="120"
          y="120"
          width="20"
          rx="4"
          fill="url(#trunkGrad)"
          style={{ height: trunkHeight, opacity: trunkOpacity }}
        />

        {/* Branches */}
        {BRANCHES.map((branch, i) => {
          const bx = branch.side === "left" ? 120 : 140;
          const by = 120 + branch.startY * 1.6;
          const endX =
            bx +
            Math.cos((branch.angle * Math.PI) / 180) * branch.length *
              (branch.side === "left" ? -1 : 1);
          const endY = by + Math.sin((branch.angle * Math.PI) / 180) * branch.length * -1;

          return (
            <BranchLine
              key={i}
              x1={bx}
              y1={by}
              x2={endX}
              y2={endY}
              scrollProgress={scrollProgress}
              drawStart={0.56 + i * 0.015}
              branch={branch}
              endX={endX}
              endY={endY}
            />
          );
        })}

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

function BranchLine({
  x1,
  y1,
  x2,
  y2,
  scrollProgress,
  drawStart,
  branch,
  endX,
  endY,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  scrollProgress: MotionValue<number>;
  drawStart: number;
  branch: BranchData;
  endX: number;
  endY: number;
}) {
  const pathOpacity = useTransform(
    scrollProgress,
    [drawStart, drawStart + 0.03],
    [0, 1]
  );

  const pathLength = useTransform(
    scrollProgress,
    [drawStart, drawStart + 0.05],
    [0, 1]
  );

  return (
    <>
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#78350f"
        strokeWidth={3}
        strokeLinecap="round"
        style={{ opacity: pathOpacity, pathLength }}
      />
      <LeafCluster
        cx={endX}
        cy={endY}
        count={branch.leafCount}
        scrollProgress={scrollProgress}
        bloomStart={drawStart + 0.04 + branch.leafDelay}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Final message with shimmer effect
// ---------------------------------------------------------------------------

function FinalMessage({
  scrollProgress,
}: {
  scrollProgress: MotionValue<number>;
}) {
  const opacity = useTransform(scrollProgress, [0.76, 0.84], [0, 1]);
  const y = useTransform(scrollProgress, [0.76, 0.86], [80, 0]);
  const scale = useTransform(scrollProgress, [0.76, 0.86], [0.9, 1]);

  const btnOpacity = useTransform(scrollProgress, [0.86, 0.92], [0, 1]);
  const btnY = useTransform(scrollProgress, [0.86, 0.92], [30, 0]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none"
      style={{ opacity }}
    >
      <motion.div className="text-center px-6" style={{ y, scale }}>
        <h2 className="relative text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
          <span className="relative inline-block">
            Save Trees,
            {/* Shimmer overlay */}
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]"
              aria-hidden="true"
            />
          </span>
          <br />
          <span className="relative inline-block text-emerald-400">
            Use eReceipts
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent animate-shimmer bg-[length:200%_100%]"
              aria-hidden="true"
            />
          </span>
        </h2>
        <p className="mt-4 text-zinc-400 text-lg sm:text-xl max-w-md mx-auto">
          Digitize every receipt. Reduce waste. Track spending effortlessly.
        </p>
      </motion.div>

      <motion.div
        className="mt-10 pointer-events-auto"
        style={{ opacity: btnOpacity, y: btnY }}
      >
        <Link
          href="/signup"
          className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-105 active:scale-[0.98]"
        >
          <span className="relative z-10">Get Started</span>
          <svg
            className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
          {/* Button glow */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ReceiptStorm() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const receipts = useMemo(() => generateReceipts(50), []);

  // Subtle background color shift through phases
  const bgOpacity = useTransform(
    scrollYProgress,
    [0, 0.4, 0.6, 0.8],
    [0, 0, 0.15, 0.05]
  );

  return (
    <>
      {/* Shimmer keyframe animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>

      <div ref={containerRef} className="relative h-[500vh] bg-[#050507]">
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Subtle gradient overlay that shifts with scroll */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-transparent to-transparent pointer-events-none"
            style={{ opacity: bgOpacity }}
          />

          {/* Ambient glow behind the tree area */}
          <motion.div
            className="absolute left-1/2 bottom-1/4 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none"
            style={{
              opacity: useTransform(
                scrollYProgress,
                [0.5, 0.65, 0.85],
                [0, 0.6, 0.2]
              ),
            }}
          />

          {/* Receipts layer */}
          <div className="absolute inset-0 pointer-events-none">
            {receipts.map((receipt) => (
              <AnimatedReceipt
                key={receipt.id}
                receipt={receipt}
                scrollProgress={scrollYProgress}
              />
            ))}
          </div>

          {/* POS Machine */}
          <POSMachine scrollProgress={scrollYProgress} />

          {/* Tree */}
          <Tree scrollProgress={scrollYProgress} />

          {/* Final message */}
          <FinalMessage scrollProgress={scrollYProgress} />

          {/* Scroll hint at the very beginning */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
            style={{
              opacity: useTransform(scrollYProgress, [0, 0.04], [1, 0]),
            }}
          >
            <span className="text-zinc-500 text-sm tracking-widest uppercase">
              Scroll
            </span>
            <motion.div
              className="w-5 h-8 rounded-full border-2 border-zinc-600 flex items-start justify-center pt-1.5"
              initial={{ opacity: 0.7 }}
            >
              <motion.div
                className="w-1 h-2 rounded-full bg-zinc-500"
                animate={{ y: [0, 8, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
