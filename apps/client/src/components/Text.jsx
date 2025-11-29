import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const Text = () => {
  const sectionRef = useRef(null);
  const splitRef = useRef(null);
  const ctxRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const content = section.querySelector(".text__content");
    if (!content) return;

    let cancelled = false;

    const initSplitAndAnimation = () => {
      if (cancelled) return;

      // Nettoyage éventuel d’un ancien split
      if (splitRef.current) {
        splitRef.current.revert();
        splitRef.current = null;
      }

      const split = new SplitText(content, {
        type: "chars",
      });

      splitRef.current = split;

      const chars = split.chars || [];
      if (!chars.length) return;

      // Nettoyage éventuel d’un ancien contexte GSAP
      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }

      const ctx = gsap.context(() => {
        gsap.set(chars, {
          x: 60,
          scale: 1.2,
          opacity: 0,
          transformOrigin: "50% 50%",
        });

        gsap.to(chars, {
          x: 0,
          scale: 1,
          opacity: 1,
          duration: 0.15,
          ease: "power3.out",
          stagger: 0.01,
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
            toggleActions: "play none none none",
            once: true,
          },
        });
      }, sectionRef);

      ctxRef.current = ctx;
    };

    // Attend les fonts, sinon fallback
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(initSplitAndAnimation)
        .catch(initSplitAndAnimation);
    } else {
      initSplitAndAnimation();
    }

    return () => {
      cancelled = true;

      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }

      if (splitRef.current) {
        splitRef.current.revert();
        splitRef.current = null;
      }
    };
  }, []);

  return (
    <section className="text" ref={sectionRef} id="about">
      <div className="text__inner">
        <div className="text__content">
          <p>
            Je conçois des interfaces où exigence visuelle et rigueur technique
            avancent ensemble, avec une attention précise portée aux détails
            d’implémentation.
          </p>
          <br />
          <p>
            Mon objectif est de créer des expériences web fluides, modernes et
            fiables, en combinant un design sobre et lisible avec un code
            robuste, performant et facile à maintenir.
          </p>
          <br />
          <p>
            J’aime particulièrement travailler sur des interfaces où chaque
            micro-interaction compte, tout en gardant une base technique propre,
            structurée et évolutive.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Text;
