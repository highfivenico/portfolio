import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { fetchProjectsSummary, fetchProjectDetail } from "../api/projectsApi";
import ProjectModal from "./ProjectModal";
import ProjectsIcons from "./ProjectsIcons";

gsap.registerPlugin(Draggable, ScrollTrigger);

const Projects = () => {
  const titleRef = useRef(null);
  const sectionRef = useRef(null);
  const wrapperRef = useRef(null);
  const carouselRef = useRef(null);
  const cardsRef = useRef([]);
  const draggableRef = useRef(null);

  // Données des projets chargées depuis l'API pour le carousel
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Données des projets chargées depuis l'API pour les détails dans la modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProject, setModalProject] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Etat de la modale dans les listeners GSAP
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // API interne pour contrôler depuis les flèches
  const apiRef = useRef({
    goToRelative: () => {},
  });

  // Suivre la largeur de la fenêtre
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

  // Charger les projets depuis l'API au montage
  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setLoading(true);
        const data = await fetchProjectsSummary();
        if (!isMounted) return;
        setProjects(data);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Erreur lors du chargement des projets :", err);
        setError(err.message || "Impossible de charger les projets.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const title = titleRef.current;
      if (!section || !title) return;

      // Parallax sur le titre
      gsap.fromTo(
        title,
        { y: 100 }, // décalage initial vers le bas
        {
          y: -100, // décalage vers le haut à la fin
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    // Ne rien faire tant que les projets ne sont pas chargés
    if (!projects.length) return;

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
      // Interaction sur le bouton "Voir le détail"
      let pressedOnCTA = false;
      let indexOnPressCTA = 0;

      const updateScale = () => {
        const bounds = wrapper.getBoundingClientRect();
        const center = bounds.left + bounds.width / 2;

        const dragFactor = isDragging ? 0.97 : 1;

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
        // Mouvement minimale pour le drag
        const threshold = 18;

        if (Math.abs(delta) > threshold) {
          const direction = delta < 0 ? 1 : -1;
          const current = getClosestIndex();
          snapToIndex(current + direction);
        } else {
          // Si le mouvement est trop petit la carte ne bouge pas
          snapToClosest();
        }
      };

      // Draggable avec bounds à jour
      draggableRef.current = Draggable.create(carousel, {
        type: "x",
        inertia: true,
        dragClickables: true,
        bounds: {
          minX: targetPositions[targetPositions.length - 1],
          maxX: targetPositions[0],
        },

        onPress: function (event) {
          // Si l'interaction commence sur le bouton "Voir le détail"
          if (event.target.closest(".project-card__cta")) {
            pressedOnCTA = true;
            isDragging = false;
            // Mémorise la carte active au moment du press
            indexOnPressCTA = getClosestIndex();
            dragStartX = this.x;
            return;
          }

          // Drag normal
          pressedOnCTA = false;
          isDragging = true;
          dragStartX = this.x;
          updateScale();
        },

        onDrag: function () {
          updateScale();
        },

        onThrowUpdate: function () {
          updateScale();
        },

        onRelease: function () {
          if (pressedOnCTA) {
            // Interaction démarrée sur le CTA la card ne bouge pas
            pressedOnCTA = false;
            snapToIndex(indexOnPressCTA);
            return;
          }

          finishDrag(this.x);
        },

        onDragEnd: function () {
          if (pressedOnCTA) {
            pressedOnCTA = false;
            snapToIndex(indexOnPressCTA);
            return;
          }

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
      apiRef.current.goToIndex = (index) => {
        snapToIndex(index);
      };

      const onKeyDown = (e) => {
        // Pas de navigation si la modale est ouverte
        if (isModalOpenRef.current) return;

        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

        const section = sectionRef.current;
        if (!section) return;

        // Vérifie si la section est dans le viewport
        const rect = section.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;

        // Vérifie si le focus est dans la section
        const activeElement = document.activeElement;
        const hasFocusInside = activeElement && section.contains(activeElement);

        if (!inView || !hasFocusInside) {
          return;
        }

        e.preventDefault();

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
  }, [viewportWidth, projects.length]); // recalcul à chaque changement de largeur

  // Handler de navigation au clavier du carousel
  const handlePrev = () => {
    apiRef.current.goToRelative(-1);
  };
  const handleNext = () => {
    apiRef.current.goToRelative(1);
  };

  // Handler d'ouverture de la modale de projet
  const handleOpenModal = async (slug) => {
    if (!slug) return;

    setIsModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalProject(null);

    try {
      const project = await fetchProjectDetail(slug);
      setModalProject(project);
    } catch (err) {
      console.error("Erreur lors du chargement du projet :", err);
      setModalError(err.message || "Impossible de charger ce projet.");
    } finally {
      setModalLoading(false);
    }
  };

  // Handler de fermeture de la modale de projet
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalProject(null);
    setModalError(null);
  };

  return (
    <section className="projects" ref={sectionRef} id="projects">
      <h2 className="projects__title" ref={titleRef}>
        PROJECTS
      </h2>

      <p className="projects__subtitle">
        JE CONÇOIS DES INTERFACES MODERNES ET ÉLÉGANTES EN ALLIANT ESTHÉTIQUE,
        PERFORMANCE ET PRÉCISION.
      </p>

      <div className="projects__carousel-wrapper" ref={wrapperRef}>
        {loading && (
          <div className="projects__status projects__status--loading">
            Chargement des projets...
          </div>
        )}

        {error && !loading && (
          <div className="projects__status projects__status--error"></div>
        )}

        {!loading && !error && projects.length > 0 && (
          <>
            <div className="projects__carousel" ref={carouselRef}>
              {projects.map((project, index) => (
                <article
                  key={project.id}
                  className="project-card"
                  ref={(el) => (cardsRef.current[index] = el)}
                  onFocus={() => {
                    // Ne pas bouger le carousel si la modale est ouverte
                    if (isModalOpenRef.current) return;
                    if (
                      apiRef.current &&
                      typeof apiRef.current.goToIndex === "function"
                    ) {
                      apiRef.current.goToIndex(index);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) {
                      e.preventDefault();
                      handleOpenModal(project.slug);
                    }
                  }}
                  tabIndex={0}
                  // role="button"
                  aria-label={`Voir les détails du projet ${project.title}`}
                >
                  <div className="project-card__head">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <div className="project-card__content">
                    {project.thumbnail && (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="project-card__image"
                      />
                    )}
                  </div>

                  <div className="project-card__hover">
                    <h3 className="project-card__title">
                      {project.shortDescription}
                    </h3>
                    <button
                      type="button"
                      className="project-card__cta"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(project.slug);
                      }}
                    >
                      Voir le détail
                    </button>
                  </div>
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
          </>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="projects__status projects__status--empty"></div>
        )}
      </div>

      <ProjectsIcons />

      <ProjectModal
        isOpen={isModalOpen}
        onRequestClose={handleCloseModal}
        project={modalProject}
        loading={modalLoading}
        error={modalError}
      />
    </section>
  );
};

export default Projects;
