import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { gsap } from "gsap";

/**
 * Loads the uploaded 3D scan (public/assets/product.glb), gives it a rich
 * amber material, and shows it as a rotating, drag-to-spin 3D object with
 * real lighting. GSAP handles the intro and idle float. Falls back to the
 * flat product photo when WebGL / the model is unavailable, and honours
 * prefers-reduced-motion.
 */
export default function ProductModel3D() {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

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
      return { w: Math.max(1, r.width), h: Math.max(1, r.height || r.width) };
    };

    let { w, h } = getSize();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    Object.assign(renderer.domElement.style, {
      display: "block",
      width: "100%",
      height: "100%",
      cursor: "grab",
    });
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 0.2, 4.6);

    // neutral + warm lighting so the amber reads rich, not muddy
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const hemi = new THREE.HemisphereLight(0xffe9c8, 0x2a1608, 0.9);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff4e2, 2.6);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-4, 1, 3);
    scene.add(fill);
    const rim = new THREE.PointLight(0xff9d3a, 26, 30, 2);
    rim.position.set(-3.5, 2.5, -2);
    scene.add(rim);
    const rim2 = new THREE.PointLight(0xffc24d, 14, 30, 2);
    rim2.position.set(3, -2.5, 1.5);
    scene.add(rim2);

    const group = new THREE.Group();
    scene.add(group);

    let raf = 0;
    let controls;
    let disposed = false;
    const clock = new THREE.Clock();

    const amberMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xb9701f), // rich amber-caramel
      roughness: 0.42,
      metalness: 0.0,
      clearcoat: 0.7,
      clearcoatRoughness: 0.35,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xffb648),
      emissive: new THREE.Color(0x3a1600),
      emissiveIntensity: 0.18,
      flatShading: false,
    });

    new GLTFLoader().load(
      "/assets/product.glb",
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((o) => {
          if (o.isMesh) {
            o.material = amberMaterial;
            o.geometry.computeVertexNormals?.();
          }
        });

        // center + scale to a consistent size
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(3.1 / maxDim);
        group.add(model);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.autoRotate = !reduceMotion;
        controls.autoRotateSpeed = 1.7;
        controls.minPolarAngle = Math.PI * 0.28;
        controls.maxPolarAngle = Math.PI * 0.72;
        controls.rotateSpeed = 0.9;
        renderer.domElement.addEventListener("pointerdown", () => {
          renderer.domElement.style.cursor = "grabbing";
        });
        window.addEventListener("pointerup", () => {
          renderer.domElement.style.cursor = "grab";
        });

        if (!reduceMotion) {
          group.scale.setScalar(0.5);
          group.rotation.y = -1.1;
          gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: "power3.out" });
          gsap.to(group.rotation, { y: 0, duration: 1.8, ease: "power3.out" });
          gsap.to(group.position, {
            y: 0.14,
            duration: 3.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.fromTo(
            renderer.domElement,
            { opacity: 0 },
            { opacity: 1, duration: 1.1, ease: "power2.out" }
          );
        }

        const render = () => {
          raf = requestAnimationFrame(render);
          const t = clock.getElapsedTime();
          rim.intensity = 26 + Math.sin(t * 1.4) * 8;
          controls?.update();
          renderer.render(scene, camera);
        };
        render();
      },
      undefined,
      () => {
        if (!disposed) setFailed(true);
      }
    );

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
      controls?.dispose();
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          o.material?.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (failed) {
    return (
      <img
        src="/assets/product.png"
        alt="عنبر الحوت"
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
      role="img"
      aria-label="عنبر الحوت — نموذج ثلاثي الأبعاد. اسحب للتدوير."
      style={{
        position: "relative",
        width: "100%",
        height: "min(74vh, 640px)",
        touchAction: "none",
      }}
    />
  );
}
