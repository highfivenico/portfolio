import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import Draggable from "gsap/Draggable";

gsap.registerPlugin(Draggable);

// Layout vertical global
const ICON_LAYOUT = {
  floorOffset: 10, // marge visuelle par rapport au bas de la section
  initialMinYFactor: 0.55, // zone verticale initiale (en proportion de la hauteur)
};

// Paramètres physiques
const PHYSICS = {
  gravity: 2000, // accélération vers le bas (plus grand = chute plus rapide)
  airFriction: 0.992, // frottement global (proche de 1 = glisse longtemps)
  restitution: 0.2, // rebond entre icônes (0 = mou, 1 = très rebondissant)
  wallBounce: 0.2, // rebond sur murs / sol / plafond
  angularFriction: 0.8, // ralentissement de la rotation
  spinFactor: 0.3, // quantité de rotation ajoutée au "lâcher" après drag
  maxDeltaTime: 0.04, // pour éviter les gros sauts de simulation
  windSpeedThreshold: 900, // vitesse souris minimale pour "souffler" sur les icônes
  windRadius: 250, // rayon d'effet autour de la souris pour le souffle
  windForceBase: 480, // intensité de base du souffle
};

// Repos (sleep) : on sépare translation et rotation
const SLEEP = {
  linearEnterSpeed: 40, // vitesse linéaire max pour entrer en repos
  angularEnterSpeed: 25, // vitesse angulaire max pour entrer en repos
  framesEnter: 10, // nb de frames calmes avant repos

  linearExitSpeed: 120, // vitesse linéaire pour sortir du repos
  angularExitSpeed: 90, // vitesse angulaire pour sortir du repos

  collisionWakeImpulse: 40, // collision assez forte pour réveiller
};

// Liste des icônes
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
  const bodiesRef = useRef([]); // Corps "physiques" des icônes
  const areaSizeRef = useRef({ width: 0, height: 0 }); // Taille de la zone
  const draggablesRef = useRef([]); // Instances Draggable pour pouvoir les reconfigurer / kill

  const isInViewportRef = useRef(true);
  const isPageVisibleRef = useRef(true);
  const isSimActiveRef = useRef(true); // simulation active (viewport + onglet)

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const icons = Array.from(area.querySelectorAll(".tech-icon"));
    if (!icons.length) return;

    // Mesure la taille actuelle de la zone d’icônes
    const measureAreaSize = () => {
      const rect = area.getBoundingClientRect();
      areaSizeRef.current = {
        width: rect.width,
        height: rect.height,
      };
    };

    measureAreaSize();

    const { floorOffset, initialMinYFactor } = ICON_LAYOUT;
    const {
      gravity,
      airFriction,
      restitution,
      wallBounce,
      angularFriction,
      spinFactor,
      maxDeltaTime,
      windSpeedThreshold,
      windRadius,
      windForceBase,
    } = PHYSICS;

    const { width: areaWidth, height: areaHeight } = areaSizeRef.current;

    // Création des bodies (coordonnées centre)
    const bodies = icons.map((el) => {
      const iconWidth = el.offsetWidth || 200;
      const radius = iconWidth * 0.5;

      const minY = areaHeight * initialMinYFactor;
      const maxY = areaHeight - floorOffset - radius;

      // Position de départ aléatoire
      const centerX = gsap.utils.random(
        radius,
        Math.max(radius, areaWidth - radius)
      );
      const centerY = gsap.utils.random(minY, Math.max(minY + 1, maxY));
      const angle = gsap.utils.random(-12, 12);

      // Conversion centre (x, y) → position DOM (coin haut-gauche)
      gsap.set(el, {
        x: centerX - radius,
        y: centerY - radius,
        rotation: angle,
        transformOrigin: `${gsap.utils.random(30, 70)}% ${gsap.utils.random(
          30,
          70
        )}%`,
      });

      return {
        el,
        // Coordonnées "centre" utilisées par la physique
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        radius,
        angle,
        angularVelocity: gsap.utils.random(-20, 20),

        // État pour le drag
        isDragging: false,
        lastDragX: null,
        lastDragY: null,
        lastDragTime: null,
        dragVx: 0,
        dragVy: 0,

        // Repos translation / rotation
        linearSleepCounter: 0,
        angularSleepCounter: 0,
        isLinearSleeping: false,
        isAngularSleeping: false,
      };
    });

    bodiesRef.current = bodies;

    // Draggable (drag + inertie)
    const draggables = bodies.map((body) => {
      const draggable = Draggable.create(body.el, {
        type: "x,y",
        bounds: area, // borné visuellement à l'intérieur de la section
        onPress() {
          body.isDragging = true;

          // réveil complet
          body.isLinearSleeping = false;
          body.isAngularSleeping = false;
          body.linearSleepCounter = 0;
          body.angularSleepCounter = 0;

          body.vx = 0;
          body.vy = 0;
          body.angularVelocity *= 0.5;

          // On convertit le top-left DOM → coordonnées centre pour la physique
          const domX = this.x;
          const domY = this.y;
          body.x = domX + body.radius;
          body.y = domY + body.radius;

          body.lastDragX = body.x;
          body.lastDragY = body.y;
          body.lastDragTime = performance.now();
          body.dragVx = 0;
          body.dragVy = 0;
        },
        onDrag() {
          const now = performance.now();
          const dt = (now - (body.lastDragTime || now)) / 1000 || 0.0001;

          // Nouvelle position DOM (coin haut-gauche)
          const domX = this.x;
          const domY = this.y;
          // Nouvelle position "centre"
          const centerX = domX + body.radius;
          const centerY = domY + body.radius;

          const dx = centerX - body.lastDragX;
          const dy = centerY - body.lastDragY;

          body.dragVx = dx / dt;
          body.dragVy = dy / dt;

          body.lastDragX = centerX;
          body.lastDragY = centerY;
          body.lastDragTime = now;

          body.x = centerX;
          body.y = centerY;
        },
        onRelease() {
          body.isDragging = false;

          const speed = Math.hypot(body.dragVx, body.dragVy);

          // Inertie au "lâcher" : vitesse + rotation
          if (speed > 50) {
            const norm = speed / 500;
            const boost = gsap.utils.clamp(0.4, 1, 1.1 + norm * 2);

            body.vx = body.dragVx * boost;
            body.vy = body.dragVy * boost;

            const spinSign = body.dragVx >= 0 ? 1 : -1;
            body.angularVelocity += spinSign * speed * spinFactor;
          }

          body.lastDragX = null;
          body.lastDragY = null;
          body.lastDragTime = null;
          body.dragVx = 0;
          body.dragVy = 0;
        },
      })[0];

      return draggable;
    });

    draggablesRef.current = draggables;

    // Boucle de simulation physique
    let lastTime = performance.now();

    const update = () => {
      const now = performance.now();

      if (!isSimActiveRef.current) {
        lastTime = now;
        return;
      }

      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > maxDeltaTime) dt = maxDeltaTime;

      const bodies = bodiesRef.current;
      const { width: currentWidth, height: currentHeight } =
        areaSizeRef.current;
      const floorY = currentHeight - floorOffset;

      // 1) Intégration (gravité, frottements, murs)
      for (const body of bodies) {
        if (body.isDragging) continue;

        // Réveil automatique si vitesse importante
        const speed = Math.hypot(body.vx, body.vy);
        const angSpeed = Math.abs(body.angularVelocity);

        if (
          speed > SLEEP.linearExitSpeed ||
          angSpeed > SLEEP.angularExitSpeed
        ) {
          body.isLinearSleeping = false;
          body.isAngularSleeping = false;
          body.linearSleepCounter = 0;
          body.angularSleepCounter = 0;
        }

        // Translation : seulement si pas en repos linéaire
        if (!body.isLinearSleeping) {
          body.vy += gravity * dt;
          body.vx *= airFriction;
          body.vy *= airFriction;

          body.x += body.vx * dt;
          body.y += body.vy * dt;
        } else {
          body.vx = 0;
          body.vy = 0;
        }

        // Rotation : seulement si pas en repos angulaire
        if (!body.isAngularSleeping) {
          body.angularVelocity *= angularFriction;
          body.angle += body.angularVelocity * dt;
        } else {
          body.angularVelocity = 0;
        }

        let hitWall = false;

        // Bords gauche/droite
        if (body.x - body.radius < 0) {
          body.x = body.radius;
          body.vx *= -wallBounce;
          hitWall = true;
        } else if (body.x + body.radius > currentWidth) {
          body.x = currentWidth - body.radius;
          body.vx *= -wallBounce;
          hitWall = true;
        }

        // Plafond
        if (body.y - body.radius < 0) {
          body.y = body.radius;
          body.vy *= -wallBounce;
          hitWall = true;
        }

        // Sol
        if (body.y + body.radius > floorY) {
          body.y = floorY - body.radius;
          body.vy *= -wallBounce;
          hitWall = true;
        }

        if (hitWall) {
          const bounceSpin = (Math.abs(body.vx) + Math.abs(body.vy)) * 0.01;
          body.angularVelocity += (body.vx >= 0 ? 1 : -1) * bounceSpin;
        }
      }

      // 2) Collisions entre icônes
      const len = bodies.length;
      for (let i = 0; i < len; i++) {
        const bi = bodies[i];
        for (let j = i + 1; j < len; j++) {
          const bj = bodies[j];

          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist = Math.hypot(dx, dy);
          const minDist = bi.radius + bj.radius;

          if (dist > 0 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) / 2;

            const biDraggingOnly = bi.isDragging && !bj.isDragging;
            const bjDraggingOnly = bj.isDragging && !bi.isDragging;

            // Résolution de la pénétration
            if (!biDraggingOnly && !bi.isLinearSleeping) {
              bi.x -= nx * overlap;
              bi.y -= ny * overlap;
            }
            if (!bjDraggingOnly && !bj.isLinearSleeping) {
              bj.x += nx * overlap;
              bj.y += ny * overlap;
            }

            // Résolution des vitesses (rebond simple)
            const rvx = bj.vx - bi.vx;
            const rvy = bj.vy - bi.vy;
            const relVelAlongNormal = rvx * nx + rvy * ny;

            if (relVelAlongNormal < 0) {
              const impulse = (-(1 + restitution) * relVelAlongNormal) / 2;
              const ix = impulse * nx;
              const iy = impulse * ny;

              const impulseMag = Math.abs(impulse);

              // Collision suffisamment forte → réveil complet
              if (impulseMag > SLEEP.collisionWakeImpulse) {
                bi.isLinearSleeping = false;
                bi.isAngularSleeping = false;
                bi.linearSleepCounter = 0;
                bi.angularSleepCounter = 0;
                bj.isLinearSleeping = false;
                bj.isAngularSleeping = false;
                bj.linearSleepCounter = 0;
                bj.angularSleepCounter = 0;
              }

              if (!biDraggingOnly) {
                bi.vx -= ix;
                bi.vy -= iy;
              }
              if (!bjDraggingOnly) {
                bj.vx += ix;
                bj.vy += iy;
              }

              const collisionSpin = 25;
              bi.angularVelocity -= collisionSpin * 0.01 * (ny >= 0 ? 1 : -1);
              bj.angularVelocity += collisionSpin * 0.01 * (ny >= 0 ? 1 : -1);
            }
          }
        }
      }

      // 3) Mise à jour des états de repos (sleep) pour chaque body
      for (const body of bodies) {
        if (body.isDragging) {
          body.isLinearSleeping = false;
          body.isAngularSleeping = false;
          body.linearSleepCounter = 0;
          body.angularSleepCounter = 0;
          continue;
        }

        const speed = Math.hypot(body.vx, body.vy);
        const angSpeed = Math.abs(body.angularVelocity);

        // Entrée en repos linéaire
        if (speed < SLEEP.linearEnterSpeed) {
          body.linearSleepCounter += 1;
          if (
            body.linearSleepCounter >= SLEEP.framesEnter &&
            !body.isLinearSleeping
          ) {
            body.isLinearSleeping = true;
            body.vx = 0;
            body.vy = 0;
          }
        } else {
          body.linearSleepCounter = 0;
          body.isLinearSleeping = false;
        }

        // Entrée en repos angulaire
        if (angSpeed < SLEEP.angularEnterSpeed) {
          body.angularSleepCounter += 1;
          if (
            body.angularSleepCounter >= SLEEP.framesEnter &&
            !body.isAngularSleeping
          ) {
            body.isAngularSleeping = true;
            body.angularVelocity = 0;
            // petit arrondi pour stabiliser visuellement
            body.angle = Math.round(body.angle);
          }
        } else {
          body.angularSleepCounter = 0;
          body.isAngularSleeping = false;
        }
      }

      // 4) Application des transforms DOM
      for (const body of bodies) {
        if (!body.isDragging) {
          gsap.set(body.el, {
            x: body.x - body.radius,
            y: body.y - body.radius,
            rotation: body.angle,
          });
        }
      }
    };

    gsap.ticker.add(update);

    // Effet impulsion souris aux icones
    let lastMouseX = null;
    let lastMouseY = null;
    let lastMouseTime = null;

    const onMouseMove = (e) => {
      if (!isSimActiveRef.current) return;

      const bounds = area.getBoundingClientRect();
      const mx = e.clientX - bounds.left;
      const my = e.clientY - bounds.top;
      const now = performance.now();

      if (
        lastMouseX !== null &&
        lastMouseY !== null &&
        lastMouseTime !== null
      ) {
        const dx = mx - lastMouseX;
        const dy = my - lastMouseY;
        const dt = (now - lastMouseTime) / 1000;

        if (dt > 0) {
          const speed = Math.hypot(dx, dy) / dt;

          if (speed > windSpeedThreshold) {
            const bodies = bodiesRef.current;

            for (const body of bodies) {
              if (body.isDragging) continue;

              const ddx = body.x - mx;
              const ddy = body.y - my;
              const dist = Math.hypot(ddx, ddy);

              if (dist > 0 && dist < windRadius) {
                const influence = (windRadius - dist) / windRadius;
                const force = influence * (speed / 1000) * windForceBase;
                const nx = ddx / dist;
                const ny = ddy / dist;

                // un coup de vent réveille l'icône
                body.isLinearSleeping = false;
                body.isAngularSleeping = false;
                body.linearSleepCounter = 0;
                body.angularSleepCounter = 0;

                body.vx += nx * force;
                body.vy += ny * force;
                body.angularVelocity += (nx + ny) * 5 * influence;
              }
            }
          }
        }
      }

      lastMouseX = mx;
      lastMouseY = my;
      lastMouseTime = now;
    };

    area.addEventListener("mousemove", onMouseMove);

    // ResizeObserver met à jour la taille de la zone
    const resizeObserver = new ResizeObserver(() => {
      measureAreaSize();
      draggablesRef.current.forEach((d) => {
        if (d && d.applyBounds) d.applyBounds();
      });
    });
    resizeObserver.observe(area);

    // Visibility / viewport
    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible";
      isSimActiveRef.current =
        isPageVisibleRef.current && isInViewportRef.current;
    };

    document.addEventListener("visibilitychange", handleVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === area) {
            isInViewportRef.current =
              entry.isIntersecting && entry.intersectionRatio > 0.1;
            isSimActiveRef.current =
              isInViewportRef.current && isPageVisibleRef.current;
          }
        });
      },
      { threshold: 0.1 }
    );

    io.observe(area);

    // Nettoyage complet au démontage
    return () => {
      gsap.ticker.remove(update);
      area.removeEventListener("mousemove", onMouseMove);
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      draggablesRef.current.forEach((d) => d && d.kill());
      draggablesRef.current = [];
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
