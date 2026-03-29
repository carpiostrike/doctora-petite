// ============================================================
//  DOCTORA PETITE — Built for Manon
//  App.js v7 — Config cargada desde Supabase al arrancar
// ============================================================

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import "./App.css";

import Dashboard      from "./views/Dashboard";
import Search         from "./views/Search";
import Library        from "./views/Library";
import CalendarView   from "./views/Calendar";
import Hospital       from "./views/Hospital";
import Progress       from "./views/Progress";
import Sidebar        from "./components/Sidebar";
import Topbar         from "./components/Topbar";
import Notification   from "./components/Notification";
import SettingsModal  from "./components/SettingsModal";
import AddEventModal  from "./components/AddEventModal";
import Plan           from "./views/Plan";
import { supabase }   from "./lib/supabaseClient";

// ─── ALL SPECIALTIES ─────────────────────────────────────────

export const SPECIALTIES = [
  { id:"neuro",      label:"Neurologie",                      color:"#C47070", icon:"🧠" },
  { id:"neurochir",  label:"Neurochirurgie",                  color:"#C49090", icon:"🔬" },
  { id:"mpr",        label:"MPR — Méd. physique & réadapt.",  color:"#B05A44", icon:"🦽" },
  { id:"psy",        label:"Psychiatrie",                     color:"#5A8A8C", icon:"🧩" },
  { id:"ophtalmo",   label:"Ophtalmologie",                   color:"#5B80C4", icon:"👁️" },
  { id:"orl",        label:"ORL",                             color:"#5C9460", icon:"👂" },
  { id:"medecinleg", label:"Médecine légale & du travail",    color:"#708090", icon:"⚖️" },
  { id:"santepub",   label:"Santé publique",                  color:"#6A8A5A", icon:"🏥" },
  { id:"biostat",    label:"Biostatistiques",                 color:"#6080A0", icon:"📊" },
  { id:"epidemio",   label:"Épidémiologie",                   color:"#7A7040", icon:"🔭" },
  { id:"cardio",     label:"Cardiologie",                     color:"#9B8BC4", icon:"🫀" },
  { id:"pneumo",     label:"Pneumologie",                     color:"#C4869A", icon:"💨" },
  { id:"gastro",     label:"Gastroentérologie",               color:"#A8A030", icon:"🫁" },
  { id:"uro",        label:"Urologie",                        color:"#C4894A", icon:"🫘" },
  { id:"vasc",       label:"Méd. vasculaire",                 color:"#8B80B0", icon:"🩸" },
  { id:"nutrition",  label:"Nutrition",                       color:"#C09070", icon:"🥗" },
  { id:"chirdig",    label:"Chirurgie digestive",             color:"#A89840", icon:"🔪" },
  { id:"douleur",    label:"Douleur / Palliatifs",            color:"#909090", icon:"💊" },
  { id:"therapeu",   label:"Thérapeutique",                   color:"#6090B4", icon:"💉" },
  { id:"other",      label:"Autre / Général",                 color:"#8090A0", icon:"📋" },
];

const SEMESTER_KEY     = "dp_semester_specs";
const DEFAULT_SEMESTER = ["neuro","neurochir","mpr","psy","ophtalmo","orl","medecinleg","santepub","biostat","epidemio"];

export function getSemesterSpecs() {
  try { const s = localStorage.getItem(SEMESTER_KEY); if (s) return JSON.parse(s); } catch {}
  return DEFAULT_SEMESTER;
}
export function saveSemesterSpecs(ids) {
  try { localStorage.setItem(SEMESTER_KEY, JSON.stringify(ids)); } catch {}
}

export const DOC_TYPES = {
  college: { label:"Collège officiel", color:"#C9897A", icon:"📖" },
  pdf:     { label:"PDF Drive",        color:"#5C4070", icon:"📄" },
  note:    { label:"Apunte FreeNotes", color:"#8BA888", icon:"📝" },
  case:    { label:"Cas clinique",     color:"#C9A96E", icon:"🔬" },
};

export const FR_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const FR_DAYS   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

export const todayStr = () => new Date().toISOString().split("T")[0];
export const addDays  = (n) => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };

export const TOPICS_KEY = "dp_manon_v4";

function computeProgress(topics) {
  return SPECIALTIES.map(s => {
    const specTopics = topics.filter(t => t.specialty === s.id || (t.subspecialties||[]).includes(s.id));
    const done = specTopics.filter(t => t.etudie === "termine").length;
    return { id:s.id, specialtyId:s.id, topicsDone:done, topicsTotal:specTopics.length||0, lastStudied:new Date().toISOString() };
  });
}

function getDemoDocuments() { return []; }
function getDemoEvents()    { return []; }

// ─── CLAUDE AI ───────────────────────────────────────────────

export async function semanticSearch(apiKey, query, documents) {
  const docContext = documents
    .filter(d => d.extractedText)
    .map(d => `[ID:${d.id}][SOURCE:${d.name}][TYPE:${d.type}][SPEC:${d.specialty}]\n${d.extractedText.slice(0,1200)}`)
    .join("\n\n---\n\n").slice(0, 14000);

  const system = `Tu es un assistant médical pédagogique pour une étudiante en médecine française (4ème année).
Tu travailles UNIQUEMENT avec les documents fournis. Ne génère JAMAIS d'information externe.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`;

  const user = `Documents:\n${docContext||"(Aucun document)"}\n\nRequête: "${query}"\n\nJSON:\n{"results":[{"docId":"","docName":"","docType":"","specialty":"","relevanceScore":0,"matchedSection":"","summary":"","keyTerms":[]}],"totalFound":0,"suggestion":""}`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system, messages:[{role:"user",content:user}] }),
  });

  if (!resp.ok) { const err = await resp.json().catch(()=>({})); throw new Error(err.error?.message||`Erreur API: ${resp.status}`); }
  const data = await resp.json();
  const raw  = data.content?.[0]?.text||"";
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
  catch { return { results:[], totalFound:0, suggestion:"Erreur d'analyse." }; }
}

// ─── GLOBAL CONTEXT ──────────────────────────────────────────

const AppContext = createContext(null);
export function useApp() { return useContext(AppContext); }

function AppProvider({ children }) {
  const [activeView,     setActiveView]     = useState("dashboard");
  const [documents,      setDocuments]      = useState([]);
  const [events,         setEvents]         = useState([]);
  const [progress,       setProgress]       = useState([]);
  const [semesterSpecs,  setSemesterSpecs]  = useState(getSemesterSpecs);
  const [notification,   setNotification]   = useState(null);
  const [apiKey,         setApiKey]         = useState(()=>localStorage.getItem("dp_apiKey")||"");
  const [driveConnected, setDriveConnected] = useState(false);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [addEventOpen,   setAddEventOpen]   = useState(false);
  const [configReady,    setConfigReady]    = useState(false);

  // ── Cargar config desde Supabase al arrancar ─────────────
  useEffect(() => {
    supabase
      .from("config")
      .select("*")
      .eq("id", "manon_config")
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.claude_key) {
            setApiKey(data.claude_key);
            localStorage.setItem("dp_apiKey", data.claude_key);
          }
          if (data.sheet_url) localStorage.setItem("dp_sheet_url", data.sheet_url);
          if (data.gapi_key)  localStorage.setItem("dp_gapi_key",  data.gapi_key);
        }
      })
      .catch(() => {})
      .finally(() => setConfigReady(true));
  }, []);

  useEffect(()=>{
    setDocuments(getDemoDocuments());
    setEvents(getDemoEvents());
    syncProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const syncProgress = useCallback(()=>{
    try {
      const saved = localStorage.getItem(TOPICS_KEY);
      if (saved) { const topics = JSON.parse(saved); if (topics.length > 0) { setProgress(computeProgress(topics)); return; } }
    } catch {}
    setProgress(SPECIALTIES.map(s=>({ id:s.id, specialtyId:s.id, topicsDone:0, topicsTotal:0, lastStudied:new Date().toISOString() })));
  },[]);

  useEffect(()=>{
    const id = setInterval(()=>{
      try {
        const saved = localStorage.getItem(TOPICS_KEY);
        if (saved) { const topics = JSON.parse(saved); if (topics.length > 0) setProgress(computeProgress(topics)); }
      } catch {}
    }, 1000);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{ localStorage.setItem("dp_apiKey", apiKey); },[apiKey]);

  const notify = useCallback((icon, title, msg)=>{
    setNotification({icon,title,msg});
    setTimeout(()=>setNotification(null), 3800);
  },[]);

  const saveEvent = useCallback((ev)=>{
    const newEv = {...ev, id:ev.id||crypto.randomUUID()};
    setEvents(prev=>[...prev.filter(e=>e.id!==newEv.id), newEv]);
    notify("✅","Événement enregistré","Ajouté au calendrier.");
    return newEv;
  },[notify]);

  const updateSemesterSpecs = useCallback((ids)=>{
    setSemesterSpecs(ids);
    saveSemesterSpecs(ids);
    notify("✅","Spécialités mises à jour","Le dashboard affiche ton semestre actuel.");
  },[notify]);

  const value = {
    activeView, setActiveView,
    documents, setDocuments,
    events, saveEvent,
    progress, syncProgress,
    semesterSpecs, updateSemesterSpecs,
    notification, notify,
    apiKey, setApiKey,
    driveConnected, setDriveConnected,
    settingsOpen, setSettingsOpen,
    addEventOpen, setAddEventOpen,
    configReady,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── SHARED UI ───────────────────────────────────────────────

export function Card({ children, className="", style={} }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}
export function CardLabel({ children }) {
  return <p className="card-label">{children}</p>;
}
export function Btn({ children, onClick, variant="primary", style={}, disabled=false }) {
  return <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}
export function Tag({ type }) {
  const info = DOC_TYPES[type]||DOC_TYPES.pdf;
  return <span className="tag" style={{ background:info.color+"18", color:info.color }}>{info.icon} {info.label}</span>;
}
export function ThinkingDots({ dark=false }) {
  return (
    <div className={`thinking ${dark?"thinking-dark":""}`}>
      <div className="thinking-dots">
        <div className="td" style={dark?{background:"#C9A96E"}:{}} />
        <div className="td" style={dark?{background:"#C9A96E"}:{}} />
        <div className="td" style={dark?{background:"#C9A96E"}:{}} />
      </div>
      <span>L'IA analyse tes documents…</span>
    </div>
  );
}
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal"><h2 className="modal-title">{title}</h2>{children}</div>
    </div>
  );
}
export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

// ─── APP SHELL ───────────────────────────────────────────────

function AppShell() {
  const { activeView, setActiveView, notification, notify } = useApp();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{
    setTimeout(()=>notify("🌸","Bonjour Manon !","Bienvenue dans ton semestre 8 🩺"), 1200);
  },[]);

  const views = {
    dashboard: <Dashboard />,
    search:    <Search />,
    library:   <Library />,
    calendar:  <CalendarView />,
    hospital:  <Hospital />,
    progress:  <Progress />,
    plan:      <Plan />,
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <Topbar />
        <main className="main-content">{views[activeView]||<Dashboard />}</main>
      </div>
      <SettingsModal />
      <AddEventModal />
      {notification && <Notification {...notification} />}
      <nav className="mobile-nav">
        {[
          { id:"dashboard", icon:"⊞", label:"Dashboard" },
          { id:"search",    icon:"⌕", label:"Buscador"  },
          { id:"plan",      icon:"🗓️", label:"Plan"      },
          { id:"progress",  icon:"📊", label:"Progrès"   },
          { id:"calendar",  icon:"◫", label:"Agenda"    },
          { id:"hospital",  icon:"✚", label:"Hôpital"   },
        ].map(item => (
          <button
            key={item.id}
            className={`mobile-nav-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}