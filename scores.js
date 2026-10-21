// Classement partagé du quiz : GET renvoie le top 20, POST ajoute un score.
// Les scores sont gardés dans Netlify Blobs (inclus et gratuit sur Netlify).
import { getStore } from "@netlify/blobs";

const MAX_PTS = 3700; // 20 bonnes réponses d'affilée sans joker : 100+100+150+150+16×200
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Meilleur score de chaque joueur, trié
function top(list) {
  const best = new Map();
  for (const r of list) {
    const k = r.name.toLowerCase();
    const b = best.get(k);
    if (!b || r.pts > b.pts || (r.pts === b.pts && r.right > b.right)) best.set(k, r);
  }
  return [...best.values()]
    .sort((a, b) => b.pts - a.pts || b.right - a.right || a.ts - b.ts)
    .slice(0, 20);
}

export default async (req) => {
  const store = getStore("quiz-scores");
  let list = (await store.get("all", { type: "json" })) || [];

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Données illisibles" }, 400); }
    const name = String(body.name || "").replace(/[<>&"]/g, "").trim().slice(0, 20);
    const right = Math.max(0, Math.min(20, parseInt(body.right, 10) || 0));
    // Une bonne réponse vaut au plus 200 points (100 + bonus série de 100)
    const pts = Math.max(0, Math.min(MAX_PTS, right * 200, parseInt(body.pts, 10) || 0));
    const mode = String(body.mode || "").replace(/[<>&"]/g, "").slice(0, 20);
    if (!name) return json({ error: "Prénom manquant" }, 400);

    list.push({ name, right, pts, mode, ts: Date.now() });
    // On garde les 500 meilleures parties pour que le fichier reste léger
    list = list.sort((a, b) => b.pts - a.pts).slice(0, 500);
    await store.setJSON("all", list);
  } else if (req.method !== "GET") {
    return json({ error: "Méthode non prise en charge" }, 405);
  }

  return json(top(list));
};

export const config = { path: "/api/scores" };
