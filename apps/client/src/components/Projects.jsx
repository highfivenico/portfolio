// src/components/Projects.jsx
import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { fetchProjectsSummary, fetchProjectDetail } from "../api/projectsApi";
import ProjectModal from "./ProjectModal";
import ProjectsIcons from "./ProjectsIcons";

gsap.registerPlugin(Draggable);

const Projects = () => {
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
        dragClickables: true,
        bounds: {
          minX: targetPositions[targetPositions.length - 1],
          maxX: targetPositions[0],
        },

        onPress: function (event) {
          if (event.target.closest(".project-card__cta")) {
            return;
          }
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
    <section className="projects" ref={sectionRef}>
      <h2 className="projects__title">PROJECTS</h2>

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
