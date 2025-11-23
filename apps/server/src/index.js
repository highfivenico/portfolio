import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Données de test en dur (avant création de la base de donnée MongoDB)
const projects = [
  {
    id: 1,
    title: "Projet 1",
    shortDescription: "Première projet.",
    description: "Détails plus complets du projet…",
  },
  {
    id: 2,
    title: "Projet 2",
    shortDescription: "Deuxième projet.",
    description: "Détails plus complets du projet…",
  },
];

app.get("/api/projects", (req, res) => {
  res.json(projects);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
