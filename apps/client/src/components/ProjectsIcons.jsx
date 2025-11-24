// src/components/ProjectsIcons.jsx
import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import Draggable from "gsap/Draggable";

gsap.registerPlugin(Draggable);

const iconsData = [
  { src: "/icons/sass.svg", alt: "Sass" },
  { src: "/icons/html.svg", alt: "HTML" },
  { src: "/icons/css.svg", alt: "CSS" },
  { src: "/icons/git.svg", alt: "Git" },
  { src: "/icons/github.svg", alt: "GitHub" },
  { src: "/icons/js.svg", alt: "JavaScript" },
  { src: "/icons/mongoDB.svg", alt: "MongoDB" },
  { src: "/icons/node-logo.svg", alt: "Node.js" },
  { src: "/icons/nodemon.svg", alt: "Nodemon" },
  { src: "/icons/photoshop.svg", alt: "Photoshop" },
  { src: "/icons/react.svg", alt: "React" },
  { src: "/icons/vitejs.svg", alt: "Vite" },
  { src: "/icons/figma.svg", alt: "Figma" },
];

const ProjectsIcons = () => {
  const areaRef = useRef(null);
  const bodiesRef = useRef([]);

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const icons = Array.from(area.querySelectorAll(".tech-icon"));
    if (!icons.length) return;

    // Dimensions de la zone (fixées à l'init pour éviter les relayouts)
    const rect = area.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    const floorOffset = 70; // garde de l'espace en bas pour éviter la coupe

    // Paramètres physiques globaux (simples & efficaces)
    const gravity = 2000; // gravité douce
    const airFriction = 0.992; // inertie qui dure
    const restitution = 0.2; // rebond entre icônes
    const wallBounce = 0.2; // rebond murs/sol/plafond
    const angularFriction = 0.8;
    const spinFactor = 0.3; // vitesse -> rotation

    // -----------------------
    //  Création des corps
    // -----------------------
    const bodies = icons.map((el) => {
      const w = el.offsetWidth || 80;
      const r = w * 0.5;

      const minY = H * 0.55;
      const maxY = H - floorOffset - r;
      const x = gsap.utils.random(r, W - r);
      const y = gsap.utils.random(minY, Math.max(minY + 1, maxY));

      const angle = gsap.utils.random(-12, 12);

      gsap.set(el, {
        x,
        y,
        rotation: angle,
        transformOrigin: `${gsap.utils.random(30, 70)}% ${gsap.utils.random(
          30,
          70
        )}%`,
      });

      return {
        el,
        x,
        y,
        vx: 0,
        vy: 0,
        r,
        angle,
        angularVelocity: gsap.utils.random(-20, 20),
        isDragging: false,

        // tracking du drag pour calculer une inertie propre
        lastDragX: null,
        lastDragY: null,
        lastDragTime: null,
        dragVx: 0,
        dragVy: 0,
      };
    });

    bodiesRef.current = bodies;

    // -----------------------
    //  Drag avec inertie custom
    // -----------------------
    bodies.forEach((body) => {
      Draggable.create(body.el, {
        type: "x,y",
        bounds: area,
        onPress() {
          body.isDragging = true;
          body.vx = 0;
          body.vy = 0;
          body.angularVelocity *= 0.5;

          body.lastDragX = this.x; // même système de coordonnées que body.x
          body.lastDragY = this.y;
          body.lastDragTime = performance.now();
          body.dragVx = 0;
          body.dragVy = 0;
        },
        onDrag() {
          const now = performance.now();
          const dt = (now - (body.lastDragTime || now)) / 1000 || 0.0001;

          const newX = this.x;
          const newY = this.y;

          // delta dans le même repère que body.x/body.y
          const dx = newX - body.lastDragX;
          const dy = newY - body.lastDragY;

          // vitesse instantanée (px/s)
          const instVx = dx / dt;
          const instVy = dy / dt;

          // on garde en mémoire la dernière vitesse de drag "propre"
          body.dragVx = instVx;
          body.dragVy = instVy;

          body.lastDragX = newX;
          body.lastDragY = newY;
          body.lastDragTime = now;

          // position courante
          body.x = newX;
          body.y = newY;
        },
        onRelease() {
          body.isDragging = false;

          // On calcule la vitesse finale du drag à partir de dragVx/dragVy
          const speed = Math.hypot(body.dragVx, body.dragVy);

          if (speed > 50) {
            // normalisation et boost contrôlé
            const norm = speed / 500; // 500 px/s ~ geste "normal"
            const boost = gsap.utils.clamp(0.4, 1, 1.1 + norm * 2);

            body.vx = body.dragVx * boost;
            body.vy = body.dragVy * boost;

            const spinSign = body.dragVx >= 0 ? 1 : -1;
            body.angularVelocity += spinSign * speed * spinFactor;
          }

          // reset tracking drag
          body.lastDragX = null;
          body.lastDragY = null;
          body.lastDragTime = null;
          body.dragVx = 0;
          body.dragVy = 0;
        },
      });
    });

    // -----------------------
    //  Moteur principal
    // -----------------------
    let lastTime = performance.now();

    const update = () => {
      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > 0.04) dt = 0.04;

      const bodies = bodiesRef.current;
      const floorY = H - floorOffset;

      // 1) Intégration + collisions avec les bords + rotation
      for (const b of bodies) {
        if (b.isDragging) continue;

        // gravité + inertie
        b.vy += gravity * dt;
        b.vx *= airFriction;
        b.vy *= airFriction;

        // rotation inertielle
        b.angularVelocity *= angularFriction;
        b.angle += b.angularVelocity * dt;

        // avance
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        let hitWall = false;

        // gauche / droite
        if (b.x - b.r < 0) {
          b.x = b.r;
          b.vx *= -wallBounce;
          hitWall = true;
        } else if (b.x + b.r > W) {
          b.x = W - b.r;
          b.vx *= -wallBounce;
          hitWall = true;
        }

        // plafond
        if (b.y - b.r < 0) {
          b.y = b.r;
          b.vy *= -wallBounce;
          hitWall = true;
        }

        // sol
        if (b.y + b.r > floorY) {
          b.y = floorY - b.r;
          b.vy *= -wallBounce;
          hitWall = true;
        }

        if (hitWall) {
          const bounceSpin = (Math.abs(b.vx) + Math.abs(b.vy)) * 0.01;
          b.angularVelocity += (b.vx >= 0 ? 1 : -1) * bounceSpin;
        }
      }

      // 2) Collisions entre icônes (simples et stables)
      const len = bodies.length;
      for (let i = 0; i < len; i++) {
        const bi = bodies[i];
        if (bi.isDragging) continue;

        for (let j = i + 1; j < len; j++) {
          const bj = bodies[j];
          if (bj.isDragging) continue;

          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist = Math.hypot(dx, dy);
          const minDist = bi.r + bj.r;

          if (dist > 0 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) / 2;

            // séparer
            bi.x -= nx * overlap;
            bi.y -= ny * overlap;
            bj.x += nx * overlap;
            bj.y += ny * overlap;

            // vitesses relatives
            const rvx = bj.vx - bi.vx;
            const rvy = bj.vy - bi.vy;
            const relVelAlongNormal = rvx * nx + rvy * ny;

            if (relVelAlongNormal < 0) {
              const impulse = (-(1 + restitution) * relVelAlongNormal) / 2;
              const ix = impulse * nx;
              const iy = impulse * ny;

              bi.vx -= ix;
              bi.vy -= iy;
              bj.vx += ix;
              bj.vy += iy;

              const colSpin = 25;
              bi.angularVelocity -= colSpin * 0.01 * (ny >= 0 ? 1 : -1);
              bj.angularVelocity += colSpin * 0.01 * (ny >= 0 ? 1 : -1);
            }
          }
        }
      }

      // 3) Appliquer les transforms
      for (const b of bodies) {
        if (!b.isDragging) {
          gsap.set(b.el, {
            x: b.x,
            y: b.y,
            rotation: b.angle,
          });
        }
      }
    };

    gsap.ticker.add(update);

    // -----------------------
    //  Champ de force souris
    // -----------------------
    let lastMX = null;
    let lastMY = null;
    let lastMT = null;

    const onMouseMove = (e) => {
      const bounds = area.getBoundingClientRect();
      const mx = e.clientX - bounds.left;
      const my = e.clientY - bounds.top;
      const now = performance.now();

      if (lastMX !== null && lastMY !== null && lastMT !== null) {
        const dx = mx - lastMX;
        const dy = my - lastMY;
        const dt = (now - lastMT) / 1000;

        if (dt > 0) {
          const speed = Math.hypot(dx, dy) / dt;

          if (speed > 900) {
            const radius = 250;
            const bodies = bodiesRef.current;

            for (const b of bodies) {
              if (b.isDragging) continue;

              const ddx = b.x - mx;
              const ddy = b.y - my;
              const dist = Math.hypot(ddx, ddy);

              if (dist > 0 && dist < radius) {
                const influence = (radius - dist) / radius;
                const force = influence * (speed / 1000) * 480;
                const nx = ddx / dist;
                const ny = ddy / dist;

                b.vx += nx * force;
                b.vy += ny * force;
                b.angularVelocity += (nx + ny) * 5 * influence;
              }
            }
          }
        }
      }

      lastMX = mx;
      lastMY = my;
      lastMT = now;
    };

    area.addEventListener("mousemove", onMouseMove);

    return () => {
      gsap.ticker.remove(update);
      area.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="projects__icons-area" ref={areaRef}>
      {iconsData.map((icon) => (
        <img
          key={icon.alt}
          className="tech-icon"
          src={icon.src}
          alt={icon.alt}
        />
      ))}
    </div>
  );
};

export default ProjectsIcons;
