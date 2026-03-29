import { useApp, SPECIALTIES } from "../App";

export default function Sidebar() {
  const { activeView, setActiveView, documents, driveConnected } = useApp();

  const navItems = [
    { id:"dashboard", icon:"⊞", label:"Tableau de bord" },
    { id:"search",    icon:"⌕", label:"Buscador IA"     },
    { id:"library",   icon:"⊟", label:"Bibliothèque"    },
    { id:"calendar",  icon:"◫", label:"Calendrier"      },
    { id:"hospital",  icon:"✚", label:"Mode Hôpital"    },
    { id:"progress",  icon:"📊", label:"Progression"    },
    { id:"plan",      icon:"🗓️", label:"Plan de révision" },
  ];

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-name"><em>Doctora</em> Petite</div>
        <div className="sb-sub">Built for Manon ✦</div>
      </div>
      <div className="sb-user">
        <div className="avatar">M</div>
        <div>
          <div className="sb-user-name">Manon</div>
          <div className="sb-user-year">4ème année · Médecine</div>
        </div>
      </div>
      <nav className="sb-nav">
        <div className="nav-label">Navigation</div>
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${activeView===item.id?"active":""}`} onClick={()=>setActiveView(item.id)}>
            <span style={{ width:17, textAlign:"center" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <div className="nav-label" style={{ marginTop:10 }}>Spécialités</div>
        {SPECIALTIES.slice(0,6).map(s => {
          const count = documents.filter(d=>d.specialty===s.id).length;
          return (
            <button key={s.id} className="nav-item" onClick={()=>setActiveView("library")}>
              <span className="spec-dot" style={{ width:7, height:7, background:s.color }} />
              {s.label}
              {count>0 && <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,.2)" }}>{count}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sb-footer">
        <div className="drive-status">
          <div className={`pulse-dot ${driveConnected?"on":""}`} />
          {driveConnected?"Google Drive connecté":"Connecter Google Drive"}
        </div>
      </div>
    </aside>
  );
}