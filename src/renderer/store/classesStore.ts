import { create } from "zustand";
import { classes as mockClasses } from "../data/mock";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { ClassRecord } from "./domainTypes";

const initial: ClassRecord[] = mockClasses.map((lesson) => ({ ...lesson, id: uid("CLS") }));
const persist = (classes: ClassRecord[]) => writeLocal("noogym:classes", classes);

export const useClassesStore = create<{
  classes: ClassRecord[];
  addClass: (lesson: Partial<ClassRecord>) => void;
  updateClass: (id: string, lesson: Partial<ClassRecord>) => void;
  closeClass: (id: string) => void;
}>((set, get) => ({
  classes: readLocal("noogym:classes", initial),
  addClass: (lesson) => set((state) => {
    const classes = [{ id: uid("CLS"), name: "Nova aula", room: "Sala 1", category: "Cardio", instructor: "João Silva", time: "Hoje, 10:00", duration: "55 min", seats: 25, participants: 0, status: "Agendada", ...lesson }, ...state.classes];
    persist(classes); useAppStore.getState().addPendingSync(); return { classes };
  }),
  updateClass: (id, lesson) => set((state) => {
    const classes = state.classes.map((item) => item.id === id ? { ...item, ...lesson } : item);
    persist(classes); useAppStore.getState().addPendingSync(); return { classes };
  }),
  closeClass: (id) => get().updateClass(id, { status: "Encerrada" })
}));
