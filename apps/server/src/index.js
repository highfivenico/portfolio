const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------
// Chargement du JSON au démarrage
// -----------------------------
const projectsFilePath = path.join(
  __dirname,
  "data",
  "portfolio-projects.json"
);

let projects = [];

try {
  const raw = fs.readFileSync(projectsFilePath, "utf-8");
  const json = JSON.parse(raw);

  // Récupère le tableau de projets
  projects = Array.isArray(json.projects) ? json.projects : [];
  console.log(`${projects.length} projet(s) chargé(s) depuis le JSON.`);
} catch (err) {
  console.error("Erreur lors du chargement du fichier JSON :", err);
  projects = [];
}

// -----------------------------
// Route summary pour le carousel
// -----------------------------
app.get("/api/projects/summary", (req, res) => {
  try {
    // Transforme chaque projet en "sommaire" pour le carousel
    const summaries = projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      thumbnail: project.thumbnail,
      shortDescription: project.shortDescription,
      technologies: project.technologies,
      status: project.status,
      year: project.year,
    }));

    res.json({ projects: summaries });
  } catch (err) {
    console.error("Erreur /api/projects/summary :", err);
    res
      .status(500)
      .json({ message: "Impossible de récupérer la liste des projets." });
  }
});

// -----------------------------
// Route détail pour la modale
// -----------------------------
app.get("/api/projects/:slug", (req, res) => {
  try {
    const { slug } = req.params;

    // Cherche le projet correspondant dans le tableau chargé au démarrage
    const project = projects.find((p) => p.slug === slug);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable." });
    }

    // Renvoie l'objet complet
    res.json({ project });
  } catch (err) {
    console.error("Erreur /api/projects/:slug :", err);
    res.status(500).json({ message: "Impossible de récupérer ce projet." });
  }
});

// -----------------------------
// Lancement du serveur
// -----------------------------
app.listen(PORT, () => {
  console.log(`API portfolio sur http://localhost:${PORT}`);
});
