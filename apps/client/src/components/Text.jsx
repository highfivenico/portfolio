import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";

gsap.registerPlugin(ScrollTrigger, SplitText, Physics2DPlugin);

const Text = () => {
  const sectionRef = useRef(null);
  const splitsRef = useRef([]);
  const ctxRef = useRef(null);

  const charsRef = useRef([]);
  const hoverEnabledRef = useRef(false); // animation de texte terminée
  const hoverActiveRef = useRef(false); // section vraiment "interactive" (visible)
  const clickedRef = useRef(false);
  const resetAllRef = useRef(false);
  const positionsRafRef = useRef(null); // throttle pour le recalcul des positions

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const content = section.querySelector(".text__content");
    if (!content) return;

    let cancelled = false;

    const isFinePointer =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: fine)").matches;

    const pullDistance = 50;

    const updateCharPositions = () => {
      const chars = charsRef.current;
      if (!chars || !chars.length) return;

      chars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        char._center = {
          x: (rect.left + rect.right) / 2,
          y: (rect.top + rect.bottom) / 2,
        };
      });
    };

    const requestUpdateCharPositions = () => {
      if (positionsRafRef.current != null) return;
      positionsRafRef.current = requestAnimationFrame(() => {
        positionsRafRef.current = null;
        updateCharPositions();
      });
    };

    const resetPulledChars = () => {
      const chars = charsRef.current;
      if (!chars || !chars.length) return;

      chars.forEach((char) => {
        if (!char._pulled) return;
        char._pulled = false;
        gsap.to(char, {
          duration: 0.6,
          x: 0,
          y: 0,
          ease: "elastic.out(1, 0.35)",
        });
      });
    };

    const handlePointerMove = (e) => {
      if (!hoverEnabledRef.current) return; // texte pas encore apparu
      if (!hoverActiveRef.current) return; // section pas vraiment visible
      if (!isFinePointer) return;
      if (clickedRef.current) return;

      const chars = charsRef.current;
      if (!chars || !chars.length) return;

      const pointerX = e.clientX;
      const pointerY = e.clientY;

      chars.forEach((char) => {
        const center = char._center;
        if (!center) return;

        const diffX = pointerX - center.x;
        const diffY = pointerY - center.y;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);

        if (distance < pullDistance) {
          const percent = distance / pullDistance;
          char._pulled = true;

          gsap.to(char, {
            duration: 0.2,
            x: diffX * percent,
            y: diffY * percent,
          });
        } else {
          if (!char._pulled) return;
          char._pulled = false;

          gsap.to(char, {
            duration: 0.9,
            x: 0,
            y: 0,
            ease: "elastic.out(1, 0.3)",
          });
        }
      });

      if (resetAllRef.current) {
        resetAllRef.current = false;
        gsap.to(chars, {
          duration: 1,
          x: 0,
          y: 0,
          rotation: 0,
          ease: "elastic.out(1, 0.3)",
        });
      }
    };

    const handlePointerLeave = () => {
      if (!hoverEnabledRef.current) return;
      resetPulledChars();
    };

    // Explose tout à partir de la lettre la plus proche du clic
    const explodeFromIndex = (index) => {
      const chars = charsRef.current;
      if (!chars || !chars.length) return;
      if (clickedRef.current) return;

      clickedRef.current = true;

      gsap.killTweensOf(chars);

      const tween = gsap.to(chars, {
        duration: 1.6,
        physics2D: {
          velocity: "random(400, 1000)",
          angle: "random(250, 290)",
          gravity: 2000,
        },
        stagger: {
          from: index,
          amount: 0.3,
        },
        onComplete() {
          tween.timeScale(-1.3);
        },
        onReverseComplete: () => {
          clickedRef.current = false;
          resetAllRef.current = true;
          resetPulledChars();
        },
      });
    };

    const handlePointerUp = (e) => {
      if (!hoverEnabledRef.current) return;
      if (!hoverActiveRef.current) return;
      if (!isFinePointer) return;
      if (clickedRef.current) return;

      const chars = charsRef.current;
      if (!chars || !chars.length) return;

      const clickX = e.clientX;
      const clickY = e.clientY;

      let minDist = Infinity;
      let closestIndex = 0;

      chars.forEach((char, index) => {
        const center = char._center;
        if (!center) return;

        const dx = clickX - center.x;
        const dy = clickY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          closestIndex = index;
        }
      });

      explodeFromIndex(closestIndex);
    };

    const init = () => {
      if (cancelled) return;

      splitsRef.current.forEach((s) => s.revert && s.revert());
      splitsRef.current = [];
      charsRef.current = [];
      hoverEnabledRef.current = false;
      hoverActiveRef.current = false;

      const targets = Array.from(
        content.querySelectorAll(".text__paragraph-inner")
      );
      if (!targets.length) return;

      const splits = targets.map(
        (el) =>
          new SplitText(el, {
            type: "words,chars",
            wordsClass: "word",
            charsClass: "char",
          })
      );
      splitsRef.current = splits;

      const paragraphsChars = splits.map((s) => s.chars || []);
      const allChars = paragraphsChars.flat();
      if (!allChars.length) return;

      charsRef.current = allChars;

      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }

      const ctx = gsap.context(() => {
        gsap.set(allChars, {
          autoAlpha: 0,
          x: 0,
          y: 0,
          rotation: 0,
          transformOrigin: "50% 50%",
        });

        const charStagger = 0.015;
        const charDuration = 0.01;
        const paragraphPause = 0.35;

        const tl = gsap.timeline({
          paused: true,
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
            toggleActions: "play none none none",
            once: true,
            onEnter: () => {
              requestUpdateCharPositions();
              tl.play(0);
            },
          },
          onComplete: () => {
            hoverEnabledRef.current = true;
            requestUpdateCharPositions();
          },
        });

        paragraphsChars.forEach((chars, index) => {
          if (!chars.length) return;

          tl.to(
            chars,
            {
              autoAlpha: 1,
              duration: charDuration,
              ease: "none",
              stagger: charStagger,
            },
            index === 0 ? 0 : `>+=${paragraphPause}`
          );
        });

        // ScrollTrigger dédié à l'interactivité (magnet + explosion)
        ScrollTrigger.create({
          trigger: section,
          start: "top 80%",
          end: "bottom 20%",
          onEnter: () => {
            hoverActiveRef.current = true;
            requestUpdateCharPositions();
          },
          onEnterBack: () => {
            hoverActiveRef.current = true;
            requestUpdateCharPositions();
          },
          onLeave: () => {
            hoverActiveRef.current = false;
            resetPulledChars();
          },
          onLeaveBack: () => {
            hoverActiveRef.current = false;
            resetPulledChars();
          },
          onUpdate: () => {
            if (hoverEnabledRef.current && hoverActiveRef.current) {
              requestUpdateCharPositions();
            }
          },
        });
      }, sectionRef);

      ctxRef.current = ctx;

      requestUpdateCharPositions();
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(init).catch(init);
    } else {
      init();
    }

    // Resize → on recalcule les positions (throttlé)
    const handleResize = () => {
      requestUpdateCharPositions();
    };

    window.addEventListener("resize", handleResize);
    section.addEventListener("pointermove", handlePointerMove);
    section.addEventListener("pointerleave", handlePointerLeave);
    section.addEventListener("pointerup", handlePointerUp);

    return () => {
      cancelled = true;

      window.removeEventListener("resize", handleResize);
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", handlePointerLeave);
      section.removeEventListener("pointerup", handlePointerUp);

      if (positionsRafRef.current != null) {
        cancelAnimationFrame(positionsRafRef.current);
        positionsRafRef.current = null;
      }

      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }

      splitsRef.current.forEach((s) => s.revert && s.revert());
      splitsRef.current = [];
      charsRef.current = [];
      hoverEnabledRef.current = false;
      hoverActiveRef.current = false;
      clickedRef.current = false;
      resetAllRef.current = false;
    };
  }, []);

  return (
    <section className="text" ref={sectionRef} id="about">
      <div className="text__inner">
        <div className="text__content">
          <p>
            <span className="text__paragraph-inner">
              Le travail mené sur des projets variés associant design exigeant
              et enjeux techniques avancés m&apos;a permis d’affiner mes
              capacités à concevoir des interfaces performantes, robustes et
              soigneusement maîtrisées.
            </span>
          </p>
          <p>
            <span className="text__paragraph-inner">
              Grâce à une maîtrise de JavaScript, React et Node.js, et à une
              attention particulière portée à la qualité du code et à
              l’architecture front-end, je développe des expériences web
              fluides, modernes et techniquement solides.
            </span>
          </p>
          <p>
            <span className="text__paragraph-inner">
              J’aime mettre cette expertise au service de projets où la
              performance et la qualité de l’expérience utilisateur sont au cœur
              des priorités.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Text;
