import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SmartphoneNfc,
  Printer,
  Leaf,
  Zap,
  Wifi,
  ShieldCheck,
  ChevronRight,
  TerminalSquare,
  ArrowRight,
  Sparkles,
  BarChart3,
  WalletCards,
  FolderOpen,
  HardDrive,
  Clock,
  PieChart,
  Trash2,
  ShieldAlert,
  Wind
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Lightning Split Configuration & WebGL ---
export const ELECTRIC_CONFIG = {
    timeClampSec: 0.05,
    svg: {
        strokes: {
            outer: { width: 3, color: 'rgba(123, 232, 153, 0.4)' },
            mid: { width: 2.2, color: 'rgba(74, 93, 78, 0.6)' },
            core: { width: 1.2, opacity: 0.95, color: 'white' },
        },
        glowBlur: 0.9,
    },
    speeds: [-1.32, 0.42, 0.95],
    shimmer: { speed: 4.2, freq: 8.5, amp: 0.25 },
    segments: 48,
    freqs: [0.7, 2.7, 3.9],
    easeStiffness: 6,
    clipOffset: 25,
    amps: [0.4, -0.8, 0.6],
};

function ShaderCanvas({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
        if (!gl) return;

        const vertexShaderSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;
        const fragmentShaderSource = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      vec3 random3(vec3 c) {
          float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
          vec3 r;
          r.z = fract(512.0*j); j *= .125;
          r.x = fract(512.0*j); j *= .125;
          r.y = fract(512.0*j);
          return r-0.5;
      }
      const float F3 =  0.3333333;
      const float G3 =  0.1666667;
      float simplex3d(vec3 p) {
           vec3 s = floor(p + dot(p, vec3(F3)));
           vec3 x = p - s + dot(s, vec3(G3));
           vec3 e = step(vec3(0.0), x - x.yzx);
           vec3 i1 = e*(1.0 - e.zxy);
           vec3 i2 = 1.0 - e.zxy*(1.0 - e);
           vec3 x1 = x - i1 + G3;
           vec3 x2 = x - i2 + 2.0*G3;
           vec3 x3 = x - 1.0 + 3.0*G3;
           vec4 w, d;
           w.x = dot(x, x); w.y = dot(x1, x1); w.z = dot(x2, x2); w.w = dot(x3, x3);
           w = max(0.6 - w, 0.0);
           d.x = dot(random3(s), x); d.y = dot(random3(s + i1), x1); d.z = dot(random3(s + i2), x2); d.w = dot(random3(s + 1.0), x3);
           w *= w; w *= w; d *= w;
           return dot(d, vec4(52.0));
      }
      float noise(vec3 m) {
          return 0.5333333*simplex3d(m) + 0.2666667*simplex3d(2.0*m) + 0.1333333*simplex3d(4.0*m) + 0.0666667*simplex3d(8.0*m);
      }
      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec4 fragColor;
        vec2 uv = fragCoord.xy / iResolution.xy;
        uv = uv * 2. -1.;
        vec2 p = fragCoord.xy/iResolution.x;
        vec3 p3 = vec3(p, iTime*0.25);
        float intensity = noise(vec3(p3*12.0+12.0));
        float t = clamp((uv.x * -uv.x * 0.16) + 0.15, 0., 1.);
        float y = abs(intensity * -t + uv.y);
        float g = pow(y, 0.14);
        vec3 col = vec3(1.2, 2.0, 1.4);
        col = col * -g + col;
        col = col * col; col = col * col;
        fragColor.rgb = col;
        fragColor.w = dot(col, vec3(0.299, 0.587, 0.114));
        gl_FragColor = fragColor;
      }
    `;

        function createShader(gl: WebGLRenderingContext, type: number, source: string) {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        }

        function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
            const program = gl.createProgram();
            if (!program) return null;
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            return program;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        if (!vertexShader || !fragmentShader) return;
        const program = createProgram(gl, vertexShader, fragmentShader);
        if (!program) return;

        const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
        const timeUniformLocation = gl.getUniformLocation(program, 'iTime');
        const resolutionUniformLocation = gl.getUniformLocation(program, 'iResolution');
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;
            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
            }
        }

        function render(time: number) {
            if (!canvas || !gl) return;
            resizeCanvasToDisplaySize(canvas);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(program);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
            gl.uniform1f(timeUniformLocation, time * 0.001);
            gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrameRef.current = requestAnimationFrame(render);
        }
        animationFrameRef.current = requestAnimationFrame(render);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    return <canvas ref={canvasRef} className={`${className} pointer-events-none bg-transparent`} style={{ display: 'block' }} />;
}

function LightningSplitSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(60);
    const [displayPos, setDisplayPos] = useState(60);
    const [time, setTime] = useState(0);

    useEffect(() => {
        let raf = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const dt = Math.min(ELECTRIC_CONFIG.timeClampSec, (now - last) / 1000);
            last = now;
            setTime(t => t + dt);
            setDisplayPos(p => {
                const target = position;
                const stiffness = ELECTRIC_CONFIG.easeStiffness;
                return p + (target - p) * (1 - Math.exp(-stiffness * dt));
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [position]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        if (x < 50) {
            setPosition(110);
        } else {
            setPosition(20);
        }
    };

    const handleMouseLeave = () => setPosition(60);
    const clamp01_100 = (v: number) => Math.max(0, Math.min(100, v));

    const { polyPointsStr, clipPolygonStr } = useMemo(() => {
        const SEGMENTS = ELECTRIC_CONFIG.segments;
        const AMPS = ELECTRIC_CONFIG.amps;
        const FREQS = ELECTRIC_CONFIG.freqs;
        const SPEEDS = ELECTRIC_CONFIG.speeds;
        const topX = clamp01_100(displayPos);
        const bottomX = clamp01_100(displayPos - ELECTRIC_CONFIG.clipOffset);
        const pts: { y: number; x: number }[] = [];

        for (let i = 0; i <= SEGMENTS; i++) {
            const tNorm = i / SEGMENTS;
            const y = tNorm * 100;
            const base = topX * (1 - tNorm) + bottomX * tNorm;
            let off = 0;
            for (let k = 0; k < AMPS.length; k++) {
                off += AMPS[k] * Math.sin(2 * Math.PI * (FREQS[k] * tNorm + SPEEDS[k] * time) + k * 1.3);
            }
            off += ELECTRIC_CONFIG.shimmer.amp * Math.sin(2 * Math.PI * (ELECTRIC_CONFIG.shimmer.freq * tNorm + ELECTRIC_CONFIG.shimmer.speed * time));
            const x = clamp01_100(base + off);
            pts.push({ y, x });
        }

        const polyPointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
        const edgePoints = pts.map(p => `${p.x}% ${p.y}%`).join(', ');
        const clipPolygonStr = `polygon(0% 0%, ${edgePoints}, 0% 100%)`;
        return { polyPointsStr, clipPolygonStr };
    }, [displayPos, time]);

    const x1 = position;
    const x2 = Math.max(0, Math.min(100, position - 25));
    const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const containerHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const realX1 = (x1 / 100) * containerWidth;
    const realY1 = 0;
    const realX2 = (x2 / 100) * containerWidth;
    const realY2 = containerHeight;
    const angle = Math.atan2(realY2 - realY1, realX2 - realX1) * (180 / Math.PI);
    const lineLength = Math.sqrt(Math.pow(realX2 - realX1, 2) + Math.pow(realY2 - realY1, 2));
    const overlayX = realX1;
    const overlayY = realY1;

    const leftClipStyle = {
        WebkitClipPath: clipPolygonStr,
        clipPath: clipPolygonStr,
    };

    const leftComponent = (
    <div className="h-screen w-screen bg-white relative text-[#1C1C1A]">
      <div className="absolute left-0 w-[50vw] h-full flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div id="consumers" className="absolute top-0"></div>
        <div className="max-w-xl mx-auto space-y-6 w-full">
          <div className="text-[#4A5D4E] font-semibold tracking-widest uppercase text-xs md:text-sm">For Consumers</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">Perfect clarity.<br/>In your pocket.</h2>
          <p className="text-sm md:text-lg text-[#6B6A65] leading-relaxed hidden sm:block">
            No more crumpled paper, faded ink, or lost return slips. Every purchase is cleanly digitized, organized, and available exactly when you need it.
          </p>
          <ul className="space-y-4 pt-4">
            {[
              'Native Apple Wallet & Google Pay',
              'Detailed line-item breakdowns',
              'Intelligent budget tracking and AI insights',
              'Bank-grade TLS encryption'
            ].map((item, i) => (
              <li key={i} className="flex items-start space-x-3">
                <CheckCircle className="text-[#4A5D4E] flex-shrink-0 mt-0.5 w-5 h-5 md:w-6 md:h-6" />
                <span className="font-medium text-sm md:text-lg">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    );

    const rightComponent = (
    <div className="h-screen w-screen bg-[#242D28] relative text-[#F7F6F2]">
      <div className="absolute right-0 w-[50vw] h-full flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div id="retailers" className="absolute top-0"></div>
        <div className="max-w-xl mx-auto space-y-6 w-full">
          <div className="text-[#82907A] font-semibold tracking-widest uppercase text-xs md:text-sm">For Retailers</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">Grow loyalty.<br/>Save paper.</h2>
          <p className="text-sm md:text-lg text-[#A0AFAA] leading-relaxed hidden sm:block">
            Eliminate thermal paper costs entirely while building deep customer loyalty. Offer reward points, reach your customers exactly when needed, and unlock comprehensive sales analytics with free AI insights.
          </p>

          <div className="rounded-xl bg-[#1C231F] p-4 md:p-6 shadow-lg ring-1 ring-[#323E36] mt-4 max-w-sm">
            <div className="text-xs md:text-sm text-[#A0AFAA]">AI Insight: Loyalty Program</div>
            <div className="mt-1 md:mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-[#F7F6F2]">1,204 <span className="text-xs md:text-sm font-medium text-[#82907A] align-middle">New Sign-ups</span></div>
            <div className="mt-1 md:mt-2 text-xs md:text-sm text-[#7BE899]">Targeted engagement campaigns active</div>
            <div className="hidden sm:block">
              <MiniBars />
            </div>
          </div>
        </div>
      </div>
    </div>
    );

    return (
        <motion.div
            ref={containerRef}
            className="relative h-screen w-full overflow-hidden select-none border-y border-[#EBEAE4]"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ pointerEvents: 'auto' }}
        >
            <div className="pointer-events-auto absolute inset-0 overflow-hidden">
                <div className="h-full w-full">{rightComponent}</div>
            </div>

            <div className="pointer-events-auto absolute inset-0 overflow-hidden" style={leftClipStyle}>
                <div className="h-full w-full">{leftComponent}</div>
            </div>

            <svg className="pointer-events-none absolute inset-0 z-30 select-none" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <filter id="electric-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation={ELECTRIC_CONFIG.svg.glowBlur} result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <polyline points={polyPointsStr} fill="none" stroke={ELECTRIC_CONFIG.svg.strokes.mid.color} strokeWidth={ELECTRIC_CONFIG.svg.strokes.mid.width} vectorEffect="non-scaling-stroke" filter="url(#electric-glow)" />
                <polyline points={polyPointsStr} fill="none" stroke={ELECTRIC_CONFIG.svg.strokes.core.color} strokeOpacity={ELECTRIC_CONFIG.svg.strokes.core.opacity} strokeWidth={ELECTRIC_CONFIG.svg.strokes.core.width} vectorEffect="non-scaling-stroke" />
                <polyline points={polyPointsStr} fill="none" stroke={ELECTRIC_CONFIG.svg.strokes.outer.color} strokeWidth={ELECTRIC_CONFIG.svg.strokes.outer.width} vectorEffect="non-scaling-stroke" filter="url(#electric-glow)" />
            </svg>

            <motion.div
                className="absolute z-20 select-none"
                animate={{ y: overlayY, x: overlayX, rotate: angle }}
                transition={{ type: 'spring', stiffness: 120, restSpeed: 0.001, restDelta: 0.001, mass: 1.2, damping: 20 }}
                style={{ width: `${lineLength}px`, transformOrigin: 'left center' }}
            >
                <div className="h-8 w-[120vw] -translate-x-16 translate-y-2">
                    <div className="pointer-events-none relative h-screen w-screen opacity-[90]">
                        <div className="pointer-events-none absolute inset-0 z-20 h-screen w-[100vw] translate-x-[10%] -translate-y-[48%] scale-150 lg:w-screen lg:translate-x-0">
                            <ShaderCanvas className="pointer-events-none h-[100vh] w-[200vw]" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function MiniBars() {
  return (
    <div className="mt-6 flex h-24 sm:h-36 items-end gap-2 sm:gap-4 rounded-xl bg-gradient-to-b from-[#242D28] to-[#1C231F] p-4 border border-[#323E36]">
      {[18, 48, 72, 96].map((h, i) => (
        <div
          key={i}
          className="w-6 sm:w-10 rounded-xl bg-gradient-to-t from-[#4A5D4E] to-[#7BE899] shadow-inner animate-grow-bar opacity-80 hover:opacity-100 transition-opacity"
          style={{ '--target-height': `${h}%`, animationDelay: `${i * 150}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function ShimmerButton({ variant = "default", size = "sm", className = "", children, ...props }: {
  variant?: "default" | "outline" | "ghost" | "dark" | "accent";
  size?: "sm" | "lg";
  className?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50"

  const variants: Record<string, string> = {
    default: "bg-white text-black hover:bg-gray-100",
    outline: "border border-[#EBEAE4] bg-white/5 backdrop-blur-xl text-[#1C1C1A] hover:bg-black/5 hover:border-black/20",
    ghost: "text-white/90 hover:text-white hover:bg-white/10",
    dark: "bg-[#242D28] text-white hover:bg-[#1C1C1A]",
    accent: "bg-[#7BE899] text-[#1C1C1A] hover:bg-white",
  }

  const sizes: Record<string, string> = {
    sm: "h-10 px-6 py-2 text-sm",
    lg: "h-14 px-8 py-4 text-lg",
  }

  const shimmerColor = variant === "default" || variant === "accent"
    ? "rgba(0,0,0,0.1)"
    : "rgba(255,255,255,0.2)";

  return (
    <button
      className={`group relative overflow-hidden rounded-full ${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <div
        className="absolute inset-0 -top-2 -bottom-2 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-0"
        style={{ background: `linear-gradient(to right, transparent, ${shimmerColor}, transparent)` }}
      />
    </button>
  );
}

// --- Testimonials ---
const testimonials = [
  { name: 'Sarah Jenkins', role: 'Boutique Owner', body: 'We cut our thermal paper costs to zero. The node just works perfectly with our legacy register.' },
  { name: 'David Chen', role: 'Customer', body: 'Tapping my phone and instantly seeing my categorized grocery list in Apple Wallet is pure magic.' },
  { name: 'Elena Rodriguez', role: 'Cafe Manager', body: 'Installation took 2 minutes. Unplug the printer, plug in Receiptiles, and we were live.' },
  { name: 'Marcus Taylor', role: 'Customer', body: 'The AI insights caught a double charge on my receipt before I even left the store. Incredible.' },
  { name: 'Priya Patel', role: 'Retail Director', body: 'Customers love the tap-to-save. It feels so much more premium than asking for an email address.' },
  { name: 'James Wilson', role: 'Customer', body: 'No app download is the killer feature. I just tap and the receipt organizes itself in my digital wallet.' },
];

function TestimonialCard({ name, role, body }: { name: string; role: string; body: string }) {
  const hour = (name.length % 12) + 1;
  const min = (name.length * 7) % 60;
  const time = `${hour}:${min < 10 ? '0' + min : min} ${name.length % 2 === 0 ? 'PM' : 'AM'}`;

  return (
    <div className="w-72 bg-white shadow-md shrink-0 flex flex-col font-mono text-sm border-t border-b border-[#EBEAE4] relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#F7F6F2_4px,#F7F6F2_8px)]"></div>
      <div className="p-6 flex flex-col gap-2 text-[#1C1C1A]">
        <div className="text-center mb-2">
          <div className="font-bold text-xl uppercase tracking-widest flex items-center justify-center mb-2">
            <Printer size={20} className="mr-2" />
          </div>
          <div className="font-bold tracking-widest">RECEIPTILES</div>
          <div className="text-xs text-[#82907A] uppercase mt-1">*** {role} ***</div>
        </div>
        <div className="border-b-2 border-dashed border-[#EBEAE4] my-1"></div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[#6B6A65]">CLIENT:</span>
          <span className="font-semibold">{name.toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#6B6A65]">TIME:</span>
          <span>{time}</span>
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#6B6A65]">STATUS:</span>
          <span>VERIFIED</span>
        </div>
        <div className="border-b-2 border-dashed border-[#EBEAE4] my-1"></div>
        <div className="text-xs leading-relaxed py-3 uppercase text-[#1C1C1A] tracking-tight">{body}</div>
        <div className="border-b-2 border-dashed border-[#EBEAE4] my-1"></div>
        <div className="flex justify-between font-bold text-sm mt-2">
          <span>PAPER SAVED</span>
          <span className="text-[#4A5D4E]">100%</span>
        </div>
        <div className="text-center mt-6">
          <div className="flex justify-center h-8 gap-[3px] opacity-80 mb-3 grayscale">
            {[1,2,1,3,1,0.5,2,1,0.75,1,3,1,0.5,2,1].map((w, i) => (
              <div key={i} className="bg-[#1C1C1A]" style={{ width: `${w * 4}px` }}></div>
            ))}
          </div>
          <div className="text-[10px] text-[#82907A] tracking-widest">THANK YOU</div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,#F7F6F2_4px,#F7F6F2_8px)]"></div>
    </div>
  );
}

const Marquee = ({ className = '', reverse = false, pauseOnHover = false, children }: {
  className?: string; reverse?: boolean; pauseOnHover?: boolean; children: React.ReactNode;
}) => (
  <div className={`group flex flex-col overflow-hidden [--duration:40s] [--gap:1rem] gap-[var(--gap)] ${className}`}>
    <div className={`flex flex-col shrink-0 justify-around gap-[var(--gap)] animate-marquee-vertical ${reverse ? 'direction-reverse' : ''} ${pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''}`}>
      {children}
    </div>
    <div aria-hidden="true" className={`flex flex-col shrink-0 justify-around gap-[var(--gap)] animate-marquee-vertical ${reverse ? 'direction-reverse' : ''} ${pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''}`}>
      {children}
    </div>
  </div>
);

// --- Animation Wrapper ---
const FadeIn = ({ children, delay = 0, direction = 'up', className = '', duration = 1000 }: {
  children: React.ReactNode; delay?: number; direction?: string; className?: string; duration?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        if (domRef.current) observer.unobserve(domRef.current);
      }
    }, { threshold: 0.15 });
    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, []);

  const getDirectionClasses = () => {
    switch (direction) {
      case 'up': return 'translate-y-12';
      case 'down': return '-translate-y-12';
      case 'left': return 'translate-x-12';
      case 'right': return '-translate-x-12';
      default: return 'translate-y-12';
    }
  };

  return (
    <div
      ref={domRef}
      className={`transition-all ease-out ${isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${getDirectionClasses()}`} ${className}`}
      style={{ transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const WordsPullUp = ({ text, className = "" }: { text: string; className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        if (domRef.current) observer.unobserve(domRef.current);
      }
    }, { threshold: 0.1 });
    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, []);

  return (
    <span ref={domRef} className={`inline-flex flex-wrap ${className}`}>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          className={`inline-block transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
          style={{ transitionDelay: `${i * 80}ms`, marginRight: "0.25em" }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

// --- Interactive Hardware Card ---
function InteractiveHardwareCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rotateY = ((e.clientX - rect.left) / rect.width - 0.5) * 40;
    const rotateX = ((e.clientY - rect.top) / rect.height - 0.5) * -40;
    setRotation({ x: rotateX, y: rotateY });
  };

  return (
    <div className="relative w-full max-w-sm cursor-pointer" style={{ perspective: "1000px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setRotation({ x: 0, y: 0 }); }}
        className={`w-full transition-all ease-out ${isHovered ? 'duration-[50ms]' : 'duration-700'}`}
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: "preserve-3d" }}
      >
        <div className="bg-white p-2 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-500 rounded-[1.5rem]" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)`, opacity: isHovered ? 1 : 0.5 }} />
          <div className="bg-[#FAF9F6] rounded-[1.5rem] p-10 aspect-square flex flex-col items-center justify-center relative overflow-hidden border border-white/20" style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute left-0 w-full h-[2px] bg-[#4A5D4E] shadow-[0_2px_15px_3px_rgba(74,93,78,0.5)] z-30 animate-scan-line"></div>
            <div className="absolute top-12 flex flex-col items-center space-y-4 opacity-40 transition-transform duration-500" style={{ transform: `translateZ(${isHovered ? '-20px' : '0px'})` }}>
              <div className="w-16 h-16 rounded-full border border-[#4A5D4E] animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            </div>
            <div className="flex flex-col items-center justify-center transition-transform duration-500 ease-out z-10" style={{ transform: `translateZ(${isHovered ? '30px' : '0px'})` }}>
              <div className="w-28 h-28 rounded-full bg-[#EAF0E6] flex items-center justify-center mb-8 shadow-md border border-[#CFDCC8]">
                <SmartphoneNfc size={48} strokeWidth={1.5} className="text-[#4A5D4E]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1C1C1A] mb-2 drop-shadow-sm">Tap for Receipt</h3>
              <p className="text-[#6B6A65] text-center text-sm max-w-[200px]">Apple Wallet & Google Pay</p>
            </div>
            <div className="absolute bottom-6 flex justify-center space-x-3 transition-transform duration-500 z-10" style={{ transform: `translateZ(${isHovered ? '30px' : '0px'})` }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#4A5D4E] shadow-[0_0_8px_#4A5D4E]"></div>
            </div>
            <div className="absolute inset-0 z-40 bg-[#FAF9F6]/60 backdrop-blur-[8px] flex flex-col items-center justify-center transition-transform duration-500 rounded-[1.5rem]" style={{ transform: `translateZ(${isHovered ? '80px' : '20px'})` }}>
              <span className="text-[#1C1C1A] text-sm font-bold tracking-widest uppercase whitespace-nowrap mb-4 drop-shadow-md">Launching Soon</span>
              {!showInput && !submitted && (
                <ShimmerButton variant="dark" size="sm" onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowInput(true); }} className="shadow-[0_10px_30px_rgba(28,28,26,0.4)]">
                  Join Waitlist
                </ShimmerButton>
              )}
              {showInput && !submitted && (
                <form onSubmit={(e) => { e.preventDefault(); if(email) setSubmitted(true); }} className="flex w-11/12 max-w-[240px] bg-white/95 backdrop-blur-md rounded-full shadow-2xl overflow-hidden border border-white/50" onClick={(e) => e.stopPropagation()}>
                  <input type="email" placeholder="Enter email..." className="flex-1 px-4 py-2.5 text-sm focus:outline-none min-w-0 bg-transparent text-[#1C1C1A] placeholder:text-[#6B6A65]" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  <button type="submit" className="px-4 bg-[#7BE899] text-[#1C1C1A] hover:bg-[#4A5D4E] hover:text-white transition-colors flex items-center justify-center">
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </button>
                </form>
              )}
              {submitted && (
                <div className="px-5 py-2.5 bg-[#7BE899]/90 backdrop-blur-md text-[#1C1C1A] rounded-full text-sm font-bold shadow-xl">You are on the list!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- AI Receipt Analyzer (Mock - no backend needed) ---
function ReceiptAIAnalyzer() {
  const [rawText, setRawText] = useState(`STARBUCKS STORE #12345\n10/24/2026 08:14 AM\n\n1 GRD CARAMEL MACCHIATO  $5.45\n1 CHOC CROISSANT         $3.25\n1 TALL BLONDE ROAST      $2.95\n\nSUBTOTAL                 $11.65\nTAX 8%                   $0.93\nTOTAL                    $12.58\nVISA **** 1234`);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ merchant: string; total: string; date: string; items: { name: string; price: string; category: string }[]; insight: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeReceipt = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    // Mock AI analysis with a delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const lines = rawText.split('\n').filter(l => l.trim());
      const merchantLine = lines[0] || 'Unknown Merchant';
      const dateLine = lines[1] || 'Unknown Date';

      const items: { name: string; price: string; category: string }[] = [];
      const totalMatch = rawText.match(/TOTAL\s+\$?([\d.]+)/i);
      const total = totalMatch ? `$${totalMatch[1]}` : '$0.00';

      const itemRegex = /\d+\s+(.+?)\s+\$?([\d.]+)/g;
      let match;
      while ((match = itemRegex.exec(rawText)) !== null) {
        if (!match[1].match(/subtotal|tax|total/i)) {
          const name = match[1].trim();
          const category = name.match(/macchiato|roast|latte|coffee|espresso/i) ? 'Coffee' :
                          name.match(/croissant|muffin|cake|scone/i) ? 'Food' : 'Other';
          items.push({ name, price: `$${match[2]}`, category });
        }
      }

      if (items.length === 0) {
        items.push({ name: 'Item 1', price: total, category: 'General' });
      }

      setResult({
        merchant: merchantLine.replace(/store\s*#?\d+/i, '').trim() || merchantLine,
        total,
        date: dateLine,
        items,
        insight: `You've spent ${total} at ${merchantLine.split(' ')[0]}. Based on your pattern, you visit coffee shops ~3x/week averaging $11.50/visit. Consider the rewards program to save 12% monthly.`
      });
    } catch {
      setError("Failed to analyze receipt. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#F7F6F2] rounded-3xl border border-[#EBEAE4] shadow-lg overflow-hidden flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-[#EBEAE4] bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <TerminalSquare className="text-[#4A5D4E]" size={20} />
          <h3 className="font-semibold text-[#1C1C1A]">Raw ESC/POS Data</h3>
        </div>
        <p className="text-sm text-[#6B6A65] mb-4">Paste raw thermal printer output to see how Receiptiles structures it on the edge.</p>
        <textarea className="flex-1 w-full bg-[#F7F6F2] border border-[#EBEAE4] rounded-xl p-4 font-mono text-sm text-[#1C1C1A] resize-none focus:outline-none focus:border-[#4A5D4E] focus:ring-1 focus:ring-[#4A5D4E] transition-all min-h-[250px]" value={rawText} onChange={(e) => setRawText(e.target.value)} />
        <ShimmerButton onClick={analyzeReceipt} disabled={isAnalyzing} variant="dark" className="mt-6 w-full">
          {isAnalyzing ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Processing...</span></>
          ) : (
            <><Sparkles size={18} className="text-[#7BE899]" /><span>Extract Receipt Data</span></>
          )}
        </ShimmerButton>
      </div>
      <div className="w-full md:w-1/2 p-8 bg-[#FAF9F6] flex flex-col relative">
        <div className="flex items-center gap-2 mb-6">
          <SmartphoneNfc className="text-[#4A5D4E]" size={20} />
          <h3 className="font-semibold text-[#1C1C1A]">Digital Wallet View</h3>
        </div>
        {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm mb-4">{error}</div>}
        {!result && !isAnalyzing && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80">
            <WalletCards size={48} className="mb-6 text-[#82907A]" />
            <h4 className="font-semibold text-[#1C1C1A] mb-4">Digital Wallet Features</h4>
            <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-sm">
              {[{ icon: FolderOpen, label: 'Auto-Organizing' }, { icon: HardDrive, label: 'Secure Saving' }, { icon: Clock, label: 'Warranty Tracking' }, { icon: PieChart, label: 'Expense Insights' }].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white border border-[#EBEAE4] rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-sm">
                  <Icon size={20} className="text-[#4A5D4E]" />
                  <span className="text-xs font-medium text-[#4A5D4E]">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[#6B6A65] text-sm max-w-[260px]">Click extract to see raw data transformed into a smart digital asset.</p>
          </div>
        )}
        {isAnalyzing && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="flex gap-2">
              {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 rounded-full bg-[#4A5D4E] animate-bounce" style={{ animationDelay: `${d}ms` }}></div>)}
            </div>
            <p className="text-sm text-[#4A5D4E] font-medium animate-pulse">AI is analyzing...</p>
          </div>
        )}
        {result && !isAnalyzing && (
          <div className="flex-1 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-[#EBEAE4] p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4A5D4E] to-[#7BE899]"></div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-xl font-bold text-[#1C1C1A]">{result.merchant}</h4>
                  <p className="text-xs text-[#82907A] mt-1">{result.date}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#F7F6F2] flex items-center justify-center text-[#4A5D4E] font-bold">{result.merchant?.charAt(0) || 'R'}</div>
              </div>
              <div className="space-y-3 mb-6">
                {result.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-[#82907A] bg-[#F7F6F2] px-2 py-0.5 rounded text-xs">{item.category}</span>
                      <span className="text-[#1C1C1A] font-medium">{item.name}</span>
                    </div>
                    <span className="text-[#1C1C1A]">{item.price}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-[#EBEAE4] pt-4 flex justify-between items-center">
                <span className="font-semibold text-[#1C1C1A]">Total</span>
                <span className="text-xl font-bold text-[#1C1C1A]">{result.total}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="bg-[#F7F6F2] p-2 rounded-lg flex items-center gap-2 text-xs font-medium text-[#4A5D4E]"><FolderOpen size={14} /> Organized</div>
                <div className="bg-[#F7F6F2] p-2 rounded-lg flex items-center gap-2 text-xs font-medium text-[#4A5D4E]"><Clock size={14} /> Warranty Logged</div>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-[#EAF0E6] to-[#F7F6F2] border border-[#CFDCC8] flex items-start gap-3">
              <Sparkles className="text-[#4A5D4E] shrink-0 mt-0.5" size={18} />
              <div>
                <span className="text-xs font-bold text-[#4A5D4E] uppercase tracking-wider block mb-1">AI Spending Insight</span>
                <p className="text-sm text-[#242D28] leading-relaxed font-medium">{result.insight}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Cinematic Footer ---
const MagneticButton = ({ className = '', children, as: _Component, onClick, href, ...props }: { className?: string; children: React.ReactNode; as?: string; onClick?: () => void; href?: string; [key: string]: unknown }) => {
  const localRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, rx: 0, ry: 0, scale: 1 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!localRef.current) return;
    const rect = localRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTransform({ x: x * 0.4, y: y * 0.4, rx: -y * 0.15, ry: x * 0.15, scale: 1.05 });
  };

  const content = href ? <a href={href} className={`cursor-pointer inline-block ${className}`}>{children}</a> : <button onClick={onClick} className={`cursor-pointer inline-block ${className}`}>{children}</button>;

  return (
    <div
      ref={localRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTransform({ x: 0, y: 0, rx: 0, ry: 0, scale: 1 }); }}
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) rotateX(${transform.rx}deg) rotateY(${transform.ry}deg) scale(${transform.scale})`,
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transformStyle: 'preserve-3d',
        display: 'inline-block',
      }}
    >
      {content}
    </div>
  );
};

function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      if (!wrapperRef.current || !giantTextRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.top < windowHeight) {
        const progress = 1 - (rect.top / windowHeight);
        const yOffset = Math.max(0, 10 - (progress * 10));
        const scale = 0.8 + (progress * 0.2);
        const opacity = progress * 1.5;
        giantTextRef.current.style.transform = `translateX(-50%) translateY(${yOffset}vh) scale(${scale})`;
        giantTextRef.current.style.opacity = String(Math.min(1, opacity));
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FOOTER_STYLES }} />
      <div id="download" ref={wrapperRef} className="relative h-screen w-full bg-[#1C1C1A]" style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}>
        <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-[#1C1C1A] text-[#F7F6F2] cinematic-footer-wrapper">
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />
          <div ref={giantTextRef} className="footer-giant-bg-text absolute -bottom-[5vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none opacity-0" style={{ transform: 'translateX(-50%) translateY(10vh) scale(0.8)' }}>RECEIPTILES</div>
          <div className="absolute top-12 left-0 w-full overflow-hidden border-y border-[#323E36]/50 bg-[#1C1C1A]/60 backdrop-blur-md py-4 z-10 -rotate-2 scale-110 shadow-2xl">
            <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.3em] text-[#A0AFAA] uppercase">
              <MarqueeItem /><MarqueeItem />
            </div>
          </div>
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-5xl mx-auto">
            <FadeIn delay={200}>
              <h2 className="text-5xl md:text-8xl font-black footer-text-glow tracking-tighter mb-12 text-center">Ready to begin?</h2>
            </FadeIn>
            <FadeIn delay={400} className="w-full">
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="flex flex-wrap justify-center gap-4 w-full">
                  <MagneticButton as="a" href="#" className="footer-glass-pill px-10 py-5 rounded-full text-[#F7F6F2] font-bold text-sm md:text-base flex items-center gap-3 group">Download iOS</MagneticButton>
                  <MagneticButton as="a" href="#" className="footer-glass-pill px-10 py-5 rounded-full text-[#F7F6F2] font-bold text-sm md:text-base flex items-center gap-3 group">Download Android</MagneticButton>
                </div>
                <div className="flex flex-wrap justify-center gap-3 md:gap-6 w-full mt-2">
                  {['Privacy Policy', 'Terms of Service', 'Support'].map(text => (
                    <MagneticButton key={text} as="a" href="#" className="footer-glass-pill px-6 py-3 rounded-full text-[#A0AFAA] font-medium text-xs md:text-sm hover:text-[#F7F6F2]">{text}</MagneticButton>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
          <div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-[#A0AFAA] text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">2026 Receiptiles. All rights reserved.</div>
            <div className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-[#323E36]/50">
              <span className="text-[#A0AFAA] text-[10px] md:text-xs font-bold uppercase tracking-widest">Crafted with</span>
              <span className="animate-footer-heartbeat text-sm md:text-base text-red-500">&hearts;</span>
              <span className="text-[#F7F6F2] font-black text-xs md:text-sm tracking-normal ml-1">Receiptiles</span>
            </div>
            <MagneticButton as="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center text-[#A0AFAA] hover:text-[#F7F6F2] group order-3">
              <svg className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}

const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6">
    <span>Chaos to Clarity</span> <span className="text-[#7BE899]/60">+</span>
    <span>Intelligent Analytics</span> <span className="text-[#E8C47B]/60">+</span>
    <span>Zero Paper Waste</span> <span className="text-[#7BE899]/60">+</span>
    <span>Bank-Grade Security</span> <span className="text-[#E8C47B]/60">+</span>
    <span>Seamless Integration</span> <span className="text-[#7BE899]/60">+</span>
  </div>
);

const FOOTER_STYLES = `
.cinematic-footer-wrapper { --background: #1C1C1A; --foreground: #F7F6F2; --primary: #7BE899; --secondary: #E8C47B; --border: #323E36; --pill-bg-1: color-mix(in oklch, var(--foreground) 3%, transparent); --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent); --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent); --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent); --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent); --pill-border: color-mix(in oklch, var(--foreground) 8%, transparent); --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 8%, transparent); --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent); --pill-border-hover: color-mix(in oklch, var(--foreground) 20%, transparent); --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent); --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent); }
@keyframes footer-breathe { 0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; } }
@keyframes footer-scroll-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes footer-heartbeat { 0%, 100% { transform: scale(1); } 15%, 45% { transform: scale(1.2); } 30% { transform: scale(1); } }
.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }
.animate-footer-heartbeat { animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite; }
.footer-bg-grid { background-size: 60px 60px; background-image: linear-gradient(to right, color-mix(in oklch, var(--foreground) 3%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 3%, transparent) 1px, transparent 1px); mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); }
.footer-aurora { background: radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--primary) 15%, transparent) 0%, color-mix(in oklch, var(--secondary) 15%, transparent) 40%, transparent 70%); }
.footer-glass-pill { background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%); box-shadow: 0 10px 30px -10px var(--pill-shadow), inset 0 1px 1px var(--pill-highlight), inset 0 -1px 2px var(--pill-inset-shadow); border: 1px solid var(--pill-border); backdrop-filter: blur(16px); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.footer-glass-pill:hover { background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%); border-color: var(--pill-border-hover); box-shadow: 0 20px 40px -10px var(--pill-shadow-hover), inset 0 1px 1px var(--pill-highlight-hover); color: var(--foreground); }
.footer-giant-bg-text { font-size: 20vw; line-height: 0.75; font-weight: 900; letter-spacing: -0.05em; color: transparent; -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 5%, transparent); background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 10%, transparent) 0%, transparent 60%); -webkit-background-clip: text; background-clip: text; }
.footer-text-glow { background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 40%, transparent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0px 0px 20px color-mix(in oklch, var(--foreground) 15%, transparent)); }
`;

// --- Main Landing Page ---
export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A] font-sans selection:bg-[#4A5D4E]/20 overflow-x-hidden">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes marquee-vertical { from { transform: translateY(0); } to { transform: translateY(calc(-100% - var(--gap))); } }
        .animate-marquee-vertical { animation: marquee-vertical var(--duration, 40s) linear infinite; }
        .direction-reverse { animation-direction: reverse; }
        @keyframes scan-line { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan-line { animation: scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes grow-bar { from { height: 0%; } to { height: var(--target-height); } }
        .animate-grow-bar { animation: grow-bar 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#F7F6F2]/90 backdrop-blur-md border-b border-[#EBEAE4]' : 'bg-transparent border-b-transparent'}`}>
        <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-20' : 'h-28'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-500 ${scrolled ? 'bg-[#242D28] text-[#F7F6F2]' : 'bg-white text-[#242D28]'}`}>
              <Printer size={16} />
            </div>
            <span className={`text-lg font-semibold tracking-wide transition-colors duration-500 ${scrolled ? 'text-[#1C1C1A]' : 'text-white'}`}>Receiptiles</span>
          </div>
          <div className={`hidden md:flex items-center space-x-10 text-sm font-medium transition-colors duration-500 ${scrolled ? 'text-[#6B6A65]' : 'text-white/80'}`}>
            <a href="#impact" className={`transition-colors ${scrolled ? 'hover:text-[#1C1C1A]' : 'hover:text-white'}`}>Impact</a>
            <a href="#how-it-works" className={`transition-colors ${scrolled ? 'hover:text-[#1C1C1A]' : 'hover:text-white'}`}>How it Works</a>
            <a href="#solutions" className={`transition-colors ${scrolled ? 'hover:text-[#1C1C1A]' : 'hover:text-white'}`}>Solutions</a>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className={`hidden sm:block text-sm font-semibold transition-colors ${scrolled ? 'text-[#1C1C1A] hover:text-[#4A5D4E]' : 'text-white hover:text-white/80'}`}>Sign In</a>
            <a href="#"><ShimmerButton variant={scrolled ? "dark" : "outline"} size="sm">Sign Up</ShimmerButton></a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-32 lg:pt-40 lg:pb-40 overflow-hidden min-h-screen rounded-b-[2rem] flex flex-col justify-center bg-[#242D28]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#242D28]/80 via-[#242D28]/40 to-[#F7F6F2] pointer-events-none z-0" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center w-full my-auto">
          <div className="space-y-8 z-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] text-[#F7F6F2]">
              <WordsPullUp text="From Chaos to" />{' '}
              <FadeIn delay={600} direction="up" className="inline-block"><span className="font-serif italic text-[#7BE899] font-medium">Clarity.</span></FadeIn>
            </h1>
            <FadeIn delay={800}>
              <p className="text-lg text-[#EBEAE4] max-w-xl leading-relaxed drop-shadow-md">
                A smart, eco-friendly device that eliminates wasteful paper receipts. Retailers instantly save money and shrink their carbon footprint, while customers get all their purchases beautifully organized in one place.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={1000} direction="left" className="flex items-center justify-center z-10 py-12 lg:py-0 w-full">
            <InteractiveHardwareCard />
          </FadeIn>
        </div>
      </section>

      {/* Environmental Impact */}
      <section id="impact" className="bg-[#242D28] py-16 border-y border-[#323E36] relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-[#7BE899] font-serif italic text-2xl md:text-3xl">The True Cost of Paper Receipts</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
              {[
                { icon: Leaf, value: '12.4M', label: 'Trees Wasted/Year', color: 'text-[#7BE899]' },
                { icon: Trash2, value: '3 Bil+', label: 'Lbs of Waste/Year', color: 'text-[#E8C47B]' },
                { icon: ShieldAlert, value: '93%', label: 'Contain Toxic BPA', color: 'text-[#ef4444]' },
                { icon: Wind, value: '90%', label: 'Discarded Instantly', color: 'text-[#88C1FF]' },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="flex flex-col items-center justify-center p-6 bg-[#1C231F] rounded-2xl border border-[#323E36] shadow-lg">
                  <Icon className={`${color} mb-4`} size={32} />
                  <div className="text-3xl md:text-4xl font-bold text-[#F7F6F2] mb-1">{value}</div>
                  <div className="text-[10px] md:text-xs text-[#A0AFAA] tracking-widest uppercase text-center font-semibold">{label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white border-y border-[#EBEAE4]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-20 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1C1C1A] mb-5 tracking-tight">Invisible to cashiers.<br/>Seamless for customers.</h2>
              <p className="text-[#6B6A65] text-lg">A sophisticated integration that bridges the gap between legacy POS systems and modern digital wallets.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-[#EBEAE4]"></div>
            {[
              { icon: <TerminalSquare size={28} className="text-[#4A5D4E]" />, title: "1. Virtual Interface", desc: "The device connects via USB, functioning identically to an ESC/POS printer. Zero software installation required." },
              { icon: <Zap size={28} className="text-[#4A5D4E]" />, title: "2. Edge Parsing", desc: "Intelligent firmware intercepts the raw print data, structuring items, prices, and merchant details locally in milliseconds." },
              { icon: <SmartphoneNfc size={28} className="text-[#4A5D4E]" />, title: "3. NFC Handover", desc: "The customer taps their device. A secure token is exchanged, rendering a beautiful digital receipt instantly." }
            ].map((step, idx) => (
              <FadeIn key={idx} delay={idx * 200}>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-[#F7F6F2] border border-[#EBEAE4] flex items-center justify-center mb-8 shadow-sm">{step.icon}</div>
                  <h3 className="text-xl font-semibold text-[#1C1C1A] mb-4">{step.title}</h3>
                  <p className="text-[#6B6A65] leading-relaxed max-w-sm">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Lightning Split */}
      <section id="solutions" className="relative w-full h-screen">
        <LightningSplitSection />
      </section>

      {/* AI Demo */}
      <section className="py-32 bg-[#1C1C1A] overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#4A5D4E]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#7BE899] text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={14} /><span>Powered by Advanced AI</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#F7F6F2] tracking-tight mb-5">From paper to powerful insights.</h2>
            <p className="text-[#A0AFAA] text-lg max-w-2xl mx-auto">Watch how everyday receipts are instantly transformed into beautifully organized, categorized, and actionable spending insights.</p>
          </FadeIn>
          <FadeIn delay={200}><ReceiptAIAnalyzer /></FadeIn>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-[#F7F6F2] relative overflow-hidden border-b border-[#EBEAE4]">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center relative z-20">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-bold text-[#1C1C1A] tracking-tight mb-4">Loved on both sides of the counter.</h2>
            <p className="text-lg text-[#6B6A65]">Real experiences from merchants and shoppers using Receiptiles.</p>
          </FadeIn>
        </div>
        <div className="relative flex h-[600px] w-full flex-row items-center justify-center overflow-hidden gap-4 [perspective:800px]">
          <div className="flex flex-row items-start gap-4" style={{ transform: 'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)' }}>
            <Marquee pauseOnHover className="[--duration:45s]">
              {testimonials.slice(0, 3).map((r) => <TestimonialCard key={r.name} {...r} />)}
              {testimonials.slice(3, 6).map((r) => <TestimonialCard key={r.name + 'd'} {...r} />)}
            </Marquee>
            <Marquee pauseOnHover reverse className="[--duration:55s]">
              {testimonials.slice(3, 6).map((r) => <TestimonialCard key={r.name} {...r} />)}
              {testimonials.slice(0, 3).map((r) => <TestimonialCard key={r.name + 'd'} {...r} />)}
            </Marquee>
            <Marquee pauseOnHover className="[--duration:40s]">
              {testimonials.slice(1, 4).map((r) => <TestimonialCard key={r.name} {...r} />)}
              {testimonials.slice(4, 6).map((r) => <TestimonialCard key={r.name + 'd'} {...r} />)}
            </Marquee>
            <Marquee pauseOnHover reverse className="[--duration:50s]">
              {testimonials.slice(4, 6).map((r) => <TestimonialCard key={r.name} {...r} />)}
              {testimonials.slice(0, 4).map((r) => <TestimonialCard key={r.name + 'd'} {...r} />)}
            </Marquee>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#F7F6F2] z-10"></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#F7F6F2] z-10"></div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#F7F6F2] z-10"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#F7F6F2] z-10"></div>
        </div>
      </section>

      <CinematicFooter />
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
