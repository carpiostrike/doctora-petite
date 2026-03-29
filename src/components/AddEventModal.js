import { useState } from "react";
import { useApp, Modal, Field, Btn } from "../App";
import { SPECIALTIES, todayStr } from "../constants";

export default function AddEventModal() {
  const { addEventOpen, setAddEventOpen, saveEvent, documents } = useApp();

  const [form, setForm] = useState({
    title: "", type: "class", specialty: "cardio",
    date: todayStr(), time: "09:00", linkedDocId: "", reminder: true,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    saveEvent(form);
    setAddEventOpen(false);
    setForm({ title: "", type: "class", specialty: "cardio", date: todayStr(), time: "09:00", linkedDocId: "", reminder: true });
  };

  return (
    <Modal open={addEventOpen} onClose={() => setAddEventOpen(false)} title="Nouvel événement">
      <Field label="Titre">
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex: Cours Cardiologie, Examen Partiel…"
        />
      </Field>

      <div className="field-row">
        <Field label="Type">
          <select value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="class">Cours</option>
            <option value="exam">Examen</option>
            <option value="rotation">Rotation</option>
            <option value="revision">Révision</option>
          </select>
        </Field>
        <Field label="Spécialité">
          <select value={form.specialty} onChange={(e) => set("specialty", e.target.value)}>
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="field-row">
        <Field label="Date">
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Heure">
          <input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
        </Field>
      </div>

      <Field label="Document lié (optionnel)">
        <select value={form.linkedDocId} onChange={(e) => set("linkedDocId", e.target.value)}>
          <option value="">-- Aucun --</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </Field>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <input
          type="checkbox"
          id="ev-reminder"
          checked={form.reminder}
          onChange={(e) => set("reminder", e.target.checked)}
        />
        <label htmlFor="ev-reminder" style={{ fontSize: 12.5, color: "var(--soft)" }}>
          Rappel intelligent 30 min avant
        </label>
      </div>

      <div className="modal-actions">
        <Btn variant="ghost" onClick={() => setAddEventOpen(false)}>Annuler</Btn>
        <Btn variant="primary" onClick={handleSave}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}