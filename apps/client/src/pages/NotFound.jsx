import { useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import SplitText from "gsap/SplitText";
import CustomBounce from "gsap/CustomBounce";

gsap.registerPlugin(SplitText, CustomBounce);

const NotFound = () => {
  const sectionRef = useRef(null);
  const tlRef = useRef(null);
  const splitRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let isCancelled = false;
    const ctx = gsap.context(() => {}, sectionRef);

    const initAnimation = () => {
      if (isCancelled) return;

      ctx.add(() => {
        const title = section.querySelector(".notfound__title");
        if (!title) return;

        CustomBounce.create("notFoundBounce", {
          strength: 0.6,
          squash: 1.5,
          squashID: "notFoundBounce-squash",
        });

        const split = new SplitText(title, { type: "chars" });
        splitRef.current = split;
        const chars = split.chars;

        const tl = gsap.timeline({
          delay: 0.15,
          defaults: {
            duration: 1.5,
            stagger: { amount: 0.1, ease: "sine.in" },
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
              ease: "notFoundBounce",
            },
            0
          )
          .to(
            chars,
            {
              scaleX: 1.8,
              scaleY: 0.7,
              rotate: () => 15 - 30 * Math.random(),
              ease: "notFoundBounce-squash",
              transformOrigin: "50% 100%",
            },
            0
          );

        tlRef.current = tl;
      });
    };

    // Attend le chargement des fonts
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!isCancelled) initAnimation();
      });
    } else {
      initAnimation();
    }

    return () => {
      isCancelled = true;
      if (splitRef.current) {
        // remet le DOM du titre en état normal
        splitRef.current.revert();
      }
      ctx.revert();
    };
  }, []);

  const handleClickTitle = () => {
    if (tlRef.current) {
      tlRef.current.restart();
    }
  };

  return (
    <section className="notfound" ref={sectionRef}>
      <div className="notfound__container">
        <h1 className="notfound__title" onClick={handleClickTitle}>
          404
        </h1>

        <p className="notfound__text">Oups… cette page n’existe pas.</p>

        <Link to="/" className="notfound__link">
          Retour à l’accueil
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
