// ============================================================
//  DOCTORA PETITE — Shared Constants
//  Separado de App.js para evitar importaciones circulares
// ============================================================

export const SPECIALTIES = [
    { id: "cardio",  label: "Cardiologie",        color: "#C9897A", icon: "❤️"  },
    { id: "neuro",   label: "Neurologie",         color: "#7B9EC7", icon: "🧠"  },
    { id: "gastro",  label: "Gastro-entérologie", color: "#8BA888", icon: "🫁"  },
    { id: "pneumo",  label: "Pneumologie",        color: "#C9A96E", icon: "💨"  },
    { id: "endoc",   label: "Endocrinologie",     color: "#C49EC5", icon: "🔬"  },
    { id: "rhum",    label: "Rhumatologie",       color: "#B5977A", icon: "🦴"  },
    { id: "dermato", label: "Dermatologie",       color: "#D4A574", icon: "🩹"  },
    { id: "nephro",  label: "Néphrologie",        color: "#7FC4D4", icon: "💧"  },
  ];
  
  export const DOC_TYPES = {
    college: { label: "Collège officiel", color: "#C9897A", icon: "📖" },
    pdf:     { label: "PDF Drive",        color: "#5C4070", icon: "📄" },
    note:    { label: "Apunte FreeNotes", color: "#8BA888", icon: "📝" },
    case:    { label: "Cas clinique",     color: "#C9A96E", icon: "🔬" },
  };
  
  export const FR_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  export const FR_DAYS   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  
  export const todayStr = () => new Date().toISOString().split("T")[0];
  export const addDays  = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  };