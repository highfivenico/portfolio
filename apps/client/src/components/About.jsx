import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import CustomBounce from "gsap/CustomBounce";
import CustomEase from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomBounce, CustomEase);

const About = () => {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Evite de lancer l’anim si le composant est démonté avant l’init
    let isCancelled = false;

    const ctx = gsap.context(() => {}, sectionRef);

    const initAnimation = () => {
      if (isCancelled) return;

      ctx.add(() => {
        const title = section.querySelector(".about__title");
        const textBlock = section.querySelector(".about__text");
        if (!title) return;

        // Bounce custom
        CustomBounce.create("aboutBounce", {
          strength: 0.6,
          squash: 1.5,
          squashID: "aboutBounce-squash",
        });

        // Split du titre en caractères
        const split = new SplitText(title, { type: "chars" });
        const chars = split.chars;

        // Timeline avec léger délai
        const tl = gsap.timeline({
          delay: 0.15,
          defaults: {
            duration: 1.5,
            stagger: { amount: 0.1, ease: "sine.in" },
          },
          scrollTrigger: {
            trigger: section,
            start: "top 65%",
            toggleActions: "restart none none reset",
          },
        });

        tl.from(
          chars,
          {
            duration: 0.6,
            opacity: 0,
            ease: "power1.inOut",
          },
          0
        )
          .from(
            chars,
            {
              y: -350,
              ease: "aboutBounce",
            },
            0
          )
          .to(
            chars,
            {
              scaleX: 1.8,
              scaleY: 0.7,
              rotate: () => 15 - 30 * Math.random(),
              ease: "aboutBounce-squash",
              transformOrigin: "50% 100%",
            },
            0
          );

        // Apparition du texte
        if (textBlock) {
          gsap.from(textBlock, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.8,
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
              toggleActions: "restart none none reset",
            },
          });
        }
      });
    };

    // Attendre le chargement des fonts avant SplitText
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!isCancelled) initAnimation();
      });
    } else {
      // Fallback si document.fonts n'est pas dispo
      initAnimation();
    }

    return () => {
      isCancelled = true;
      ctx.revert();
    };
  }, []);

  // Rendu du composant
  return (
    <section className="about" ref={sectionRef} id="about">
      <h2 className="about__title">ABOUT</h2>
      <div className="about__inner">
        <div className="about__text">
          <p>
            Avant d’être développeur, j’ai évolué dans des univers où chaque
            détail compte et où créativité et technique sont indissociables :
            lutherie, photographie, mécanique, aéronautique...
          </p>
          <br />
          <p>
            Aujourd’hui, je mets au service du développement la même exigence,
            rigueur, minutie et créativité acquises pendant des années dans mes
            autres métiers et passions.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
