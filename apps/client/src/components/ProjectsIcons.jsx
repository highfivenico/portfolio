import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import Draggable from "gsap/Draggable";

gsap.registerPlugin(Draggable);

// Utilitaires GSAP
const { random, clamp } = gsap.utils;

// Layout global des icônes
const ICON_LAYOUT = {
  floorOffset: 10, // marge par rapport au bas de la zone
  initialMinYFactor: 0.55, // début de la zone verticale de spawn (en proportion de la hauteur)
};

// Paramètres physiques principaux
const PHYSICS = {
  gravity: 2000, // accélération verticale vers le bas (px/s²)
  airFriction: 0.992, // dissipation de vitesse (proche de 1 = glisse longue)
  restitution: 0.3, // rebond entre icônes (0 = amorti, 1 = très rebondissant)
  wallBounce: 0.5, // rebond sur les limites (murs / sol / plafond)
  angularFriction: 0.8, // dissipation de la rotation
  spinFactor: 0.3, // quantité de rotation injectée au "lâcher"
  maxDeltaTime: 0.04, // dt maximum pour lisser les gros lags
};

// Paramètres liés au drag
const DRAG = {
  velocityFollowFactor: 0.5, // proportion de la vitesse souris réinjectée dans le body pendant le drag
  minReleaseSpeed: 50, // vitesse minimale pour déclencher une inertie au lâcher
};

// Paramètres du souffle (effet “coup de vent” au passage de la souris)
const WIND = {
  speedThreshold: 1000, // vitesse souris minimale pour déclencher le souffle
  radius: 250, // rayon de portée autour du pointeur
  forceBase: 300, // intensité de base du souffle
};

// Paramètres de collision (qualité visuelle et stabilité)
const COLLISION = {
  separationPadding: 1.5, // marge supplémentaire pour limiter le chevauchement résiduel
};

// Paramètres de repos (sleep) pour optimiser la simulation
const SLEEP = {
  linearEnterSpeed: 40, // vitesse linéaire max pour basculer en repos
  angularEnterSpeed: 25, // vitesse angulaire max pour basculer en repos
  framesEnter: 10, // nombre de frames calmes avant repos
  linearExitSpeed: 120, // vitesse linéaire pour sortir du repos
  angularExitSpeed: 90, // vitesse angulaire pour sortir du repos
  collisionWakeImpulse: 40, // intensité de collision suffisante pour réveiller un body
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
  const bodiesRef = useRef([]); // Corps “physiques” des icônes
  const areaSizeRef = useRef({ width: 0, height: 0 }); // Taille courante de la zone
  const draggablesRef = useRef([]); // Instances Draggable (pour mise à jour / cleanup)

  const isInViewportRef = useRef(true);
  const isPageVisibleRef = useRef(true);
  const isSimActiveRef = useRef(true); // true si la simulation doit tourner (viewport + onglet visibles)

  // Initialise le moteur physique des icônes
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const iconEls = Array.from(area.querySelectorAll(".tech-icon"));
    if (!iconEls.length) return;

    // Mesure de la taille de la zone d’icônes
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
    } = PHYSICS;

    const { width: areaWidth, height: areaHeight } = areaSizeRef.current;

    // Création des bodies (coordonnées basées sur le centre visuel)
    const bodies = iconEls.map((el) => {
      const iconWidth = el.offsetWidth || 200;
      const radius = iconWidth * 0.5;

      const minY = areaHeight * initialMinYFactor;
      const maxY = areaHeight - floorOffset - radius;

      // Position de départ aléatoire dans la zone autorisée
      const cx = random(radius, Math.max(radius, areaWidth - radius));
      const cy = random(minY, Math.max(minY + 1, maxY));
      const angle = random(-12, 12);

      // Conversion centre (cx, cy) → top-left DOM
      gsap.set(el, {
        x: cx - radius,
        y: cy - radius,
        rotation: angle,
        transformOrigin: `${random(30, 70)}% ${random(30, 70)}%`,
      });

      return {
        el,
        // Coordonnées de centre utilisées par la physique
        x: cx,
        y: cy,
        // Vitesse
        vx: 0,
        vy: 0,
        radius,
        // Rotation
        angle,
        // Vitesse angulaire
        angularVelocity: random(-20, 20),

        // État lié au drag
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

    // Création des Draggables (drag + inertie)
    const draggables = bodies.map((body) => {
      const d = Draggable.create(body.el, {
        type: "x,y",
        bounds: area, // l’élément reste visuellement dans la zone
        onPress() {
          body.isDragging = true;

          // Sortie de repos : reset complet de l’état de sommeil
          body.isLinearSleeping = false;
          body.isAngularSleeping = false;
          body.linearSleepCounter = 0;
          body.angularSleepCounter = 0;

          body.vx = 0;
          body.vy = 0;
          body.angularVelocity *= 0.5;

          // Conversion top-left DOM → centre physique
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

          const domX = this.x;
          const domY = this.y;
          const cx = domX + body.radius;
          const cy = domY + body.radius;

          const dx = cx - body.lastDragX;
          const dy = cy - body.lastDragY;

          body.dragVx = dx / dt;
          body.dragVy = dy / dt;

          body.lastDragX = cx;
          body.lastDragY = cy;
          body.lastDragTime = now;

          body.x = cx;
          body.y = cy;

          // Injection de vitesse pendant le drag :
          // permet au body draggué de transmettre une poussée physique aux autres même lors de déplacements lents.
          body.vx = body.dragVx * DRAG.velocityFollowFactor;
          body.vy = body.dragVy * DRAG.velocityFollowFactor;
        },
        onRelease() {
          body.isDragging = false;

          const speed = Math.hypot(body.dragVx, body.dragVy);

          // Inertie à la fin du drag (lancer + rotation)
          if (speed > DRAG.minReleaseSpeed) {
            // Normalise la vitesse pour obtenir un coefficient raisonnable
            const norm = speed / 500;
            // Permet d'amplifier ou réduire la vitesse finale en restant dans un cadre
            const boost = clamp(0.4, 1, 1.1 + norm * 2);

            body.vx = body.dragVx * boost;
            body.vy = body.dragVy * boost;

            // L'icône tourne dans le sens du geste horizontal
            const spinSign = body.dragVx >= 0 ? 1 : -1;
            body.angularVelocity += spinSign * speed * spinFactor;
          }

          // Nettoyage des états du drag
          body.lastDragX = null;
          body.lastDragY = null;
          body.lastDragTime = null;
          body.dragVx = 0;
          body.dragVy = 0;
        },
      })[0];

      return d;
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

      // Delta Time en secondes
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      // Evite les gros lags
      if (dt > maxDeltaTime) dt = maxDeltaTime;

      const bodies = bodiesRef.current;
      const { width: w, height: h } = areaSizeRef.current;
      const floorY = h - floorOffset;

      // 1) Intégration (gravité, frottements, collisions murs)
      for (const body of bodies) {
        // Si l'icône est drag elle n'est pas animé avec la physique
        if (body.isDragging) continue;

        const speed = Math.hypot(body.vx, body.vy);
        const angSpeed = Math.abs(body.angularVelocity);

        // Sortie de repos automatique si la vitesse est significative
        if (
          speed > SLEEP.linearExitSpeed ||
          angSpeed > SLEEP.angularExitSpeed
        ) {
          body.isLinearSleeping = false;
          body.isAngularSleeping = false;
          body.linearSleepCounter = 0;
          body.angularSleepCounter = 0;
        }

        // Translation uniquement si le body n’est pas en repos linéaire
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

        // Rotation uniquement si le body n’est pas en repos angulaire
        if (!body.isAngularSleeping) {
          body.angularVelocity *= angularFriction;
          body.angle += body.angularVelocity * dt;
        } else {
          body.angularVelocity = 0;
        }

        let hitWall = false;

        // Bords gauche / droite
        if (body.x - body.radius < 0) {
          body.x = body.radius;
          body.vx *= -wallBounce;
          hitWall = true;
        } else if (body.x + body.radius > w) {
          body.x = w - body.radius;
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

        // Ajout de rotation après collision en fonction de la vitesse
        if (hitWall) {
          const bounceSpin = (Math.abs(body.vx) + Math.abs(body.vy)) * 0.01;
          body.angularVelocity += (body.vx >= 0 ? 1 : -1) * bounceSpin;
        }
      }

      // 2) Collisions entre icônes
      const len = bodies.length;
      const minPadding = COLLISION.separationPadding;

      for (let i = 0; i < len; i++) {
        const bi = bodies[i];
        for (let j = i + 1; j < len; j++) {
          const bj = bodies[j];

          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist = Math.hypot(dx, dy);
          const minDist = bi.radius + bj.radius;
          const targetDist = minDist + minPadding;

          // Il y a collision si la distance est nulle ou inferieure
          if (dist > 0 && dist < targetDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (targetDist - dist) / 2;

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

              // Collision suffisamment marquée = sortie de repos des deux bodies
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

      // 3) Gestion de l’état de repos (sleep) pour chaque body
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
            // Arrondi léger pour stabiliser visuellement l’orientation
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

    // Effet de “souffle” au mouvement rapide de la souris
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

          if (speed > WIND.speedThreshold) {
            const bodies = bodiesRef.current;

            for (const body of bodies) {
              if (body.isDragging) continue;

              const ddx = body.x - mx;
              const ddy = body.y - my;
              const dist = Math.hypot(ddx, ddy);

              if (dist > 0 && dist < WIND.radius) {
                const influence = (WIND.radius - dist) / WIND.radius;
                const force = influence * (speed / 1000) * WIND.forceBase;
                const nx = ddx / dist;
                const ny = ddy / dist;

                // Le souffle réveille l’icône
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

    // ResizeObserver pour adapter la simulation aux changements de taille de la zone
    const resizeObserver = new ResizeObserver(() => {
      measureAreaSize();

      const { width: newW, height: newH } = areaSizeRef.current;
      const { floorOffset } = ICON_LAYOUT;
      const floorY = newH - floorOffset;

      const bodies = bodiesRef.current;

      bodies.forEach((body) => {
        const el = body.el;
        if (!el) return;

        // Taille réelle de l’icône
        const iconWidth = el.offsetWidth || body.radius * 2;
        const newRadius = iconWidth * 0.5;

        body.radius = newRadius;

        // Recalage dans les nouvelles bornes
        body.x = clamp(newRadius, newW - newRadius, body.x);

        const minCenterY = newRadius;
        const maxCenterY = floorY - newRadius;
        body.y = clamp(minCenterY, maxCenterY, body.y);

        // Réveil et légère impulsion pour stabiliser après resize
        body.isLinearSleeping = false;
        body.isAngularSleeping = false;
        body.linearSleepCounter = 0;
        body.angularSleepCounter = 0;

        if (body.y < maxCenterY - 5) {
          body.vy += 200;
        }

        body.vx *= 0.5;
        body.vy *= 0.5;
        body.angularVelocity *= 0.5;
      });

      // Vérifie que la simulation est bien réactivée
      isSimActiveRef.current = true;

      // Mise à jour des bounds Draggable
      draggablesRef.current.forEach((d) => {
        if (d && d.applyBounds) d.applyBounds();
      });
    });

    resizeObserver.observe(area);

    // Gestion de la visibilité de l’onglet pour stop l'animation
    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible";
      isSimActiveRef.current =
        isPageVisibleRef.current && isInViewportRef.current;
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Gestion de la présence dans le viewport pour stop l'animation
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

  // Rendu du composant
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
