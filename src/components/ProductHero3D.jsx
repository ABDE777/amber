import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";

/**
 * Renders the product photo as a rotating 3D object.
 *
 * The flat cut-out (background already removed) is mapped onto a finely
 * subdivided plane that is pushed into relief by a displacement map derived
 * from the photo's luminance, with a matching normal map for fine surface
 * detail. Real lights + auto-rotation make it read as a solid, spinning stone.
 * You can also drag to spin it. Falls back to the flat PNG if WebGL is absent.
 */
export default function ProductHero3D() {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Respect users who prefer reduced motion.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (e) {
      setFailed(true);
      return;
    }

    const getSize = () => {
      const r = mount.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height || w);
      return { w, h };
    };

    let { w, h } = getSize();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.cursor = "grab";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // --- lighting: neutral so the stone's real amber colour shows,
    // with a soft warm rim just for atmosphere ---
    scene.add(new THREE.AmbientLight(0xffffff, 1.05));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 1.0);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff6ea, 2.3);
    key.position.set(2.5, 4.5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(-3, 1, 3);
    scene.add(fill);
    // warm rim: low intensity, only kisses the edges
    const rim = new THREE.PointLight(0xffa63a, 14, 30, 2);
    rim.position.set(-4.5, 2.5, 2);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new THREE.TextureLoader();
    const load = (url, colorSpace) =>
      new Promise((resolve, reject) =>
        loader.load(
          url,
          (t) => {
            if (colorSpace) t.colorSpace = colorSpace;
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
            resolve(t);
          },
          undefined,
          reject
        )
      );

    let raf = 0;
    let controls;
    let disposed = false;
    const clock = new THREE.Clock();

    Promise.all([
      load("/assets/product.png", THREE.SRGBColorSpace),
      load("/assets/product_disp.png"),
      load("/assets/product_normal.png"),
      load("/assets/product_rough.png"),
    ])
      .then(([mapTex, dispTex, normalTex, roughTex]) => {
        if (disposed) return;

        const img = mapTex.image;
        const aspect = img.width / img.height; // ~1.84
        const planeH = 3.2;
        const planeW = planeH * aspect;
        const geo = new THREE.PlaneGeometry(planeW, planeH, 320, 174);

        const mat = new THREE.MeshStandardMaterial({
          map: mapTex,
          transparent: true,
          alphaTest: 0.45,
          side: THREE.DoubleSide,
          displacementMap: dispTex,
          displacementScale: 0.68,
          displacementBias: -0.08,
          normalMap: normalTex,
          normalScale: new THREE.Vector2(1.0, 1.0),
          roughnessMap: roughTex,
          roughness: 0.68,
          metalness: 0.02,
          emissive: new THREE.Color(0x2a1000),
          emissiveIntensity: 0.05,
        });

        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.autoRotate = !reduceMotion;
        controls.autoRotateSpeed = 1.6;
        controls.minPolarAngle = Math.PI * 0.30;
        controls.maxPolarAngle = Math.PI * 0.70;
        controls.rotateSpeed = 0.9;
        renderer.domElement.addEventListener("pointerdown", () => {
          renderer.domElement.style.cursor = "grabbing";
        });
        window.addEventListener("pointerup", () => {
          renderer.domElement.style.cursor = "grab";
        });

        // --- GSAP intro + idle float ---
        if (!reduceMotion) {
          group.scale.setScalar(0.55);
          group.rotation.y = -0.9;
          gsap.to(group.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.5,
            ease: "power3.out",
          });
          gsap.to(group.rotation, {
            y: 0,
            duration: 1.8,
            ease: "power3.out",
          });
          gsap.to(group.position, {
            y: 0.18,
            duration: 3.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.fromTo(
            renderer.domElement,
            { opacity: 0 },
            { opacity: 1, duration: 1.2, ease: "power2.out" }
          );
        }

        const render = () => {
          raf = requestAnimationFrame(render);
          const t = clock.getElapsedTime();
          // subtle light shimmer for the glassy amber
          rim.intensity = 14 + Math.sin(t * 1.3) * 5;
          if (controls) controls.update();
          renderer.render(scene, camera);
        };
        render();
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    const onResize = () => {
      if (disposed) return;
      const s = getSize();
      w = s.w;
      h = s.h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf(group.scale);
      gsap.killTweensOf(group.rotation);
      gsap.killTweensOf(group.position);
      if (controls) controls.dispose();
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (m) {
            [
              m.map,
              m.displacementMap,
              m.normalMap,
              m.roughnessMap,
            ].forEach((tx) => tx?.dispose());
            m.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (failed) {
    // Graceful fallback: the flat cut-out still looks great.
    return (
      <img
        src="/assets/product.png"
        alt="3anber 7out — ambergris"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 620,
          display: "block",
          filter: "drop-shadow(0 30px 60px rgba(0,0,0,.55))",
          animation: "mwoaFloat 9s ease-in-out infinite",
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      aria-label="3anber 7out — ambergris, interactive 3D view. Drag to rotate."
      role="img"
      style={{
        position: "relative",
        width: "100%",
        height: "min(74vh, 640px)",
        touchAction: "none",
      }}
    />
  );
}
