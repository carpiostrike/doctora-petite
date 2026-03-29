import { useApp, Btn } from "../App";

const VIEW_META = {
  dashboard: { title:"Tableau de bord",     sub:()=>`Bonjour Manon 🌸 — ${new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}` },
  search:    { title:"Buscador IA",          sub:()=>"Recherche uniquement dans tes documents" },
  library:   { title:"Bibliothèque",         sub:()=>"Tes documents classifiés par l'IA" },
  calendar:  { title:"Calendrier d'étude",   sub:()=>"Cours, examens et rotations" },
  hospital:  { title:"Mode Hôpital",         sub:()=>"Références rapides pour les gardes" },
  progress:  { title:"Ma Progression",       sub:()=>"Thèmes ECNi · Université de Rennes" },
  plan:      { title:"Plan de révision",     sub:()=>"Planning automatique jusqu'aux examens" },
};

export default function Topbar() {
  const { activeView, setSettingsOpen, setAddEventOpen } = useApp();
  const meta = VIEW_META[activeView] || VIEW_META.dashboard;
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-sub">{meta.sub()}</div>
      </div>
      <div className="topbar-actions">
        <Btn variant="ghost" onClick={()=>setAddEventOpen(true)}>+ Événement</Btn>
        <Btn variant="ghost" onClick={()=>setSettingsOpen(true)}>⚙</Btn>
      </div>
    </header>
  );
}