import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------
   Button Hover Animation
---------------------------------------------------------*/
class Button {
  constructor(buttonElement) {
    this.block = buttonElement;
    this.init();
    this.initEvents();
  }

  init() {
    const el = gsap.utils.selector(this.block);

    this.DOM = {
      button: this.block,
      flair: el(".button__flair"),
    };

    // quickSetter = MAINTIENT de hautes performances pour
    // les mises à jour x/y en continu pendant mousemove
    this.xSet = gsap.quickSetter(this.DOM.flair, "xPercent");
    this.ySet = gsap.quickSetter(this.DOM.flair, "yPercent");
  }

  // Convertit la position du curseur en pourcentage relatif
  getXY(e) {
    const { left, top, width, height } =
      this.DOM.button.getBoundingClientRect();

    const xTransformer = gsap.utils.pipe(
      gsap.utils.mapRange(0, width, 0, 100),
      gsap.utils.clamp(0, 100)
    );

    const yTransformer = gsap.utils.pipe(
      gsap.utils.mapRange(0, height, 0, 100),
      gsap.utils.clamp(0, 100)
    );

    return {
      x: xTransformer(e.clientX - left),
      y: yTransformer(e.clientY - top),
    };
  }

  initEvents() {
    // Effet à l'entrée
    this.DOM.button.addEventListener("mouseenter", (e) => {
      const { x, y } = this.getXY(e);
      this.xSet(x);
      this.ySet(y);

      gsap.to(this.DOM.flair, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    });

    // Effet à la sortie
    this.DOM.button.addEventListener("mouseleave", (e) => {
      const { x, y } = this.getXY(e);

      gsap.killTweensOf(this.DOM.flair);

      // Petit "shoot" vers l'extérieur selon la position
      gsap.to(this.DOM.flair, {
        xPercent: x > 90 ? x + 20 : x < 10 ? x - 20 : x,
        yPercent: y > 90 ? y + 20 : y < 10 ? y - 20 : y,
        scale: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    // Effet en cours de survol
    this.DOM.button.addEventListener("mousemove", (e) => {
      const { x, y } = this.getXY(e);

      gsap.to(this.DOM.flair, {
        xPercent: x,
        yPercent: y,
        duration: 0.4,
        ease: "power2",
      });
    });
  }
}

/* -------------------------------------------------------
   Hero Section
---------------------------------------------------------*/
const Hero = () => {
  const heroRef = useRef(null);

  // Conteneurs des mots (translation X)
  const wordPrimaryRef = useRef(null);
  const wordSecondaryRef = useRef(null);

  // Spans internes (déformations GSAP)
  const wordPrimaryInnerRef = useRef(null);
  const wordSecondaryInnerRef = useRef(null);

  // Bloc de contenu (texte + bouton)
  const contentRef = useRef(null);

  // Paramètres réutilisables pour tout l’effet
  const CONFIG = {
    MIN_VELOCITY: 500, // vitesse minimale pour déclencher la déformation
    MAX_VELOCITY: 1500, // vitesse à laquelle la déformation atteint son max
    SCALE_X_RANGE: 0.15, // amplitude stretch horizontal
    SCALE_Y_RANGE: 0.08, // amplitude squash vertical
    SKEW_ANGLE: 18, // angle max de skew
    LETTER_SPACING_DELTA_MAX: 0.2, // tracking dynamique max
    RESET_DELAY: 0.05, // délai avant le retour à l’état normal
    RESET_DURATION: 0.1, // durée du retour principal
    INERTIA_STRENGTH: 0.2, // réduit la force du retour (0.4–0.7 = doux)
    MIN_INERTIA_INTENSITY: 0.2, // pas d’overshoot en dessous de ce seuil
  };

  /* -------------------------------------------------------
     Main GSAP scroll effect
  ---------------------------------------------------------*/
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const innerTargets = [
        wordPrimaryInnerRef.current,
        wordSecondaryInnerRef.current,
      ];

      let resetCall = null;
      let lastIntensity = 0;
      let lastDirection = 1;
      let isAnimatingInertia = false;
      let hadDeformation = false;

      // Applique immédiatement la déformation selon la vitesse
      const applyDeformation = (intensity, direction) => {
        const scaleX = 1 + intensity * CONFIG.SCALE_X_RANGE;
        const scaleY = 1 - intensity * CONFIG.SCALE_Y_RANGE;
        const skewX = direction * -CONFIG.SKEW_ANGLE * intensity;
        const letterSpacingDelta = CONFIG.LETTER_SPACING_DELTA_MAX * intensity;

        gsap.set(innerTargets, {
          scaleX,
          scaleY,
          skewX,
          "--hero-letter-spacing-delta": `${letterSpacingDelta}em`,
          transformOrigin: "center center",
          overwrite: "auto",
        });
      };

      /* -------------------------------------------------------
         Retour progressif à l'état normal (inertie)
      ---------------------------------------------------------*/
      const scheduleReset = () => {
        if (resetCall) resetCall.kill();

        // Si pas/peu de déformation, on revient juste au neutre sans overshoot
        if (!hadDeformation || lastIntensity < CONFIG.MIN_INERTIA_INTENSITY) {
          resetCall = gsap.delayedCall(CONFIG.RESET_DELAY, () => {
            gsap.killTweensOf(innerTargets);
            gsap.set(innerTargets, {
              scaleX: 1,
              scaleY: 1,
              skewX: 0,
              "--hero-letter-spacing-delta": "0em",
            });
            hadDeformation = false;
            lastIntensity = 0;
          });
          return;
        }

        // Il y a eu une vraie déformation → inertie douce
        const inertiaIntensity = lastIntensity * CONFIG.INERTIA_STRENGTH;

        resetCall = gsap.delayedCall(CONFIG.RESET_DELAY, () => {
          isAnimatingInertia = true;

          const tl = gsap.timeline({
            onComplete: () => {
              isAnimatingInertia = false;
              hadDeformation = false;
              lastIntensity = 0;
            },
          });

          // Overshoot (beaucoup plus léger qu’avant)
          tl.to(
            innerTargets,
            {
              scaleX: 1 - inertiaIntensity * CONFIG.SCALE_X_RANGE * 0.4,
              scaleY: 1 + inertiaIntensity * CONFIG.SCALE_Y_RANGE * 0.4,
              skewX:
                -lastDirection * CONFIG.SKEW_ANGLE * inertiaIntensity * 0.5,
              "--hero-letter-spacing-delta": `${
                -CONFIG.LETTER_SPACING_DELTA_MAX * inertiaIntensity * 0.4
              }em`,
              duration: CONFIG.RESET_DURATION,
              ease: "power2.inOut",
              overwrite: "auto",
            },
            0
          );

          // Retour final
          tl.to(
            innerTargets,
            {
              scaleX: 1,
              scaleY: 1,
              skewX: 0,
              "--hero-letter-spacing-delta": "0em",
              duration: 0.18,
              ease: "power2.out",
              overwrite: "auto",
            },
            CONFIG.RESET_DURATION
          );
        });
      };

      // Reset instantané utilisé en cas de sortie de trigger
      const immediateReset = () => {
        if (resetCall) resetCall.kill();

        if (!isAnimatingInertia) {
          lastIntensity = 0;
          gsap.killTweensOf(innerTargets);
          gsap.set(innerTargets, {
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            "--hero-letter-spacing-delta": "0em",
          });
        }
      };

      /* -------------------------------------------------------
         ScrollTrigger principal
      ---------------------------------------------------------*/
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom+=80% top",
          scrub: true,
          pin: true,

          // Appelé à chaque frame pendant le scroll
          onUpdate: (self) => {
            const velocity = self.getVelocity();
            const speed = Math.abs(velocity);

            // Trop lent → pas de déformation, pas d’inertie "forte"
            if (speed < CONFIG.MIN_VELOCITY) {
              gsap.set(innerTargets, {
                scaleX: 1,
                scaleY: 1,
                skewX: 0,
                "--hero-letter-spacing-delta": "0em",
              });

              // Si aucune vraie déformation n'a eu lieu pendant ce scroll,
              // on s'assure qu'il n'y aura pas d’overshoot ensuite
              if (!hadDeformation) {
                lastIntensity = 0;
              }

              // IMPORTANT : on ne rappelle pas scheduleReset ici,
              // il a déjà été programmé pendant la vraie déformation.
              return;
            }

            // Ici, on est au-dessus du seuil → on déforme
            const intensity = gsap.utils.clamp(
              0,
              1,
              speed / CONFIG.MAX_VELOCITY
            );
            const direction = Math.sign(velocity) || 1;

            lastIntensity = intensity;
            lastDirection = direction;
            hadDeformation = true;

            applyDeformation(intensity, direction);

            // L’inertie ne se programme QUE quand on a réellement déformé
            scheduleReset();
          },

          onLeave: immediateReset,
          onLeaveBack: immediateReset,
          onKill: immediateReset,
          onRefresh: immediateReset,
        },
      });

      // Mot du haut → vers la gauche
      tl.to(
        wordPrimaryRef.current,
        {
          xPercent: -100,
          ease: "none",
          duration: 1,
        },
        0
      );

      // Mot du bas → vers la droite
      tl.to(
        wordSecondaryRef.current,
        {
          xPercent: 100,
          ease: "none",
          duration: 1,
        },
        0
      );

      // Disparition progressive des mots
      tl.to(
        [wordPrimaryRef.current, wordSecondaryRef.current],
        {
          autoAlpha: 0,
          ease: "power2.out",
          duration: 0.3,
        },
        0.7
      );

      // Apparition du contenu central
      tl.fromTo(
        contentRef.current,
        {
          autoAlpha: 0,
          y: 40,
        },
        {
          autoAlpha: 1,
          y: 0,
          ease: "power2.out",
          duration: 0.6,
        },
        0.83
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  /* -------------------------------------------------------
     Init du flair hover button
     ------------------------------------------------------- */
  useLayoutEffect(() => {
    const buttonElement = document.querySelector('[data-block="button"]');
    if (buttonElement) {
      new Button(buttonElement);
    }
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      {/* Mot du haut */}
      <div className="hero__row hero__row--primary">
        <h1 className="hero__word hero__word--primary" ref={wordPrimaryRef}>
          <span className="hero__word-inner" ref={wordPrimaryInnerRef}>
            <span className="hero__word-highlight">DEV</span>ELOPER
          </span>
        </h1>
      </div>

      {/* Mot du bas */}
      <div className="hero__row hero__row--secondary">
        <h2 className="hero__word hero__word--secondary" ref={wordSecondaryRef}>
          <span className="hero__word-inner" ref={wordSecondaryInnerRef}>
            <span className="hero__word-highlight">DEV</span>ELOPER
          </span>
        </h2>
      </div>

      {/* Texte + bouton */}
      <div className="hero__content" ref={contentRef}>
        <p className="hero__intro">
          Bonjour, je suis Nicolas — développeur passionné par le design,
          l'expérience utilisateur et la technique.
        </p>

        <a
          href="mailto:highfivenico@gmail.com"
          className="button button--stroke"
          data-block="button"
        >
          <span className="button__label">ME CONTACTER</span>
          <div className="button__flair"></div>
        </a>
      </div>
    </section>
  );
};

export default Hero;
