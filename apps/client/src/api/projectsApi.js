import axios from "axios";

// URL de base de l'API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

// --------- Mise en cache ---------

let projectsSummaryCache = null; // Pour le carousel
const projectDetailCache = new Map(); // Pour la modale (slug → project)

// --------- Liste des projets pour le carousel ---------
export async function fetchProjectsSummary() {
  // Vérifie si les projets sont en cache
  if (projectsSummaryCache) {
    return projectsSummaryCache;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/projects/summary`, {
      timeout: 10000, // 10 secondes max
    });

    const data = response.data;

    // L'API peut renvoyer un tableau ou { projects: [...] }
    const projects = Array.isArray(data) ? data : data.projects || [];

    // Mise en cache
    projectsSummaryCache = projects;

    return projects;
  } catch (error) {
    // Pas de réponse du serveur
    if (!error.response) {
      const err = new Error(
        "Impossible de contacter le serveur. Vérifiez votre connexion."
      );
      err.status = null;
      err.data = null;
      throw err;
    }

    // Le serveur répond avec une erreur HTTP
    const { status, data } = error.response;

    const message =
      data?.message ||
      (status >= 500
        ? "Une erreur serveur est survenue."
        : "Une erreur est survenue lors du chargement des projets.");

    const err = new Error(message);
    err.status = status;
    err.data = data;
    throw err;
  }
}

// --------- Détail d'un projet ---------
export async function fetchProjectDetail(slug) {
  if (!slug) {
    const err = new Error("Slug de projet manquant.");
    err.status = null;
    err.data = null;
    throw err;
  }

  // Si le projet est déjà en cache
  if (projectDetailCache.has(slug)) {
    return projectDetailCache.get(slug);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${slug}`, {
      timeout: 10000,
    });

    const data = response.data;

    // L'API peut renvoyer l'objet direct ou { project: {...} }
    const project = data.project || data;

    // Mise en cache
    projectDetailCache.set(slug, project);

    return project;
  } catch (error) {
    if (!error.response) {
      const err = new Error(
        "Impossible de contacter le serveur. Vérifiez votre connexion."
      );
      err.status = null;
      err.data = null;
      throw err;
    }

    const { status, data } = error.response;

    const message =
      data?.message ||
      (status >= 500
        ? "Une erreur serveur est survenue."
        : "Une erreur est survenue lors du chargement du projet.");

    const err = new Error(message);
    err.status = status;
    err.data = data;
    throw err;
  }
}
