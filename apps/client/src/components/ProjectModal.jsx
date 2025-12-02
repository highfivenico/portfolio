import Modal from "react-modal";
import { useEffect, useRef } from "react";

// Id de l'élément racine (index.html) pour l'accessibilité de react-modal
Modal.setAppElement("#root");

const ProjectModal = ({ isOpen, onRequestClose, project, loading, error }) => {
  // Référence vers le conteneur scrollable de la modale
  const contentRef = useRef(null);

  // Scroll en haut à chaque changement de projet et initialise le focus
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = 0;
      contentRef.current.focus();
    }
  }, [isOpen, project]);

  // Permet d'avoir toujours un tableau de sections
  let sections = [];
  if (project && Array.isArray(project.sections)) {
    sections = project.sections;
  }

  // Préparation des sections
  const techSection = sections.find((s) => s.type === "tech");
  const introSection = sections.find((s) => s.type === "intro");
  const objectivesSection = sections.find((s) => s.type === "objectives");
  const skillsSection = sections.find((s) => s.type === "skills");
  const resultsSection = sections.find((s) => s.type === "results");
  const improvementsSection = sections.find((s) => s.type === "improvements");
  const gallerySection = sections.find((s) => s.type === "gallery");

  // Construction de la liste d'images pour la galerie :
  const galleryImages = [];
  if (project && project.thumbnail) {
    galleryImages.push({
      src: project.thumbnail,
      alt: project.title + " — aperçu principal",
    });
  }

  // Ajout des images de la section galerie
  if (gallerySection && Array.isArray(gallerySection.images)) {
    gallerySection.images.forEach((image) => {
      let src = "";
      let alt = "";

      if (typeof image === "string") {
        src = image;
        alt = project.title + " — visuel " + (galleryImages.length + 1);
      } else if (image && typeof image === "object") {
        src = image.src;
        alt =
          image.alt ||
          project.title + " — visuel " + (galleryImages.length + 1);
      }
      galleryImages.push({ src, alt });
    });
  }

  // Rendu de la modale
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Détails du projet"
      className="project-modal"
      overlayClassName="project-modal__overlay"
      closeTimeoutMS={280}
    >
      {/* Bouton de fermeture de la modale */}
      <button
        type="button"
        className="project-modal__close"
        onClick={onRequestClose}
        aria-label="Fermer la fenêtre de détails du projet"
      >
        ✕
      </button>

      {/* États de chargement / erreur */}
      {loading && (
        <div className="project-modal__status project-modal__status--loading">
          Chargement du projet...
        </div>
      )}

      {error && !loading && (
        <div className="project-modal__status project-modal__status--error">
          {error}
        </div>
      )}

      {!loading && !error && project && (
        <div className="project-modal__content" ref={contentRef} tabIndex={0}>
          <div className="project-modal__inner">
            {/*  En-tête :  titre + sous-titre */}
            <header className="project-modal__header project-modal__header--centered">
              <h3 className="project-modal__title">{project.title}</h3>

              {project.subtitle && (
                <p className="project-modal__subtitle">{project.subtitle}</p>
              )}
            </header>

            {/* Galerie aperçu visuel */}
            {galleryImages.length > 0 && (
              <section className="project-modal__section project-modal__section--gallery">
                <div className="project-modal__gallery">
                  {galleryImages.map((image, index) => (
                    <figure key={index} className="project-modal__gallery-item">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="project-modal__gallery-image"
                      />
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* Stack technique avec icônes */}
            {techSection &&
              Array.isArray(techSection.technologies) &&
              techSection.technologies.length > 0 && (
                <section className="project-modal__section">
                  <h4 className="project-modal__section-title">
                    {techSection.title || "Stack technique"}
                  </h4>
                  <div className="project-modal__tech-grid">
                    {techSection.technologies.map((tech) => (
                      <div
                        key={tech.label}
                        className="project-modal__tech-item"
                      >
                        {tech.icon && (
                          <img
                            src={tech.icon}
                            alt={tech.label}
                            className="project-modal__tech-icon"
                            onError={(e) => e.currentTarget.remove()}
                          />
                        )}
                        <span>{tech.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Présentation */}
            {introSection && introSection.content && (
              <section className="project-modal__section">
                <h4 className="project-modal__section-title">
                  {introSection.title}
                </h4>
                <p className="project-modal__text">{introSection.content}</p>
              </section>
            )}

            {/* Objectifs */}
            {objectivesSection &&
              Array.isArray(objectivesSection.items) &&
              objectivesSection.items.length > 0 && (
                <section className="project-modal__section">
                  <h4 className="project-modal__section-title">
                    {objectivesSection.title}
                  </h4>
                  <ul className="project-modal__list">
                    {objectivesSection.items.map((item, index) => (
                      <li key={index} className="project-modal__list-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            {/* Compétences développées */}
            {skillsSection &&
              Array.isArray(skillsSection.items) &&
              skillsSection.items.length > 0 && (
                <section className="project-modal__section">
                  <h4 className="project-modal__section-title">
                    {skillsSection.title}
                  </h4>
                  <ul className="project-modal__list">
                    {skillsSection.items.map((item, index) => (
                      <li key={index} className="project-modal__list-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            {/* Résultats & impact */}
            {resultsSection &&
              Array.isArray(resultsSection.items) &&
              resultsSection.items.length > 0 && (
                <section className="project-modal__section">
                  <h4 className="project-modal__section-title">
                    {resultsSection.title}
                  </h4>
                  <ul className="project-modal__list">
                    {resultsSection.items.map((item, index) => (
                      <li key={index} className="project-modal__list-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            {/* Perspectives d’amélioration */}
            {improvementsSection &&
              Array.isArray(improvementsSection.items) &&
              improvementsSection.items.length > 0 && (
                <section className="project-modal__section">
                  <h4 className="project-modal__section-title">
                    {improvementsSection.title}
                  </h4>
                  <ul className="project-modal__list">
                    {improvementsSection.items.map((item, index) => (
                      <li key={index} className="project-modal__list-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            {/* Liens (live / GitHub / vidéo) */}
            {project.links && (
              <div className="project-modal__links">
                {project.links.live && (
                  <a
                    href={project.links.live}
                    target="_blank"
                    rel="noreferrer"
                    className="project-modal__link"
                  >
                    Voir le site en ligne
                  </a>
                )}
                {project.links.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="project-modal__link"
                  >
                    Voir le code sur GitHub
                  </a>
                )}
                {project.links.video && (
                  <a
                    href={project.links.video}
                    target="_blank"
                    rel="noreferrer"
                    className="project-modal__link"
                  >
                    Voir la démo vidéo
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ProjectModal;
