import { create } from "zustand";
import { getOperationalSettings, resetOperationalSettingsApi, updateOperationalSettings } from "../lib/settingsApi";
import { useAuthStore } from "./authStore";

export interface PaymentMethodSetting {
  id: string;
  name: string;
  enabled: boolean;
  settlementDays: number;
  feePercent: number;
}

export interface OperationalSettings {
  preferences: {
    sounds: boolean;
    confirmations: boolean;
    autoUpdates: boolean;
  };
  gymHours: {
    weekdaysStart: string;
    weekdaysEnd: string;
    saturdayStart: string;
    saturdayEnd: string;
  };
  finance: {
    currency: string;
    taxName: string;
    taxRate: number;
    receiptPrefix: string;
    invoiceSeries: string;
    receiptFooter: string;
    paymentMethods: PaymentMethodSetting[];
  };
  contracts: {
    graceDays: number;
    renewalNoticeDays: number;
    autoRenew: boolean;
    allowFreeze: boolean;
    maxFreezeDays: number;
    blockOnOverdue: boolean;
    defaultContractModel: string;
  };
  checkin: {
    manual: boolean;
    qrCode: boolean;
    biometric: boolean;
    turnstile: boolean;
    allowGuestCheckin: boolean;
    blockExpiredPlan: boolean;
    dailyLimit: number;
    toleranceMinutes: number;
    accessStart: string;
    accessEnd: string;
  };
  notifications: {
    whatsapp: boolean;
    email: boolean;
    sms: boolean;
    dueReminderDays: number;
    birthdayMessage: boolean;
    paymentReceipt: boolean;
    checkinAlert: boolean;
  };
  integrations: {
    whatsappBusiness: boolean;
    paymentGateway: string;
    googleCalendar: boolean;
    turnstileProvider: string;
    publicApi: boolean;
    webhookUrl: string;
  };
  printing: {
    enabled: boolean;
    defaultPrinterName: string;
    connectionType: "network" | "usb" | "serial";
    profile: "generic" | "epson" | "bematech" | "xprinter" | "rongta" | "wintec";
    paperWidth: 58 | 80;
    networkHost: string;
    networkPort: number;
    usbDeviceName: string;
    serialPath: string;
    cashDrawerEnabled: boolean;
    cashDrawerPin: 0 | 1;
    cashDrawerOnTimeMs: number;
    cashDrawerOffTimeMs: number;
    autoPrintReceipt: boolean;
    openDrawerOnCashPayment: boolean;
  };
  backup: {
    localBackup: boolean;
    cloudBackup: boolean;
    retentionDays: number;
    autoBackupTime: string;
    exportFormat: string;
    lastBackupAt: string;
  };
}

interface OperationalSettingsState {
  settings: OperationalSettings;
  isLoading: boolean;
  isSaving: boolean;
  loadOnline: () => Promise<void>;
  saveOnline: () => Promise<void>;
  updateSection: <Key extends keyof OperationalSettings>(section: Key, data: Partial<OperationalSettings[Key]>) => void;
  updatePaymentMethod: (id: string, data: Partial<PaymentMethodSetting>) => void;
  runBackup: () => void;
  resetOperationalSettings: () => void;
  resetOperationalSettingsOnline: () => Promise<void>;
}

const storageKey = "noogym:operational-settings";

export const defaultSettings: OperationalSettings = {
  preferences: {
    sounds: true,
    confirmations: true,
    autoUpdates: false
  },
  gymHours: {
    weekdaysStart: "06:00",
    weekdaysEnd: "22:00",
    saturdayStart: "07:00",
    saturdayEnd: "18:00"
  },
  finance: {
    currency: "AOA",
    taxName: "IVA",
    taxRate: 0,
    receiptPrefix: "NG",
    invoiceSeries: "2026",
    receiptFooter: "Obrigado pela preferencia.",
    paymentMethods: [
      { id: "cash", name: "Dinheiro", enabled: true, settlementDays: 0, feePercent: 0 },
      { id: "debit", name: "Cartao de debito", enabled: true, settlementDays: 1, feePercent: 1.5 },
      { id: "credit", name: "Cartao de credito", enabled: true, settlementDays: 2, feePercent: 2.5 },
      { id: "transfer", name: "Transferencia", enabled: true, settlementDays: 0, feePercent: 0 },
      { id: "reference", name: "PIX/Referencia", enabled: true, settlementDays: 0, feePercent: 0 }
    ]
  },
  contracts: {
    graceDays: 3,
    renewalNoticeDays: 5,
    autoRenew: true,
    allowFreeze: true,
    maxFreezeDays: 15,
    blockOnOverdue: true,
    defaultContractModel: "Contrato padrao mensal"
  },
  checkin: {
    manual: true,
    qrCode: true,
    biometric: false,
    turnstile: false,
    allowGuestCheckin: false,
    blockExpiredPlan: true,
    dailyLimit: 1,
    toleranceMinutes: 10,
    accessStart: "05:30",
    accessEnd: "22:00"
  },
  notifications: {
    whatsapp: true,
    email: true,
    sms: false,
    dueReminderDays: 3,
    birthdayMessage: true,
    paymentReceipt: true,
    checkinAlert: false
  },
  integrations: {
    whatsappBusiness: false,
    paymentGateway: "Nenhum",
    googleCalendar: false,
    turnstileProvider: "Nenhum",
    publicApi: false,
    webhookUrl: ""
  },
  printing: {
    enabled: true,
    defaultPrinterName: "Impressora POS Recepcao",
    connectionType: "network",
    profile: "generic",
    paperWidth: 58,
    networkHost: "192.168.1.50",
    networkPort: 9100,
    usbDeviceName: "",
    serialPath: "COM1",
    cashDrawerEnabled: false,
    cashDrawerPin: 0,
    cashDrawerOnTimeMs: 50,
    cashDrawerOffTimeMs: 250,
    autoPrintReceipt: true,
    openDrawerOnCashPayment: true
  },
  backup: {
    localBackup: true,
    cloudBackup: false,
    retentionDays: 90,
    autoBackupTime: "23:30",
    exportFormat: "JSON",
    lastBackupAt: "Hoje, 10:30"
  }
};

const mergeSettings = (stored: unknown): OperationalSettings => {
  if (!stored || typeof stored !== "object") return defaultSettings;
  const partial = stored as Partial<OperationalSettings>;

  return {
    preferences: { ...defaultSettings.preferences, ...partial.preferences },
    gymHours: { ...defaultSettings.gymHours, ...partial.gymHours },
    finance: {
      ...defaultSettings.finance,
      ...partial.finance,
      paymentMethods: partial.finance?.paymentMethods?.length ? partial.finance.paymentMethods : defaultSettings.finance.paymentMethods
    },
    contracts: { ...defaultSettings.contracts, ...partial.contracts },
    checkin: { ...defaultSettings.checkin, ...partial.checkin },
    notifications: { ...defaultSettings.notifications, ...partial.notifications },
    integrations: { ...defaultSettings.integrations, ...partial.integrations },
    printing: { ...defaultSettings.printing, ...partial.printing },
    backup: { ...defaultSettings.backup, ...partial.backup }
  };
};

const loadSettings = () => {
  if (typeof window === "undefined") return defaultSettings;

  try {
    return mergeSettings(JSON.parse(localStorage.getItem(storageKey) ?? "null"));
  } catch {
    return defaultSettings;
  }
};

const persistSettings = (settings: OperationalSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(settings));
};

export const useOperationalSettingsStore = create<OperationalSettingsState>((set, get) => ({
  settings: loadSettings(),
  isLoading: false,
  isSaving: false,
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const settings = mergeSettings(await getOperationalSettings(token));
      persistSettings(settings);
      set({ settings, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  saveOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isSaving: true });
    try {
      const settings = mergeSettings(await updateOperationalSettings(token, mergeSettings(get().settings)));
      persistSettings(settings);
      set({ settings, isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },
  updateSection: (section, data) =>
    set((state) => {
      const settings = {
        ...state.settings,
        [section]: {
          ...state.settings[section],
          ...data
        }
      };
      persistSettings(settings);
      return { settings };
    }),
  updatePaymentMethod: (id, data) =>
    set((state) => {
      const settings = {
        ...state.settings,
        finance: {
          ...state.settings.finance,
          paymentMethods: state.settings.finance.paymentMethods.map((method) => method.id === id ? { ...method, ...data } : method)
        }
      };
      persistSettings(settings);
      return { settings };
    }),
  runBackup: () =>
    set((state) => {
      const settings = {
        ...state.settings,
        backup: {
          ...state.settings.backup,
          lastBackupAt: "Agora"
        }
      };
      persistSettings(settings);
      return { settings };
    }),
  resetOperationalSettings: () => {
    persistSettings(defaultSettings);
    set({ settings: defaultSettings });
  },
  resetOperationalSettingsOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      persistSettings(defaultSettings);
      set({ settings: defaultSettings });
      return;
    }
    set({ isSaving: true });
    try {
      const settings = mergeSettings(await resetOperationalSettingsApi(token));
      persistSettings(settings);
      set({ settings, isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  }
}));
