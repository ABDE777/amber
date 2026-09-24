import { useEffect, useRef } from "react";

/**
 * Animated Canvas Background representing raw ambergris floating at sea.
 * Renders floating golden amber particles, ocean currents, ambient caustics,
 * and glowing light beams directly related to 3anber 7out (Ambergris).
 */
export default function AmberMotionBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const isMobile =
      window.innerWidth < 768 ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Optimized floating amber particles (reduced count, hardware-friendly)
    const particleCount = 24;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (canvas.width || 1200),
      y: Math.random() * (canvas.height || 800),
      radius: Math.random() * 2.5 + 1.2,
      color: Math.random() > 0.4 ? "rgba(255, 184, 0, " : "rgba(212, 175, 55, ",
      alpha: Math.random() * 0.5 + 0.2,
      speedY: -(Math.random() * 0.35 + 0.15),
      speedX: Math.sin(Math.random() * Math.PI * 2) * 0.15,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Floating Amber Nuggets (3anber 7out)
    const amberNuggets = [
      { x: (canvas.width || 1200) * 0.15, y: (canvas.height || 800) * 0.3, size: 24, rot: 0.2, speedRot: 0.0015 },
      { x: (canvas.width || 1200) * 0.82, y: (canvas.height || 800) * 0.65, size: 30, rot: -0.4, speedRot: -0.001 },
    ];

    let t = 0;

    const render = () => {
      t += 0.012;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw floating amber particles without expensive shadowBlur
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(t + p.pulse) * 0.25;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        const currentAlpha = p.alpha + Math.sin(t * 2 + p.pulse) * 0.15;
        ctx.fillStyle = `${p.color}${Math.max(0.1, currentAlpha)})`;
        ctx.fill();
      });

      // Draw organic amber nuggets
      amberNuggets.forEach((n) => {
        n.rot += n.speedRot;
        const currentY = n.y + Math.sin(t * 0.8 + n.size) * 10;

        ctx.save();
        ctx.translate(n.x, currentY);
        ctx.rotate(n.rot);

        ctx.beginPath();
        ctx.ellipse(0, 0, n.size * 1.3, n.size * 0.85, Math.PI / 6, 0, Math.PI * 2);
        const nugGrad = ctx.createRadialGradient(-n.size * 0.3, -n.size * 0.3, 2, 0, 0, n.size * 1.3);
        nugGrad.addColorStop(0, "rgba(255, 184, 0, 0.35)");
        nugGrad.addColorStop(0.6, "rgba(185, 112, 31, 0.25)");
        nugGrad.addColorStop(1, "rgba(42, 30, 31, 0.05)");
        ctx.fillStyle = nugGrad;
        ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
