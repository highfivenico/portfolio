import { useEffect, useRef, useState } from "react";

const select = (selector) => document.querySelector(selector);

//  Récupère la hauteur de la navbar depuis la variable CSS
//  Fallback sur la hauteur réelle si la variable n'est pas définie
const getNavHeightFromCSS = () => {
  const nav = select(".site-nav");
  if (!nav) return 0;

  const styles = window.getComputedStyle(nav);
  const varValue = styles.getPropertyValue("--nav-height");

  const fromVar = parseFloat(varValue);
  if (!Number.isNaN(fromVar) && fromVar > 0) return fromVar;

  const fromHeight = parseFloat(styles.height);
  return Number.isNaN(fromHeight) ? 0 : fromHeight;
};

// Calcule les bornes absolues (top / bottom)
const getElementBounds = (element) => {
  if (!element) return { top: 0, bottom: 0 };

  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const top = rect.top + scrollY;
  const bottom = top + rect.height;

  return { top, bottom };
};

const NavBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollY = useRef(0);
  const navHeightRef = useRef(0);
  const heroBoundsRef = useRef({ top: 0, bottom: 0 });

  // Email anti-spam
  const EMAIL_USER = "highfivenico";
  const EMAIL_DOMAIN = "gmail.com";

  const handleMailClick = (event) => {
    event.preventDefault();
    window.location.href = `mailto:${EMAIL_USER}@${EMAIL_DOMAIN}`;
  };

  useEffect(() => {
    const hero = select(".hero");
    const heroContent = select(".hero__content");

    const updateLayoutMetrics = () => {
      navHeightRef.current = getNavHeightFromCSS();
      heroBoundsRef.current = getElementBounds(hero);
    };

    const handleScroll = () => {
      const currentY = window.scrollY || window.pageYOffset;
      const isScrollingUp = currentY < lastScrollY.current;
      lastScrollY.current = currentY;

      const navHeight = navHeightRef.current;
      const { top: heroTop, bottom: heroBottom } = heroBoundsRef.current;

      // Tout en haut : nav cachée
      if (currentY < navHeight) {
        setIsVisible(false);
        return;
      }

      const withinHero =
        heroTop < heroBottom && currentY >= heroTop && currentY < heroBottom;

      // Détection de heroContent
      let heroContentVisible = true;
      if (heroContent) {
        const styles = window.getComputedStyle(heroContent);
        const opacity = parseFloat(styles.opacity || "1");
        const visibility = styles.visibility || "visible";

        heroContentVisible = opacity > 0.01 && visibility !== "hidden";
      }

      // Navbar cachée au début du site
      if (withinHero && !heroContentVisible) {
        setIsVisible(false);
        return;
      }

      // Navbar visible uniquement au scroll vers le haut
      setIsVisible(isScrollingUp);
    };

    const handleResize = () => {
      updateLayoutMetrics();
      handleScroll();
    };

    // Initialisation
    updateLayoutMetrics();
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleNavClick = (event, target) => {
    event.preventDefault();

    let targetElement = null;

    if (target === "home") {
      targetElement = select(".hero__content") || select("#home");
    } else {
      targetElement = select(target);
    }

    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const navHeight = navHeightRef.current;
    const offset = rect.top + window.scrollY - navHeight;

    window.scrollTo({
      top: offset,
      behavior: "smooth",
    });
  };

  return (
    <header className={`site-nav${isVisible ? " site-nav--visible" : ""}`}>
      <nav className="site-nav__inner">
        <div className="site-nav__links">
          <button
            className="site-nav__link"
            type="button"
            onClick={(e) => handleNavClick(e, "home")}
          >
            home
          </button>
          <button
            className="site-nav__link"
            type="button"
            onClick={(e) => handleNavClick(e, "#projects")}
          >
            projets
          </button>
          <button
            className="site-nav__link"
            type="button"
            onClick={(e) => handleNavClick(e, "#presentation")}
          >
            présentation
          </button>
          <button
            className="site-nav__link"
            type="button"
            onClick={(e) => handleNavClick(e, "#about")}
          >
            about
          </button>
        </div>

        <div className="site-nav__icons">
          <a
            href="#contact"
            className="site-nav__icon"
            aria-label="Envoyer un email"
            onClick={handleMailClick}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 
                   0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 3.2V18h16V7.2l-8 
                   5-8-5z"
                fill="currentColor"
              />
            </svg>
          </a>
          <a
            href="https://github.com/highfivenico"
            className="site-nav__icon"
            aria-label="GitHub"
            target="_blank"
            rel="noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 
                   9.7.5.1.68-.22.68-.49 0-.24-.01-1.06-.02-1.93-2.78.62-3.37-1.23-3.37-1.23-.46-1.2-1.12-1.52-1.12-1.52-.92-.64.07-.63.07-.63 1.02.07 1.56 1.07 1.56 1.07.9 1.57 2.37 1.12 2.95.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.18 9.18 0 0 1 12 6.18c.85 0 1.72.12 2.53.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.89 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"
                fill="currentColor"
              />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/highfivenico"
            className="site-nav__icon"
            aria-label="LinkedIn"
            target="_blank"
            rel="noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4.98 3.5C4.98 4.6 4.1 5.5 3 5.5S1.02 4.6 1.02 3.5 
                   1.9 1.5 3 1.5s1.98.9 1.98 2zm.02 3.75H1V21h4V7.25zM8 7.25h3.83v1.87h.05c.53-.96 
                   1.83-1.97 3.77-1.97C19.41 7.15 21 9 21 12.37V21h-4v-7.36c0-1.76-.63-2.96-2.21-2.96-1.21 0-1.93.82-2.25 1.61-.12.29-.15.7-.15 1.11V21H8V7.25z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
