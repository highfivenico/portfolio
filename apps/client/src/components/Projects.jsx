// src/components/Projects.jsx
import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { projects } from "../data/projects";
import ProjectsIcons from "./ProjectsIcons";

gsap.registerPlugin(Draggable);

const Projects = () => {
  const sectionRef = useRef(null);
  const wrapperRef = useRef(null);
  const carouselRef = useRef(null);

  const cardsRef = useRef([]);
  const draggableRef = useRef(null);

  // API interne pour contrôler depuis les flèches
  const apiRef = useRef({
    goToRelative: (step) => {},
  });

  // --- 1) suivre la largeur de la fenêtre ---
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const wrapper = wrapperRef.current;
      const carousel = carouselRef.current;
      const cards = cardsRef.current;

      if (!wrapper || !carousel || !cards.length) return;

      // Toujours repartir d'un x propre
      gsap.set(carousel, { x: 0 });

      const wrapperWidth = wrapper.offsetWidth;

      // Mesure réelle, fiable, dans le repère du wrapper
      const wrapperRect = wrapper.getBoundingClientRect();

      const cardCenters = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return rect.left - wrapperRect.left + rect.width / 2;
      });

      // Positions pour centrer chaque carte
      const targetPositions = cardCenters.map((c) => wrapperWidth / 2 - c);

      let isDragging = false;
      let dragStartX = 0;

      const updateScale = () => {
        const bounds = wrapper.getBoundingClientRect();
        const center = bounds.left + bounds.width / 2;

        const dragFactor = isDragging ? 0.96 : 1;

        cards.forEach((card) => {
          if (!card) return;
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const dist = Math.abs(center - cardCenter);
          const ratio = gsap.utils.clamp(0, 1, dist / (bounds.width / 2));

          const baseScale = 0.9 + (1.06 - 0.9) * (1 - ratio);
          const scale = baseScale * dragFactor;

          gsap.to(card, {
            scale,
            duration: 0.15,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
      };

      const getClosestIndex = () => {
        const currentX = parseFloat(gsap.getProperty(carousel, "x")) || 0;

        let closestIndex = 0;
        let closestDist = Infinity;

        targetPositions.forEach((tx, index) => {
          const dist = Math.abs(currentX - tx);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = index;
          }
        });

        return closestIndex;
      };

      const snapToIndex = (targetIndex) => {
        const clamped = gsap.utils.clamp(
          0,
          targetPositions.length - 1,
          targetIndex
        );

        const targetX = targetPositions[clamped];
        const currentX = parseFloat(gsap.getProperty(carousel, "x")) || 0;
        const distance = Math.abs(currentX - targetX);

        if (distance < 5) {
          isDragging = false;
          updateScale();
          return;
        }

        isDragging = false;

        gsap.to(carousel, {
          x: targetX,
          duration: 0.25,
          ease: "power2.out",
          onUpdate: () => {
            draggableRef.current && draggableRef.current.update();
            updateScale();
          },
        });
      };

      const snapToClosest = () => {
        const idx = getClosestIndex();
        snapToIndex(idx);
      };

      const finishDrag = (finalX) => {
        const delta = finalX - dragStartX;
        const threshold = 3;

        if (Math.abs(delta) > threshold) {
          const direction = delta < 0 ? 1 : -1;
          const current = getClosestIndex();
          snapToIndex(current + direction);
        } else {
          snapToClosest();
        }
      };

      // Draggable avec bounds à jour
      draggableRef.current = Draggable.create(carousel, {
        type: "x",
        inertia: true,
        bounds: {
          minX: targetPositions[targetPositions.length - 1],
          maxX: targetPositions[0],
        },

        onPress: function () {
          isDragging = true;
          dragStartX = this.x;
          updateScale();
        },
        onDrag: updateScale,
        onThrowUpdate: updateScale,
        onRelease: function () {
          finishDrag(this.x);
        },
        onDragEnd: function () {
          finishDrag(this.x);
        },
      })[0];

      // Centrer la première carte au chargement
      gsap.set(carousel, { x: targetPositions[0] });
      draggableRef.current.update();
      updateScale();

      const goToRelative = (step) => {
        const current = getClosestIndex();
        snapToIndex(current + step);
      };

      apiRef.current.goToRelative = goToRelative;

      const onKeyDown = (e) => {
        if (e.key === "ArrowRight") {
          goToRelative(1);
        } else if (e.key === "ArrowLeft") {
          goToRelative(-1);
        }
      };

      window.addEventListener("keydown", onKeyDown);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        if (draggableRef.current) {
          draggableRef.current.kill();
          draggableRef.current = null;
        }
      };
    }, sectionRef);

    return () => ctx.revert();
  }, [viewportWidth]); // <--- recalcul à chaque changement de largeur

  const handlePrev = () => {
    apiRef.current.goToRelative(-1);
  };

  const handleNext = () => {
    apiRef.current.goToRelative(1);
  };

  return (
    <section className="projects" ref={sectionRef}>
      <h2 className="projects__title">PROJECTS</h2>

      <p className="projects__subtitle">
        JE CONÇOIS DES INTERFACES MODERNES ET ÉLÉGANTES EN ALLIANT ESTHÉTIQUE,
        PERFORMANCE ET PRÉCISION.
      </p>

      <div className="projects__carousel-wrapper" ref={wrapperRef}>
        <div className="projects__carousel" ref={carouselRef}>
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="project-card"
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <div className="project-card__head">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="project-card__content">
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="project-card__image"
                  />
                )}
              </div>

              <div className="project-card__hover-text">{project.short}</div>
            </article>
          ))}
        </div>

        <div className="projects__controls">
          <button
            className="projects__arrow projects__arrow--left"
            type="button"
            aria-label="Projet précédent"
            onClick={handlePrev}
          >
            ‹
          </button>

          <button
            className="projects__arrow projects__arrow--right"
            type="button"
            aria-label="Projet suivant"
            onClick={handleNext}
          >
            ›
          </button>
        </div>
      </div>

      <ProjectsIcons />
    </section>
  );
};

export default Projects;
