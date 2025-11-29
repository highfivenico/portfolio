import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const Text = () => {
  const sectionRef = useRef(null);
  const splitsRef = useRef([]);
  const ctxRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const content = section.querySelector(".text__content");
    if (!content) return;

    let cancelled = false;

    const init = () => {
      if (cancelled) return;

      // Nettoyage des anciens SplitText
      splitsRef.current.forEach((s) => s.revert && s.revert());
      splitsRef.current = [];

      // spans internes, pas les <p>
      const targets = Array.from(
        content.querySelectorAll(".text__paragraph-inner")
      );
      if (!targets.length) return;

      // words + chars
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

      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }

      const ctx = gsap.context(() => {
        gsap.set(allChars, { autoAlpha: 0 });

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
            onEnter: () => tl.play(0),
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
      }, sectionRef);

      ctxRef.current = ctx;
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(init).catch(init);
    } else {
      init();
    }

    return () => {
      cancelled = true;

      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }

      splitsRef.current.forEach((s) => s.revert && s.revert());
      splitsRef.current = [];
    };
  }, []);

  return (
    <section className="text" ref={sectionRef} id="about">
      <div className="text__inner">
        <div className="text__content">
          <p>
            <span className="text__paragraph-inner">
              Le travail mené sur des projets variés associant design exigeant
              et enjeux techniques avancés m'a permis d’affiner mes capacités à
              concevoir des interfaces performantes, robustes et soigneusement
              maîtrisées.
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
