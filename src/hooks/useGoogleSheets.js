// ============================================================
//  useGoogleSheets.js — Sync automático con Google Sheets
//  Doctora Petite — Built for Manon
//  Ubicación: src/hooks/useGoogleSheets.js
// ============================================================

const SHEET_URL_KEY = "dp_sheet_url";
const GAPI_KEY_KEY  = "dp_gapi_key";

export function extractSheetId(url) {
  if (!url) return null;
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

export function getSheetConfig() {
  return {
    sheetUrl: localStorage.getItem(SHEET_URL_KEY) || "",
    gapiKey:  localStorage.getItem(GAPI_KEY_KEY)  || "",
  };
}

export function saveSheetConfig({ sheetUrl, gapiKey }) {
  localStorage.setItem(SHEET_URL_KEY, sheetUrl || "");
  localStorage.setItem(GAPI_KEY_KEY,  gapiKey  || "");
}

function detectSpecByName(text) {
  if (!text) return "other";
  const t = text.toLowerCase();
  if (t.includes("cardio"))                            return "cardio";
  if (t.includes("neurochir"))                         return "neurochir";
  if (t.includes("neuro"))                             return "neuro";
  if (t.includes("pneumo"))                            return "pneumo";
  if (t.includes("vasculaire"))                        return "vasc";
  if (t.includes("gastro") || t.includes("hépatolo"))  return "gastro";
  if (t.includes("nutrition"))                         return "nutrition";
  if (t.includes("chirurgie digest"))                  return "chirdig";
  if (t.includes("uro"))                               return "uro";
  if (t.includes("ophtalmo"))                          return "ophtalmo";
  if (t.includes("orl"))                               return "orl";
  if (t.includes("psychiatr"))                         return "psy";
  if (t.includes("mpr") || t.includes("rééducat"))     return "mpr";
  if (t.includes("palliat") || t.includes("douleur"))  return "douleur";
  if (t.includes("thérapeu"))                          return "therapeu";
  return "other";
}

const splitBooks = (s) =>
  (s || "").split(/[•\/\n]/).map(x => x.trim()).filter(Boolean);

function parseSheetRows(rows) {
  if (!rows || rows.length < 2) return [];

  let hi = 0;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    if (rows[i].some(c => String(c).toLowerCase().includes("titre"))) {
      hi = i;
      break;
    }
  }

  const H     = rows[hi].map(c => String(c).toLowerCase().trim());
  const iN    = H.findIndex(h => h.includes("n°") || h === "n");
  const iT    = H.findIndex(h => h.includes("titre"));
  const iEc   = H.findIndex(h => h.includes("écriture") || h.includes("ecriture"));
  const iRel  = H.findIndex(h => h.includes("relecture"));
  const iVus  = H.findIndex(h => h.includes("vus"));
  const iCol  = H.findIndex(h => h.includes("couleur"));
  const iTerm = H.findIndex(h =>
    h.includes("terminé") || h.includes("termine") || h === "fait" || h === "done" || h === "ok"
  );

  const imported = [];

  for (let i = hi + 1; i < rows.length; i++) {
    const row        = rows[i];
    const titre      = String(row[iT] ?? "").trim();
    if (!titre) continue;

    const ecStr      = String(row[iEc]  ?? "").trim();
    const relStr     = String(row[iRel] ?? "").trim();
    const vusStr     = String(row[iVus] ?? "").trim();
    const couleurTxt = iCol >= 0 ? String(row[iCol] ?? "").trim() : "";
    const termVal    = iTerm >= 0 ? String(row[iTerm] ?? "").trim() : "";
    const spec       = detectSpecByName(couleurTxt || ecStr);

    imported.push({
      id:             "gs_" + i + "_" + String(row[iN] ?? i).replace(/\s/g, ""),
      num:            String(row[iN] ?? i).trim(),
      title:          titre,
      ecBooks:        splitBooks(ecStr),
      relBooks:       splitBooks(relStr),
      vusBooks:       splitBooks(vusStr),
      bgHex:          "",
      specialty:      spec,
      subspecialties: [],
      ec_done:        false,
      rel_done:       false,
      vus_done:       vusStr.length > 0,
      etudie:         termVal ? "termine" : "none",
      note: "", pages: "", doc: "",
    });
  }

  return imported;
}

export async function fetchGoogleSheet(sheetUrl, gapiKey) {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) throw new Error("URL invalide. Vérifie le lien Google Sheets.");
  if (!gapiKey) throw new Error("Clé API Google manquante.");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z600?key=${gapiKey}`;
  const res  = await fetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 403) throw new Error("Accès refusé. La feuille doit être publique (\"Tout le monde avec le lien\").");
    if (res.status === 400) throw new Error("Clé API invalide ou Sheet ID introuvable.");
    throw new Error(err?.error?.message || `Erreur ${res.status}`);
  }

  const data   = await res.json();
  const topics = parseSheetRows(data.values || []);
  if (!topics.length) throw new Error("Aucun thème trouvé. Vérifie les colonnes N°, Titre, etc.");
  return topics;
}