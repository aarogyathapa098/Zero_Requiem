import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import logoUrl from "../../../assets/zero-requiem-logo.png";
import marsPhotoUrl from "../../../assets/mars-surface.jpg";
import { resetSavedProgress } from "../../map/game/marsModel.js";
import { resetMissionProgress } from "../data/missions.js";
import "./MenuScreen.css";

interface OverlayContent {
  title: string;
  body: string;
}

const ABOUT_OVERLAY: OverlayContent = {
  title: "About",
  body: "Project: Zero Requiem is set in the S.U.N.A. IV system. Survive the Martian surface, repair your failing life-support systems, uncover why previous crews went dark, and broadcast the final transmission back to Earth.",
};

export default function MenuScreen() {
  const navigate = useNavigate();
  const starsRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<number | null>(null);

  const [overlay, setOverlay] = useState<OverlayContent | null>(null);
  const [leaving, setLeaving] = useState(false);

  const handlePlay = () => {
    if (leaving) return;
    resetSavedProgress();
    resetMissionProgress();
    setLeaving(true);
    leaveTimerRef.current = window.setTimeout(() => navigate("/cutscene"), 550);
  };

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverlay(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const starsCanvas = starsRef.current;
    const glCanvas = glRef.current;
    const panel = panelRef.current;
    if (!starsCanvas || !glCanvas || !panel) return;

    const sx = starsCanvas.getContext("2d");
    if (!sx) return;

    let disposed = false;
    let raf = 0;

    /* ------------------------------------------------------------------ */
    /* 2D starfield + distant Earth                                        */
    /* ------------------------------------------------------------------ */
    interface Star {
      x: number;
      y: number;
      r: number;
      p: number;
    }

    let starList: Star[] = [];
    let panelRight = 0;

    const resizeStars = () => {
      starsCanvas.width = window.innerWidth;
      starsCanvas.height = window.innerHeight;
      panelRight = panel.getBoundingClientRect().right;
      starList = Array.from({ length: 220 }, () => ({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height * 0.8,
        r: Math.random() * 1.2 + 0.2,
        p: Math.random() * 6,
      }));
    };

    // Equirectangular Earth texture, painted once.
    const EW = 512;
    const EH = 256;
    let ETEX: Uint8ClampedArray;

    {
      const earthTextureCanvas = document.createElement("canvas");
      earthTextureCanvas.width = EW;
      earthTextureCanvas.height = EH;
      const c = earthTextureCanvas.getContext("2d")!;

      const ocean = c.createLinearGradient(0, 0, 0, EH);
      ocean.addColorStop(0, "#2a66bd");
      ocean.addColorStop(0.5, "#1b58b2");
      ocean.addColorStop(1, "#2a66bd");
      c.fillStyle = ocean;
      c.fillRect(0, 0, EW, EH);

      const X = (lon: number) => ((lon + 180) / 360) * EW;
      const Y = (lat: number) => ((90 - lat) / 180) * EH;
      const poly = (pts: ReadonlyArray<readonly [number, number]>, col: string) => {
        c.fillStyle = col;
        c.beginPath();
        pts.forEach((p, k) =>
          k ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])),
        );
        c.closePath();
        c.fill();
      };

      const G = "#3f8a46";
      poly(
        [
          [-168, 66], [-140, 70], [-95, 72], [-62, 60], [-55, 48], [-70, 42],
          [-80, 25], [-97, 17], [-83, 9], [-105, 22], [-117, 32], [-125, 48],
          [-150, 60],
        ],
        G,
      );
      poly(
        [
          [-80, 10], [-60, 10], [-35, -6], [-40, -23], [-58, -38], [-68, -55],
          [-75, -48], [-72, -20], [-81, -5],
        ],
        "#2f7d3c",
      );
      poly(
        [
          [-10, 36], [-10, 55], [5, 62], [30, 71], [80, 76], [140, 72],
          [180, 66], [160, 55], [140, 40], [122, 30], [110, 20], [100, 8],
          [80, 8], [70, 22], [55, 25], [35, 30], [28, 38], [10, 44],
        ],
        G,
      );
      poly(
        [
          [-17, 21], [-5, 36], [10, 37], [32, 31], [43, 12], [51, 11],
          [40, -15], [33, -27], [20, -35], [12, -17], [9, 4], [-8, 5],
          [-17, 14],
        ],
        "#4a8d44",
      );
      poly(
        [[-15, 15], [-12, 28], [10, 32], [30, 30], [35, 20], [15, 15]],
        "#c2a45e",
      );
      poly(
        [[35, 30], [48, 29], [58, 22], [52, 13], [43, 13]],
        "#c9a96a",
      );
      poly(
        [
          [114, -22], [130, -12], [142, -11], [153, -27], [146, -39],
          [130, -32], [115, -34],
        ],
        "#b8884a",
      );
      poly([[-55, 60], [-20, 70], [-20, 82], [-60, 82]], "#eef4fa");

      c.fillStyle = "#eef4fa";
      c.fillRect(0, Y(-70), EW, EH - Y(-70));
      c.fillRect(0, 0, EW, Y(84));

      let seed = 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let n = 0; n < 110; n++) {
        const x = rnd() * EW;
        const y = (0.12 + 0.76 * rnd()) * EH;
        const w = 10 + rnd() * 34;
        const h = 0.1 + rnd() * 0.12;
        for (const dx of [-EW, 0, EW]) {
          c.save();
          c.translate(x + dx, y);
          c.scale(1, h);
          const cloud = c.createRadialGradient(0, 0, 0, 0, 0, w);
          cloud.addColorStop(0, "rgba(255,255,255," + (0.35 + 0.4 * rnd()) + ")");
          cloud.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = cloud;
          c.fillRect(-w, -w, 2 * w, 2 * w);
          c.restore();
        }
      }

      ETEX = c.getImageData(0, 0, EW, EH).data;
    }

    const ED = 112;
    const earthCanvas = document.createElement("canvas");
    earthCanvas.width = earthCanvas.height = ED;
    const earthCtx = earthCanvas.getContext("2d")!;
    const earthImg = earthCtx.createImageData(ED, ED);

    const earthFrame = (rot: number) => {
      const d = earthImg.data;
      for (let j = 0; j < ED; j++) {
        const ny = 1 - ((j + 0.5) / ED) * 2;
        for (let i = 0; i < ED; i++) {
          const nx = ((i + 0.5) / ED) * 2 - 1;
          const d2 = nx * nx + ny * ny;
          const b = (j * ED + i) * 4;
          if (d2 >= 1) {
            d[b + 3] = 0;
            continue;
          }
          const nz = Math.sqrt(1 - d2);
          const lat = Math.asin(ny);
          const lon = Math.atan2(nx, nz) - rot + 0.35;
          const u = (((lon / (2 * Math.PI) + 0.5) % 1) + 1) % 1;
          const v = 0.5 - lat / Math.PI;
          const tx = Math.min(EW - 1, (u * EW) | 0);
          const ty = Math.min(EH - 1, (v * EH) | 0);
          const a = (ty * EW + tx) * 4;
          const dot = nx * 0.78 - ny * 0.42 + nz * 0.45;
          const l = Math.max(0, Math.min(1, dot * 1.3 + 0.1));
          const sh = 0.1 + 0.9 * l * l * (3 - 2 * l);
          const rim = Math.pow(1 - nz, 3) * (0.2 + 0.8 * l);
          d[b] = Math.min(255, ETEX[a] * sh + 110 * rim);
          d[b + 1] = Math.min(255, ETEX[a + 1] * sh + 170 * rim);
          d[b + 2] = Math.min(255, ETEX[a + 2] * sh + 255 * rim);
          d[b + 3] = 255 * Math.min(1, ((1 - Math.sqrt(d2)) * ED) / 2);
        }
      }
      earthCtx.putImageData(earthImg, 0, 0);
    };

    const drawStars = (t: number) => {
      const W = starsCanvas.width;
      const H = starsCanvas.height;
      sx.clearRect(0, 0, W, H);
      sx.globalAlpha = 1;

      for (const s of starList) {
        sx.globalAlpha =
          0.35 + 0.65 * Math.abs(Math.sin(t / 1500 + s.p)) * (1 - s.y / H);
        sx.fillStyle = "#cfe2ff";
        sx.beginPath();
        sx.arc(s.x, s.y, s.r, 0, 7);
        sx.fill();
      }

      // Earth: a lit sphere rotating slowly.
      const m = Math.min(W, H);
      const er = m * 0.035;
      const ex = Math.min(Math.max(W * 0.47, panelRight + 40 + er), W * 0.92);
      const ey = H * 0.2;

      sx.save();
      sx.globalAlpha = 1;
      const glow = sx.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 2.6);
      glow.addColorStop(0, "rgba(120,180,255,.22)");
      glow.addColorStop(1, "rgba(120,180,255,0)");
      sx.fillStyle = glow;
      sx.fillRect(ex - er * 2.6, ey - er * 2.6, er * 5.2, er * 5.2);
      earthFrame((t * 2 * Math.PI) / 90000);
      sx.imageSmoothingEnabled = true;
      sx.drawImage(earthCanvas, ex - er, ey - er, 2 * er, 2 * er);
      sx.restore();
    };

    /* ------------------------------------------------------------------ */
    /* Three.js scene: Mars                                                */
    /* ------------------------------------------------------------------ */
    const renderer = new THREE.WebGLRenderer({
      canvas: glCanvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.z = 10;

    scene.add(new THREE.AmbientLight(0x5a7fc0, 0.55));
    const sun = new THREE.DirectionalLight(0x9cc8ff, 1.7);
    sun.position.set(0.5, 1, 0.8);
    scene.add(sun);

    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = 0.25;
    group.add(tilt);
    scene.add(group);

    const mars = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 1,
        metalness: 0,
      }),
    );
    tilt.add(mars);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.07, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader:
          "varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 n;void main(){float i=pow(max(0.,.72-dot(n,vec3(0,0,1.))),3.);gl_FragColor=vec4(.30,.62,1.,1.)*i*1.6;}",
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    scene.add(atmosphere);

    // Blue sun.
    const sunCanvas = document.createElement("canvas");
    sunCanvas.width = sunCanvas.height = 256;
    const sunCtx = sunCanvas.getContext("2d")!;
    const sunGradient = sunCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    const sunStops: Array<[number, string]> = [
      [0, "rgba(255,255,255,1)"],
      [0.06, "rgba(220,240,255,1)"],
      [0.2, "rgba(110,180,255,.55)"],
      [0.5, "rgba(50,110,230,.18)"],
      [1, "rgba(20,60,160,0)"],
    ];
    sunStops.forEach(([offset, color]) => sunGradient.addColorStop(offset, color));
    sunCtx.fillStyle = sunGradient;
    sunCtx.fillRect(0, 0, 256, 256);

    const sunTexture = new THREE.CanvasTexture(sunCanvas);
    sunTexture.colorSpace = THREE.SRGBColorSpace;
    const sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    sunSprite.position.z = -2;
    scene.add(sunSprite);

    // Four-point flare.
    const flareCanvas = document.createElement("canvas");
    flareCanvas.width = flareCanvas.height = 256;
    const flareCtx = flareCanvas.getContext("2d")!;
    const flareCore = flareCtx.createRadialGradient(128, 128, 0, 128, 128, 40);
    flareCore.addColorStop(0, "rgba(255,255,255,1)");
    flareCore.addColorStop(0.4, "rgba(200,230,255,.6)");
    flareCore.addColorStop(1, "rgba(120,180,255,0)");
    flareCtx.fillStyle = flareCore;
    flareCtx.fillRect(0, 0, 256, 256);

    const flareH = flareCtx.createLinearGradient(0, 0, 256, 0);
    [0, 0.5, 1].forEach((stop) =>
      flareH.addColorStop(
        stop,
        stop === 0.5 ? "rgba(230,245,255,.95)" : "rgba(150,200,255,0)",
      ),
    );
    flareCtx.fillStyle = flareH;
    flareCtx.fillRect(0, 127, 256, 2);

    const flareV = flareCtx.createLinearGradient(0, 0, 0, 256);
    [0, 0.5, 1].forEach((stop) =>
      flareV.addColorStop(
        stop,
        stop === 0.5 ? "rgba(230,245,255,.95)" : "rgba(150,200,255,0)",
      ),
    );
    flareCtx.fillStyle = flareV;
    flareCtx.fillRect(127, 0, 2, 256);

    const flareTexture = new THREE.CanvasTexture(flareCanvas);
    flareTexture.colorSpace = THREE.SRGBColorSpace;
    const flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flareTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    flare.renderOrder = 11;
    flare.material.opacity = 0.75;
    scene.add(flare);

    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      }),
    );
    scene.add(core);

    const layout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const hh = Math.tan(THREE.MathUtils.degToRad(15)) * 10;
      const ww = hh * camera.aspect;
      const r = Math.max(1.55 * hh, 0.83 * ww);
      const cx = 0.8 * ww;
      const cy = 0.15 * hh - r;

      group.position.set(cx, cy, 0);
      group.scale.setScalar(r);
      atmosphere.position.copy(group.position);
      atmosphere.scale.setScalar(r);
      sun.position.set(0.5, 1, 0.8);

      const sunAngle = (100 * Math.PI) / 180;
      sunSprite.position.set(
        (cx + 1.0 * r * Math.cos(sunAngle)) * 1.2,
        (cy + 1.0 * r * Math.sin(sunAngle)) * 1.2,
        -2,
      );
      sunSprite.scale.setScalar(hh * 1.9 * 1.2);
      flare.position.copy(sunSprite.position);
      flare.scale.setScalar(hh * 1.8 * 1.2);
      core.position.copy(sunSprite.position);
      core.scale.setScalar(hh * 0.75 * 1.2);

      resizeStars();
    };

    window.addEventListener("resize", layout);

    // Build an equirectangular texture from the supplied Mars disc photo.
    const marsPhoto = new Image();
    let marsTexture: THREE.CanvasTexture | null = null;
    marsPhoto.onload = () => {
      if (disposed) return;

      const discCanvas = document.createElement("canvas");
      discCanvas.width = discCanvas.height = marsPhoto.width;
      const discCtx = discCanvas.getContext("2d")!;
      discCtx.drawImage(marsPhoto, 0, 0);

      const src = discCtx.getImageData(0, 0, discCanvas.width, discCanvas.height).data;
      const W = 1024;
      const H = 512;
      const outCanvas = document.createElement("canvas");
      outCanvas.width = W;
      outCanvas.height = H;
      const outCtx = outCanvas.getContext("2d")!;
      const out = outCtx.createImageData(W, H);
      const cc = discCanvas.width / 2;
      const rr = cc * 0.89;

      for (let j = 0; j < H; j++) {
        const lat = Math.PI / 2 - ((j + 0.5) / H) * Math.PI;
        const y = Math.sin(lat);
        const cl = Math.cos(lat);
        for (let i = 0; i < W; i++) {
          const lon = ((i + 0.5) / W) * 2 * Math.PI - Math.PI;
          const px = cl * Math.sin(lon);
          const sxp = Math.min(
            discCanvas.width - 1,
            Math.max(0, Math.round(cc + px * rr)),
          );
          const syp = Math.min(
            discCanvas.height - 1,
            Math.max(0, Math.round(cc - y * rr)),
          );
          const a = (syp * discCanvas.width + sxp) * 4;
          const b = (j * W + i) * 4;
          out.data[b] = src[a];
          out.data[b + 1] = src[a + 1];
          out.data[b + 2] = src[a + 2];
          out.data[b + 3] = 255;
        }
      }

      outCtx.putImageData(out, 0, 0);
      marsTexture = new THREE.CanvasTexture(outCanvas);
      marsTexture.colorSpace = THREE.SRGBColorSpace;
      marsTexture.anisotropy = 8;
      mars.material.map = marsTexture;
      mars.material.color.set(0xffffff);
      mars.material.needsUpdate = true;
    };
    marsPhoto.src = marsPhotoUrl;

    // Drag to rotate with inertia.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let vx = 0;
    let vy = 0;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      glCanvas.classList.add("is-dragging");
      glCanvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      vx = (event.clientX - lastX) * 0.006;
      vy = (event.clientY - lastY) * 0.006;
      mars.rotation.y += vx;
      mars.rotation.x = Math.max(-0.9, Math.min(0.9, mars.rotation.x + vy));
      lastX = event.clientX;
      lastY = event.clientY;
    };

    const endDrag = () => {
      dragging = false;
      glCanvas.classList.remove("is-dragging");
    };

    glCanvas.addEventListener("pointerdown", onPointerDown);
    glCanvas.addEventListener("pointermove", onPointerMove);
    glCanvas.addEventListener("pointerup", endDrag);
    glCanvas.addEventListener("pointercancel", endDrag);

    layout();

    const loop = (t: number) => {
      if (!dragging) {
        mars.rotation.y += vx + 0.0012;
        vx *= 0.95;
        mars.rotation.x = Math.max(-0.9, Math.min(0.9, mars.rotation.x + vy));
        vy *= 0.92;
      }
      drawStars(t);
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
      glCanvas.removeEventListener("pointerdown", onPointerDown);
      glCanvas.removeEventListener("pointermove", onPointerMove);
      glCanvas.removeEventListener("pointerup", endDrag);
      glCanvas.removeEventListener("pointercancel", endDrag);
      marsPhoto.onload = null;

      sunTexture.dispose();
      flareTexture.dispose();
      marsTexture?.dispose();
      atmosphere.geometry.dispose();
      (atmosphere.material as THREE.ShaderMaterial).dispose();
      mars.geometry.dispose();
      mars.material.dispose();
      sunSprite.material.dispose();
      flare.material.dispose();
      core.material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`menu-screen${leaving ? " is-leaving" : ""}`}>
      <div className="menu-sky" />
      <canvas ref={starsRef} className="menu-stars" aria-hidden="true" />
      <canvas ref={glRef} className="menu-gl" aria-hidden="true" />

      <div className="menu-panel" ref={panelRef}>
        <img className="menu-logo" alt="Project: Zero Requiem" src={logoUrl} />
        <nav className="menu-nav" aria-label="Main menu">
          <button type="button" onClick={handlePlay}>
            Play
          </button>
          <button type="button" onClick={() => setOverlay(ABOUT_OVERLAY)}>
            About
          </button>
        </nav>
        <div className="menu-brand">S.U.N.A&nbsp;IV</div>
      </div>

      {overlay && (
        <div
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-overlay-title"
          onClick={() => setOverlay(null)}
        >
          <div className="menu-box" onClick={(event) => event.stopPropagation()}>
            <h2 id="menu-overlay-title">{overlay.title}</h2>
            <p>{overlay.body}</p>
            <button type="button" onClick={() => setOverlay(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
