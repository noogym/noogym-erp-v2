import { create } from "zustand";
import { classes as mockClasses } from "../data/mock";
import { classFromApi, classToDto, createResource, listResource, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useNotificationsStore } from "./notificationsStore";
import { toastInfo } from "./toastStore";
import type { ClassRecord } from "@noogym/types";

const initial: ClassRecord[] = mockClasses.map((lesson) => ({ ...lesson, id: uid("CLS") }));
const persist = (classes: ClassRecord[]) => writeLocal("noogym:classes", classes);

export const useClassesStore = create<{
  classes: ClassRecord[];
  loadOnline: () => Promise<void>;
  addClass: (lesson: Partial<ClassRecord>) => void;
  updateClass: (id: string, lesson: Partial<ClassRecord>) => void;
  duplicateClass: (id: string) => void;
  cancelClass: (id: string) => void;
  startClass: (id: string) => void;
  closeClass: (id: string) => void;
  updateParticipants: (id: string, participants: number) => void;
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
    const created: ClassRecord = { name: "Nova aula", room: "Sala 1", category: "Cardio", instructor: "Joao Silva", time: "Hoje, 10:00", duration: "55 min", seats: 25, participants: 0, status: "Agendada", allowWaitlist: true, requiresCheckIn: false, color: "#B6FF00", ...lesson, id: uid("CLS") };
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
        .catch(() => toastInfo("Aula salva localmente", "Nao foi possivel sincronizar com a API agora."));
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
        .catch(() => toastInfo("Aula salva localmente", "Nao foi possivel sincronizar com a API agora."));
    }

    return { classes };
  }),
  duplicateClass: (id) => {
    const lesson = get().classes.find((item) => item.id === id);
    if (!lesson) return;
    get().addClass({ ...lesson, id: uid("CLS"), name: `${lesson.name} Copia`, participants: 0, status: "Agendada" });
  },
  cancelClass: (id) => {
    const lesson = get().classes.find((item) => item.id === id);
    get().updateClass(id, { status: "Cancelada" });
    if (lesson) {
      useNotificationsStore.getState().addNotification({
        sourceId: `event:classes:cancelled:${id}`,
        title: "Aula cancelada",
        description: `${lesson.name} foi cancelada.`,
        category: "classes",
        tone: "warning",
        route: "aulas",
        actionLabel: "Ver aulas"
      });
    }
  },
  startClass: (id) => {
    const lesson = get().classes.find((item) => item.id === id);
    get().updateClass(id, { status: "Em andamento" });
    if (lesson) {
      useNotificationsStore.getState().addNotification({
        sourceId: `event:classes:started:${id}`,
        title: "Aula iniciada",
        description: `${lesson.name} esta em andamento.`,
        category: "classes",
        tone: "success",
        route: "aulas",
        actionLabel: "Ver aula"
      });
    }
  },
  closeClass: (id) => {
    const lesson = get().classes.find((item) => item.id === id);
    get().updateClass(id, { status: "Encerrada" });
    if (lesson) {
      useNotificationsStore.getState().addNotification({
        sourceId: `event:classes:closed:${id}`,
        title: "Aula encerrada",
        description: `${lesson.name} foi encerrada.`,
        category: "classes",
        tone: "info",
        route: "aulas",
        actionLabel: "Ver aulas"
      });
    }
  },
  updateParticipants: (id, participants) => get().updateClass(id, { participants })
}));
