import { useEffect, useRef } from "react";

/**
 * Animated Canvas Background representing raw ambergris floating at sea.
 * Renders floating golden amber particles, ocean currents, ambient caustics,
 * and glowing light beams directly related to 3anber 7out (Ambergris).
 */
export default function AmberMotionBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
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

    // Generate floating amber particles & golden dust
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (canvas.width || 1200),
      y: Math.random() * (canvas.height || 800),
      radius: Math.random() * 3 + 1.2,
      color: Math.random() > 0.4 ? "rgba(255, 184, 0, " : "rgba(212, 175, 55, ",
      alpha: Math.random() * 0.6 + 0.2,
      speedY: -(Math.random() * 0.45 + 0.15),
      speedX: Math.sin(Math.random() * Math.PI * 2) * 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Floating Amber Nuggets (3anber 7out)
    const amberNuggets = [
      { x: (canvas.width || 1200) * 0.15, y: (canvas.height || 800) * 0.3, size: 28, rot: 0.2, speedRot: 0.002 },
      { x: (canvas.width || 1200) * 0.82, y: (canvas.height || 800) * 0.65, size: 36, rot: -0.4, speedRot: -0.0015 },
      { x: (canvas.width || 1200) * 0.48, y: (canvas.height || 800) * 0.8, size: 22, rot: 0.8, speedRot: 0.0025 },
    ];

    let t = 0;

    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw caustics / light beams background gradient
      const beamGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      beamGrad.addColorStop(0, "rgba(138, 34, 34, 0.45)");
      beamGrad.addColorStop(0.5, "rgba(90, 43, 44, 0.35)");
      beamGrad.addColorStop(1, "rgba(42, 30, 31, 0.65)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated golden rays from top
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.beginPath();
        const rayX = (canvas.width / 3) * i + Math.sin(t + i) * 30;
        ctx.moveTo(rayX, 0);
        ctx.lineTo(rayX + 180 + Math.cos(t * 0.8 + i) * 40, canvas.height);
        ctx.lineTo(rayX - 60, canvas.height);
        ctx.closePath();
        const rayGrad = ctx.createLinearGradient(rayX, 0, rayX, canvas.height);
        rayGrad.addColorStop(0, `rgba(255, 184, 0, ${0.14 + Math.sin(t + i) * 0.04})`);
        rayGrad.addColorStop(1, "rgba(255, 184, 0, 0)");
        ctx.fillStyle = rayGrad;
        ctx.fill();
        ctx.restore();
      }

      // Draw floating amber particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(t + p.pulse) * 0.3;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        const currentAlpha = p.alpha + Math.sin(t * 2 + p.pulse) * 0.15;
        ctx.fillStyle = `${p.color}${Math.max(0.1, currentAlpha)})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#FFB800";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw organic amber nuggets
      amberNuggets.forEach((n) => {
        n.rot += n.speedRot;
        const currentY = n.y + Math.sin(t * 0.8 + n.size) * 12;

        ctx.save();
        ctx.translate(n.x, currentY);
        ctx.rotate(n.rot);

        ctx.beginPath();
        ctx.ellipse(0, 0, n.size * 1.3, n.size * 0.85, Math.PI / 6, 0, Math.PI * 2);
        const nugGrad = ctx.createRadialGradient(-n.size * 0.3, -n.size * 0.3, 2, 0, 0, n.size * 1.3);
        nugGrad.addColorStop(0, "rgba(255, 184, 0, 0.45)");
        nugGrad.addColorStop(0.5, "rgba(185, 112, 31, 0.35)");
        nugGrad.addColorStop(1, "rgba(42, 30, 31, 0.15)");
        ctx.fillStyle = nugGrad;
        ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
        ctx.lineWidth = 1.5;
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
