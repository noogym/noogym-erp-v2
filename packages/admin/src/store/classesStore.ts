import { create } from "zustand";
import { classes as mockClasses } from "../data/mock";
import { classFromApi, classToDto, createResource, listResource, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { ClassRecord } from "@noogym/types";

const initial: ClassRecord[] = mockClasses.map((lesson) => ({ ...lesson, id: uid("CLS") }));
const persist = (classes: ClassRecord[]) => writeLocal("noogym:classes", classes);

export const useClassesStore = create<{
  classes: ClassRecord[];
  loadOnline: () => Promise<void>;
  addClass: (lesson: Partial<ClassRecord>) => void;
  updateClass: (id: string, lesson: Partial<ClassRecord>) => void;
  closeClass: (id: string) => void;
}>((set, get) => ({
  classes: readLocal("noogym:classes", initial),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiClasses = await listResource<Record<string, unknown>>("classes", token);
    const classes = apiClasses.map(classFromApi);
    persist(classes);
    set({ classes });
  },
  addClass: (lesson) => set((state) => {
    const created: ClassRecord = { id: uid("CLS"), name: "Nova aula", room: "Sala 1", category: "Cardio", instructor: "Joao Silva", time: "Hoje, 10:00", duration: "55 min", seats: 25, participants: 0, status: "Agendada", ...lesson };
    const classes = [created, ...state.classes];
    persist(classes);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("classes", token, classToDto(created))
        .then((apiClass) => {
          const synced = classFromApi(apiClass);
          const nextClasses = get().classes.map((item) => item.id === created.id ? synced : item);
          persist(nextClasses);
          set({ classes: nextClasses });
        })
        .catch(console.error);
    }

    return { classes };
  }),
  updateClass: (id, lesson) => set((state) => {
    const nextLesson = { ...state.classes.find((item) => item.id === id), ...lesson };
    const classes = state.classes.map((item) => item.id === id ? { ...item, ...lesson } : item);
    persist(classes);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("classes", id, token, classToDto(nextLesson))
        .then((apiClass) => {
          const synced = classFromApi(apiClass);
          const nextClasses = get().classes.map((item) => item.id === id ? synced : item);
          persist(nextClasses);
          set({ classes: nextClasses });
        })
        .catch(console.error);
    }

    return { classes };
  }),
  closeClass: (id) => get().updateClass(id, { status: "Encerrada" })
}));
