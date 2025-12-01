import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Text from "./components/Text";
import About from "./components/About";
import Contact from "./components/Contact";

function App() {
  return (
    <div className="app">
      <NavBar />
      <Hero />
      <Projects />
      <Text />
      <About />
      <Contact />
    </div>
  );
}

export default App;
