import {
  Barcode,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Dumbbell,
  Info,
  QrCode,
  Search,
  ShieldCheck,
  Tag,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { createKeyboardScanner } from "@noogym/scanner";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { ColorPicker } from "../forms/ColorPicker";
import { FileUpload } from "../forms/FileUpload";
import { FormCheckbox } from "@noogym/ui";
import { FormInput } from "@noogym/ui";
import { FormSelect } from "@noogym/ui";
import { FormSwitch } from "@noogym/ui";
import { FormTextarea } from "@noogym/ui";
import { Modal } from "@noogym/ui";
import { apiRequest } from "../../lib/api";
import {
  remoteIdOf,
  resolveNoogymIdentity,
  type IdentityLinkResult,
} from "../../lib/domainApi";
import { useCheckinsStore } from "../../store/checkinsStore";
import { useClassesStore } from "../../store/classesStore";
import { useClientsStore } from "../../store/clientsStore";
import { useEmployeesStore } from "../../store/employeesStore";
import { useFinanceStore } from "../../store/financeStore";
import { usePlansStore } from "../../store/plansStore";
import { useProductsStore } from "../../store/productsStore";
import { useSalesStore } from "../../store/salesStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useAppStore } from "../../store/appStore";
import { useWorkoutsStore } from "../../store/workoutsStore";
import { useAuthStore } from "../../store/authStore";
import { toastError, toastInfo, toastSuccess } from "../../store/toastStore";
import type {
  CheckinRecord,
  ClassRecord,
  ClientRecord,
  EmployeeRecord,
  PlanRecord,
  ProductRecord,
  SaleItemRecord,
  SaleRecord,
  WorkoutExerciseRecord,
  WorkoutRecord,
} from "@noogym/types";
import type { PlanCategory, PlanCategoryInput } from "../../store/plansStore";

const today = "Hoje, 10:30";
const planWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const defaultPlanWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
type PlanAvailabilityMode = "all" | "current" | "selected";
const planAvailableForGym = (plan: PlanRecord, gymId?: string | null) =>
  !gymId || !plan.gymIds?.length || plan.gymIds.includes(gymId);
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};
const barcodeDetector = () =>
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
        .BarcodeDetector;

const dateTimeInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const formatDateTimeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today;

  const now = new Date();
  const time = new Intl.DateTimeFormat("pt-AO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  if (date.toDateString() === now.toDateString()) return `Hoje, ${time}`;
  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
const parseAmountInput = (value: string) => {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-noogym-lime">{title}</h3>
      {children}
    </section>
  );
}

export function ManualCheckinModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const clients = useClientsStore((state) => state.clients);
  const addCheckin = useCheckinsStore((state) => state.addCheckin);
  const validateCheckin = useCheckinsStore((state) => state.validateCheckin);
  const [query, setQuery] = useState("");
  const [accessType, setAccessType] = useState("Entrada");
  const selected =
    clients.find((client) =>
      `${client.name} ${client.id} ${client.email} ${client.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) ?? clients[0];

  const confirm = () => {
    if (!selected) {
      toastInfo(
        "Sem clientes",
        "Cadastre um cliente antes de realizar check-in.",
      );
      return;
    }
    const payload = {
      clientName: selected.name,
      clientId: selected.id,
      type: "Manual",
      accessType,
      dateTime: today,
    };
    const validation = validateCheckin(payload);
    if (!validation.allowed) {
      toastInfo(validation.title, validation.message);
      return;
    }
    if (!addCheckin(payload)) {
      toastInfo(
        "Check-in bloqueado",
        "Nao foi possivel registrar o check-in agora.",
      );
      return;
    }
    toastSuccess(
      "Check-in realizado",
      `${selected.name} registado com sucesso.`,
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Check-in manual"
      description="Realize o check-in de um aluno informando os dados manualmente."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={<Check className="h-4 w-4" />}
            onClick={confirm}
          >
            Confirmar check-in
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Section title="1. Buscar aluno">
            <div className="flex gap-2 border-b border-white/10 text-sm">
              {[
                "Buscar por nome",
                "Buscar por código",
                "Buscar por e-mail",
                "Buscar por telefone",
              ].map((tab, index) => (
                <span
                  key={tab}
                  className={`px-3 py-2 ${index === 0 ? "border-b border-noogym-lime text-noogym-lime" : "text-zinc-400"}`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                className="h-11 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 outline-none focus:border-noogym-lime/70"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite nome, código, e-mail ou telefone..."
              />
            </div>
            {selected ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-noogym-lime">Aluno encontrado</p>
                <div className="flex items-center gap-4">
                  <Avatar
                    label={selected.avatar ?? "CL"}
                    className="h-16 w-16"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{selected.name}</p>
                      <Badge>Ativo</Badge>
                    </div>
                    <p className="text-sm text-zinc-300">
                      Plano: {selected.plan}
                    </p>
                    <p className="text-sm text-zinc-300">
                      Código: {selected.id}
                    </p>
                    <p className="text-sm text-zinc-300">
                      E-mail: {selected.email}
                    </p>
                    <p className="text-sm text-zinc-300">
                      Telefone: {selected.phone}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-zinc-400">Vencimento</p>
                    <p className="text-noogym-lime">{selected.expires}</p>
                    <p className="mt-3 text-zinc-400">Dias restantes</p>
                    <p className="text-noogym-lime">15 dias</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
                Nenhum cliente encontrado. Cadastre um cliente para liberar o
                check-in.
              </div>
            )}
          </Section>
          <Section title="2. Informações do check-in">
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Data e hora do check-in"
                defaultValue="08/05/2026 - 10:30"
              />
              <FormSelect
                label="Tipo de acesso"
                value={accessType}
                onChange={(event) => setAccessType(event.target.value)}
                options={["Entrada", "Saída"]}
              />
            </div>
            <FormTextarea
              label="Observações (opcional)"
              placeholder="Adicione alguma observação sobre o check-in..."
              maxLength={150}
            />
          </Section>
        </div>
        <Card className="p-5">
          <h3 className="text-noogym-lime">Resumo do check-in</h3>
          <div className="mt-8 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-noogym-lime/50 bg-noogym-lime/10">
              <CheckCircle2 className="h-12 w-12 text-noogym-lime" />
            </span>
            <p className="mt-4">Check-in será realizado com sucesso.</p>
          </div>
          <div className="mt-6 space-y-4 border-t border-white/10 pt-4 text-sm">
            <p className="flex items-center gap-3">
              <UsersRound className="h-4 w-4 text-zinc-400" />{" "}
              {selected?.name ?? "Sem cliente selecionado"}
            </p>
            <p className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-zinc-400" />{" "}
              {selected?.plan ?? "Sem plano"}
            </p>
            <p className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-zinc-400" /> 08/05/2026 - 10:30
            </p>
            <p className="flex items-center gap-3">
              <Info className="h-4 w-4 text-zinc-400" /> {accessType}
            </p>
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export function QrScannerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addQrCheckin = useCheckinsStore((state) => state.addQrCheckin);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [manualPayload, setManualPayload] = useState("");
  const [status, setStatus] = useState(
    "Scanner USB ativo. A camera sera usada se estiver disponivel.",
  );
  const [result, setResult] = useState<CheckinRecord | null>(null);
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const processPayload = useCallback(
    async (payload: string) => {
      const normalized = payload.trim();
      if (!normalized || scanningRef.current) return;

      scanningRef.current = true;
      setStatus("A validar codigo...");
      try {
        const checkin = await addQrCheckin(normalized);
        if (!checkin) {
          setStatus("Codigo nao encontrado ou ja revogado.");
          toastInfo(
            "Codigo invalido",
            "Nao encontrei este QR, codigo de barras ou cartao em clientes ativos desta unidade.",
          );
          return;
        }
        setResult(checkin);
        setStatus("Check-in confirmado.");
        toastSuccess(
          "Check-in realizado",
          `${checkin.clientName} registado por scanner.`,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel validar este codigo.";
        setStatus(message);
        toastInfo("Check-in bloqueado", message);
      } finally {
        window.setTimeout(() => {
          scanningRef.current = false;
        }, 1200);
      }
    },
    [addQrCheckin],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualPayload("");
      setResult(null);
      return;
    }

    let active = true;
    let timer: number | undefined;

    const start = async () => {
      const Detector = barcodeDetector();
      if (!Detector) {
        setStatus(
          "Leitura por camera indisponivel neste navegador. Use o scanner USB ou cole o codigo abaixo.",
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus(
          "Camera indisponivel neste dispositivo. Use o scanner USB ou cole o codigo abaixo.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus(
          "Aponte a camera para o QR Code ou codigo de barras do cliente.",
        );
        const detector = new Detector({
          formats: ["qr_code", "code_128", "ean_13", "ean_8", "code_39"],
        });
        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes.find((code) => code.rawValue)?.rawValue;
            if (rawValue) await processPayload(rawValue);
          } catch {
            setStatus(
              "Nao consegui ler pela camera agora. Use o scanner USB ou cole o codigo abaixo.",
            );
          }
          timer = window.setTimeout(scan, 500);
        };
        void scan();
      } catch {
        setStatus(
          "Permita acesso a camera, use o scanner USB ou cole o codigo abaixo.",
        );
      }
    };

    void start();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      stopCamera();
    };
  }, [open, processPayload, stopCamera]);

  useEffect(() => {
    if (!open) return undefined;
    const scanner = createKeyboardScanner({
      onScan: (scan) => {
        setManualPayload(scan.value);
        void processPayload(scan.value);
      },
      preventDefaultOnTerminator: true,
    });

    scanner.start();
    return () => scanner.stop();
  }, [open, processPayload]);
  return (
    <Modal
      open={open}
      title="Escanear QR ou codigo de barras"
      description="Use o scanner USB como leitura principal. A camera funciona como apoio quando o navegador suportar."
      size="md"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-noogym-lime/30 bg-noogym-lime/10 p-3 text-sm">
          <div className="flex items-start gap-3">
            <Barcode className="mt-0.5 h-5 w-5 text-noogym-lime" />
            <div>
              <p className="font-semibold text-noogym-lime">
                Scanner USB pronto
              </p>
              <p className="mt-1 text-zinc-300">
                Leia o cartao, codigo de barras ou QR do cliente. Se preferir,
                cole o codigo no campo abaixo.
              </p>
            </div>
          </div>
        </div>
        <div className="relative h-72 overflow-hidden rounded-lg border border-white/10 bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-noogym-lime/70 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
          <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/10 bg-black/70 px-3 py-2 text-sm text-zinc-200">
            {status}
          </div>
        </div>
        {result ? (
          <div className="rounded-lg border border-noogym-lime/40 bg-noogym-lime/10 p-4 text-sm">
            <p className="font-semibold text-noogym-lime">
              Check-in confirmado
            </p>
            <p className="mt-1">{result.clientName}</p>
            <p className="text-zinc-300">{result.dateTime}</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <FormTextarea
            label="Scanner USB ou codigo manual"
            value={manualPayload}
            onChange={(event) => setManualPayload(event.target.value)}
            placeholder="Leia com o scanner USB ou cole o Noogym ID, QR, barcode ou cartao..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              icon={<QrCode className="h-4 w-4" />}
              onClick={() => processPayload(manualPayload)}
            >
              Validar codigo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function NewCheckinModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const clients = useClientsStore((state) => state.clients);
  const addCheckin = useCheckinsStore((state) => state.addCheckin);
  const validateCheckin = useCheckinsStore((state) => state.validateCheckin);
  const addRevenue = useFinanceStore((state) => state.addRevenue);
  const [tab, setTab] = useState("Buscar cliente");
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateTime, setDateTime] = useState(dateTimeInputValue);
  const [checkinType, setCheckinType] = useState("Presencial");
  const [guestAmount, setGuestAmount] = useState("");
  const [guestPaymentMethod, setGuestPaymentMethod] = useState("Dinheiro");
  const [observation, setObservation] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const clientPageSize = 8;
  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleClients = clients
      .slice()
      .sort(
        (a, b) =>
          Number(b.status === "Ativo") - Number(a.status === "Ativo") ||
          a.name.localeCompare(b.name, "pt-AO"),
      );
    if (!normalizedQuery) return visibleClients;

    return visibleClients.filter((client) =>
      `${client.name} ${client.id} ${client.phone} ${client.email} ${client.document ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [clients, query]);
  const totalClientPages = Math.max(
    1,
    Math.ceil(filteredClients.length / clientPageSize),
  );
  const clientPageRows = useMemo(() => {
    const start = (clientPage - 1) * clientPageSize;
    return filteredClients.slice(start, start + clientPageSize);
  }, [clientPage, filteredClients]);
  const clientRangeStart = filteredClients.length
    ? (clientPage - 1) * clientPageSize + 1
    : 0;
  const clientRangeEnd = Math.min(
    clientPage * clientPageSize,
    filteredClients.length,
  );
  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ??
    clientPageRows[0] ??
    filteredClients[0];
  const selectedValidation = useMemo(() => {
    if (!selectedClient) return null;
    const parsedDate = new Date(dateTime);
    return validateCheckin({
      clientName: selectedClient.name,
      clientId: selectedClient.id,
      type: tab === "Check-in avulso" ? "Avulso" : checkinType,
      accessType: "Entrada",
      checkedAtIso: Number.isNaN(parsedDate.getTime())
        ? undefined
        : parsedDate.toISOString(),
    });
  }, [checkinType, dateTime, selectedClient, tab, validateCheckin]);

  useEffect(() => {
    if (!open) return;
    setTab("Buscar cliente");
    setQuery("");
    setSelectedClientId("");
    setDateTime(dateTimeInputValue());
    setCheckinType("Presencial");
    setGuestAmount("");
    setGuestPaymentMethod("Dinheiro");
    setObservation("");
    setClientPage(1);
  }, [open]);

  useEffect(() => {
    if (clientPage > totalClientPages) setClientPage(totalClientPages);
  }, [clientPage, totalClientPages]);

  const confirm = () => {
    if (!selectedClient) {
      toastInfo(
        "Sem clientes",
        "Cadastre um cliente antes de realizar check-in.",
      );
      return;
    }
    const parsedDate = new Date(dateTime);
    if (!dateTime || Number.isNaN(parsedDate.getTime())) {
      toastInfo("Data obrigatoria", "Selecione a data e hora do check-in.");
      return;
    }

    const payload = {
      clientName: selectedClient.name,
      clientId: selectedClient.id,
      type: tab === "Check-in avulso" ? "Avulso" : checkinType,
      accessType: "Entrada",
      dateTime: formatDateTimeLabel(dateTime),
      checkedAtIso: parsedDate.toISOString(),
      observation: observation.trim() || undefined,
    };
    const validation = validateCheckin(payload);
    if (!validation.allowed) {
      toastInfo(validation.title, validation.message);
      return;
    }
    if (!addCheckin(payload)) {
      toastInfo(
        "Check-in bloqueado",
        "Nao foi possivel registrar o check-in agora.",
      );
      return;
    }
    const guestValue =
      tab === "Check-in avulso" ? parseAmountInput(guestAmount) : 0;
    if (guestValue > 0) {
      addRevenue({
        category: "Entrada avulsa",
        value: guestValue,
        date: formatDateTimeLabel(dateTime),
        status: "Recebido",
        note: `${selectedClient.name} - check-in avulso`,
        memberId: selectedClient.id,
        method: guestPaymentMethod,
        paidAt: parsedDate.toISOString(),
      });
    }
    toastSuccess("Check-in realizado", "Resumo do dia atualizado.");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Novo check-in"
      description="Selecione o cliente e registre o check-in na unidade."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={confirm}>
            Confirmar check-in
          </Button>
        </>
      }
    >
      <Section title="1. Cliente">
        <div className="flex gap-6 border-b border-white/10 text-sm">
          {["Buscar cliente", "Check-in avulso"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`py-2 ${tab === item ? "border-b border-noogym-lime text-noogym-lime" : "text-zinc-400"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <FormInput
            label="Busca por nome, CPF/BI, telefone, e-mail ou codigo"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setClientPage(1);
              setSelectedClientId("");
            }}
            placeholder="Digite nome, BI, telefone ou codigo..."
          />
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300">
            <span className="block text-zinc-500">Clientes encontrados</span>
            <strong className="text-sm text-zinc-100">
              {filteredClients.length} de {clients.length}
            </strong>
          </div>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {filteredClients.length ? (
            clientPageRows.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition sm:gap-4 ${selectedClient?.id === client.id ? "border-noogym-lime bg-noogym-lime/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
              >
                <Avatar
                  label={client.avatar ?? "CL"}
                  className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{client.name}</p>
                    <Badge>{client.status}</Badge>
                  </div>
                  <p className="truncate text-sm text-zinc-400">
                    BI: {client.document ?? "-"} - {client.id}
                  </p>
                  <p className="truncate text-sm text-zinc-400">
                    {client.phone} - {client.plan}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-zinc-400 sm:block">
                  <span className="block">Ultimo check-in</span>
                  <strong className="font-medium text-zinc-200">
                    {client.lastCheckin ?? "Sem check-in"}
                  </strong>
                  <span className="mt-1 block">
                    Vence: {client.expires ?? "-"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
              Nenhum cliente encontrado com estes dados.
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-zinc-400">
          <span>
            Mostrando {clientRangeStart}-{clientRangeEnd} de{" "}
            {filteredClients.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Pagina anterior"
              disabled={clientPage <= 1}
              onClick={() => {
                setClientPage((page) => Math.max(1, page - 1));
                setSelectedClientId("");
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-zinc-200">
              {clientPage} / {totalClientPages}
            </span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Proxima pagina"
              disabled={clientPage >= totalClientPages}
              onClick={() => {
                setClientPage((page) => Math.min(totalClientPages, page + 1));
                setSelectedClientId("");
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {selectedClient ? (
          <div
            className={`rounded-md border p-3 text-sm ${selectedValidation?.allowed ? "border-noogym-lime/30 bg-noogym-lime/10 text-zinc-200" : "border-red-400/30 bg-red-500/10 text-red-100"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{selectedClient.name}</span>
              <span>
                {selectedValidation?.allowed
                  ? "Liberado para check-in"
                  : selectedValidation?.title}
              </span>
            </div>
            {!selectedValidation?.allowed ? (
              <p className="mt-1 text-xs opacity-90">
                {selectedValidation?.message}
              </p>
            ) : null}
          </div>
        ) : null}
        {tab === "Check-in avulso" ? (
          <div className="rounded-lg border border-noogym-lime/25 bg-noogym-lime/10 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput
                label="Valor pago pela entrada avulsa"
                inputMode="decimal"
                value={guestAmount}
                onChange={(event) => setGuestAmount(event.target.value)}
                placeholder="0"
              />
              <FormSelect
                label="Metodo de pagamento"
                value={guestPaymentMethod}
                onChange={(event) => setGuestPaymentMethod(event.target.value)}
                options={[
                  "Dinheiro",
                  "Cartao",
                  "Transferencia",
                  "TPA",
                  "Outro",
                ]}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-300">
              Quando informado, o valor sera lancado em Financas como receita de
              Entrada avulsa.
            </p>
          </div>
        ) : null}
      </Section>
      <Section title="2. Detalhes do check-in">
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Data e hora"
            type="datetime-local"
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
          />
          <FormSelect
            label="Tipo de check-in"
            value={checkinType}
            onChange={(event) => setCheckinType(event.target.value)}
            options={["Presencial", "QR Code", "App", "Manual"]}
          />
        </div>
        <FormTextarea
          label="Observacao opcional"
          value={observation}
          onChange={(event) => setObservation(event.target.value)}
          placeholder="Adicione uma observacao, se necessario..."
        />
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
          Este check-in sera contabilizado no plano do cliente conforme as
          regras de acesso da unidade.
        </div>
      </Section>
    </Modal>
  );
}

export function MessageModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const clients = useClientsStore((state) => state.clients);
  const token = useAuthStore((state) => state.accessToken);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const [recipientMode, setRecipientMode] = useState("Todos");
  const [channel, setChannel] = useState("WhatsApp");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const channelValue =
    channel === "E-mail" ? "EMAIL" : channel === "SMS" ? "SMS" : "WHATSAPP";
  const recipientClients = clients.filter((client) => {
    if (recipientMode === "Por status") return client.status !== "Ativo";
    return client.status === "Ativo";
  });
  const memberIds = recipientClients
    .map((client) => remoteIdOf(client, ["CLI"]))
    .filter((id): id is string => Boolean(id));

  useEffect(() => {
    if (!open) return;
    setRecipientMode("Todos");
    setChannel("WhatsApp");
    setContent("");
    setSending(false);
  }, [open]);

  const send = async () => {
    if (!onlineOnly || !token) {
      toastInfo(
        "Mensagens online indisponiveis",
        "Entre no web-admin conectado a API para registrar envios.",
      );
      return;
    }
    if (!content.trim()) {
      toastInfo("Mensagem obrigatoria", "Escreva o conteudo antes de enviar.");
      return;
    }
    if (!memberIds.length) {
      toastInfo(
        "Sem destinatarios sincronizados",
        "Os destinatarios precisam estar carregados da API antes do envio.",
      );
      return;
    }

    setSending(true);
    try {
      const message = await apiRequest<{ id: string }>("/messages", {
        method: "POST",
        token,
        body: {
          title: `Comunicado ${channel}`,
          content: `${content.trim()}\n\nBaixe o app Noogym para acompanhar treinos, pagamentos e check-ins.`,
          channel: channelValue,
          status: "DRAFT",
          memberIds,
        },
      });
      const sent = await apiRequest<{ status?: string }>(
        `/messages/${message.id}/send`,
        { method: "PATCH", token },
      );
      if (sent.status === "FAILED") {
        toastError("Mensagem nao enviada", "A API registou falha na entrega.");
        return;
      }
      if (channelValue === "EMAIL" && sent.status === "SCHEDULED") {
        toastSuccess(
          "E-mail em fila",
          `${memberIds.length} destinatario(s) processados pela API.`,
        );
        onClose();
        return;
      }
      toastSuccess(
        channelValue === "EMAIL" ? "E-mail enviado" : "Mensagem registrada",
        `${memberIds.length} destinatario(s) processados pela API.`,
      );
      onClose();
    } catch (error) {
      toastError(
        "Mensagem nao enviada",
        error instanceof Error ? error.message : "A API nao confirmou o envio.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal
      open={open}
      title="Enviar mensagem"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={sending} onClick={send}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <FormSelect
          label="Destinatarios"
          value={recipientMode}
          onChange={(event) => setRecipientMode(event.target.value)}
          options={["Todos", "Por status"]}
        />
        <FormSelect
          label="Canal"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          options={["WhatsApp", "E-mail", "SMS"]}
        />
        <FormTextarea
          label="Mensagem"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escreva a mensagem em portugues..."
        />
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-300">
          {memberIds.length} destinatario(s) sincronizados. O rodape do app sera
          incluido automaticamente.
        </div>
      </div>
    </Modal>
  );
}

export function NewClientModal({
  open,
  client,
  onClose,
}: {
  open: boolean;
  client?: ClientRecord | null;
  onClose: () => void;
}) {
  const addClient = useClientsStore((state) => state.addClient);
  const updateClient = useClientsStore((state) => state.updateClient);
  const plans = usePlansStore((state) => state.plans);
  const activeGymId = useAppStore((state) => state.activeGymId);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const token = useAuthStore((state) => state.accessToken);
  const [identityLookup, setIdentityLookup] = useState("");
  const [identityResult, setIdentityResult] =
    useState<IdentityLinkResult | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [document, setDocument] = useState("");
  const [gender, setGender] = useState("Selecione");
  const [maritalStatus, setMaritalStatus] = useState("Selecione");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Luanda");
  const [country, setCountry] = useState("Angola");
  const [postalCode, setPostalCode] = useState("");
  const [profession, setProfession] = useState("");
  const [source, setSource] = useState("Indicação");
  const [goal, setGoal] = useState("Hipertrofia");
  const [observations, setObservations] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const activePlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.status !== "Inativo" && planAvailableForGym(plan, activeGymId),
      ),
    [activeGymId, plans],
  );
  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId);
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const isEditing = Boolean(client);

  useEffect(() => {
    if (!open) return;
    setIdentityLookup("");
    setIdentityResult(null);
    setIdentityLoading(false);
    setName(client?.name ?? "");
    setEmail(client?.email ?? "");
    setPhone(client?.phone ?? "");
    setBirthDate(client?.birthDate ?? "");
    setDocument(client?.document ?? "");
    setGender(client?.gender ?? "Selecione");
    setMaritalStatus(client?.maritalStatus ?? "Selecione");
    setAddress(client?.address ?? "");
    setCity(client?.city ?? "");
    setProvince(client?.province ?? "Luanda");
    setCountry(client?.country ?? "Angola");
    setPostalCode(client?.postalCode ?? "");
    setProfession(client?.profession ?? "");
    setSource(client?.source ?? "Indicação");
    setGoal(client?.goal ?? "Hipertrofia");
    setObservations(client?.observations ?? "");
    setStatus(client?.status ?? "Ativo");
    setSelectedPlanId(
      client?.planId ??
        activePlans.find((plan) => plan.name === client?.plan)?.id ??
        "",
    );
  }, [activePlans, client, open]);

  const birthdayLabel = birthDate
    ? new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "short" })
        .format(new Date(`${birthDate}T00:00:00`))
        .replace(".", "")
    : undefined;

  const applyIdentity = (result: IdentityLinkResult) => {
    const identity = result.identity;
    const barcodeAlias = identity.aliases?.find(
      (alias) => alias.type === "BARCODE",
    );
    const cardAlias = identity.aliases?.find((alias) => alias.type === "CARD");
    setIdentityResult(result);
    setName(identity.name ?? "");
    setEmail(identity.email ?? "");
    setPhone(identity.phone ?? "");
    setBirthDate(identity.birthDate ? identity.birthDate.slice(0, 10) : "");
    setDocument(identity.documentNumber ?? "");
    setObservations((current) => {
      const accessCode = barcodeAlias?.value ?? cardAlias?.value;
      if (!accessCode || current.includes("Codigo de acesso:")) return current;
      return [current, `Codigo de acesso: ${accessCode}`]
        .filter(Boolean)
        .join("\n");
    });
    if (identity.gender === "FEMALE") setGender("Feminino");
    if (identity.gender === "MALE") setGender("Masculino");
    if (identity.gender === "OTHER") setGender("Outro");
  };

  const resolveIdentity = async () => {
    if (!onlineOnly || !token) {
      toastInfo(
        "Vinculacao indisponivel",
        "Entre no web-admin conectado a API para buscar contas Noogym.",
      );
      return;
    }
    if (!identityLookup.trim()) {
      toastInfo(
        "Informe o identificador",
        "Digite o Noogym ID, leia o QR, codigo de barras ou cartao.",
      );
      return;
    }
    setIdentityLoading(true);
    try {
      const result = await resolveNoogymIdentity(token, identityLookup.trim());
      applyIdentity(result);
      toastSuccess(
        "Conta Noogym encontrada",
        result.existingMember
          ? "Este aluno ja tinha cadastro nesta organizacao."
          : "Dados prontos para cadastro rapido.",
      );
    } catch (error) {
      setIdentityResult(null);
      toastInfo(
        "Conta Noogym nao encontrada",
        error instanceof Error
          ? error.message
          : "Confirme o Noogym ID, QR, codigo de barras ou cartao apresentado pelo aluno.",
      );
    } finally {
      setIdentityLoading(false);
    }
  };

  const save = () => {
    if (!name.trim() || !phone.trim()) {
      toastInfo("Campos obrigatórios", "Informe pelo menos nome e telefone.");
      return;
    }
    if (!birthDate) {
      toastInfo("Campos obrigatórios", "Informe a data de nascimento.");
      return;
    }
    const payload: Partial<ClientRecord> = {
      name: name.trim(),
      email:
        email.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
      phone: phone.trim(),
      plan: selectedPlan?.name ?? "Sem plano",
      planId: selectedPlan?.id,
      planTone: selectedPlan ? "lime" : "gray",
      status,
      birthday: birthdayLabel ?? client?.birthday,
      birthDate,
      document: document.trim() || undefined,
      gender,
      maritalStatus,
      address: address.trim(),
      city: city.trim(),
      province,
      country,
      postalCode: postalCode.trim(),
      profession: profession.trim(),
      source,
      goal,
      observations: observations.trim(),
      noogymIdentityId: identityResult?.identity.id,
      noogymId: identityResult?.identity.noogymId,
      accessCode:
        identityResult?.identity.aliases?.find(
          (alias) => alias.type === "BARCODE",
        )?.value ??
        identityResult?.identity.aliases?.find((alias) => alias.type === "CARD")
          ?.value,
      appLinked: Boolean(identityResult?.identity.id),
    };

    const saved = client
      ? updateClient(client.id, payload)
      : addClient(payload);
    if (!saved) {
      toastInfo(
        "Cliente ja cadastrado",
        "Ja existe cliente com este e-mail, telefone ou BI.",
      );
      return;
    }

    toastSuccess(
      client ? "Cliente atualizado com sucesso" : "Cliente criado com sucesso",
    );
    onClose();
  };
  return (
    <Modal
      open={open}
      title={isEditing ? "Editar cliente" : "Novo cliente"}
      description={
        isEditing
          ? "Atualize as informações cadastrais do cliente."
          : "Preencha as informações para cadastrar um novo cliente."
      }
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {isEditing ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!isEditing ? (
          <Section title="Conta Noogym">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <FormInput
                label="Noogym ID, QR, codigo de barras ou cartao"
                value={identityLookup}
                onChange={(event) => setIdentityLookup(event.target.value)}
                placeholder="Ex: NG-123456, 930000000001 ou payload do QR"
              />
              <div className="flex items-end">
                <Button disabled={identityLoading} onClick={resolveIdentity}>
                  {identityLoading ? "Buscando..." : "Buscar conta"}
                </Button>
              </div>
            </div>
            {identityResult ? (
              <div className="rounded-md border border-noogym-lime/30 bg-noogym-lime/10 p-3 text-sm text-zinc-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{identityResult.identity.name}</strong>
                  <span className="text-noogym-lime">
                    {identityResult.identity.noogymId}
                  </span>
                </div>
                {identityResult.identity.aliases?.length ? (
                  <p className="mt-1 text-xs text-zinc-300">
                    Identificadores:{" "}
                    {identityResult.identity.aliases
                      .map((alias) => `${alias.type}: ${alias.value}`)
                      .join(" | ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-300">
                  {identityResult.existingMember
                    ? "Cadastro encontrado e pronto para atualizar o vinculo com esta unidade."
                    : "Dados importados do app para cadastro rapido."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-300">
                Se o aluno ainda nao tem app, cadastre normalmente; apos salvar,
                o Noogym registra convite por WhatsApp, SMS e e-mail quando
                houver contacto.
              </div>
            )}
          </Section>
        ) : null}
        <Section title="1. Dados pessoais">
          <div className="grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)]">
            <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-center text-sm text-zinc-400">
              Foto opcional
              <br />
              PNG, JPG até 5MB
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <FormInput
                className="xl:col-span-4"
                label="Nome completo"
                requiredMark
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Digite o nome completo"
              />
              <FormInput
                className="xl:col-span-2"
                label="Data de nascimento"
                requiredMark
                type="date"
                max={maxBirthDate}
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
              <FormInput
                className="xl:col-span-3"
                label="E-mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@exemplo.com"
              />
              <FormInput
                className="xl:col-span-3"
                label="Telefone"
                requiredMark
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+244 9XX XXX XXX"
              />
              <FormInput
                className="xl:col-span-3"
                label="Documento/BI"
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                placeholder="000000000LA000"
              />
              <FormSelect
                className="xl:col-span-3"
                label="Sexo"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                options={["Selecione", "Feminino", "Masculino", "Outro"]}
              />
              <FormSelect
                className="xl:col-span-3"
                label="Estado civil"
                value={maritalStatus}
                onChange={(event) => setMaritalStatus(event.target.value)}
                options={["Selecione", "Solteiro(a)", "Casado(a)", "Outro"]}
              />
              <FormSelect
                className="xl:col-span-3"
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={[
                  "Ativo",
                  "Inativo",
                  "Em atraso",
                  "Bloqueado",
                  "Cancelado",
                ]}
              />
            </div>
          </div>
        </Section>
        <Section title="2. Endereço">
          <div className="grid gap-3 md:grid-cols-3">
            <FormInput
              label="Endereço"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Rua, número, bairro"
            />
            <FormInput
              label="Cidade"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Luanda"
            />
            <FormSelect
              label="Província"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              options={["Luanda", "Benguela", "Huíla", "Huambo", "Cabinda"]}
            />
            <FormSelect
              label="País"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              options={["Angola"]}
            />
            <FormInput
              label="Código postal"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="0000-000"
            />
          </div>
        </Section>
        <Section title="3. Vinculo com plano">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
            <FormSelect
              label="Plano existente"
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
            >
              <option value="">Sem plano</option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Preco"
              value={selectedPlan?.price ?? "Sem cobranca"}
              readOnly
            />
            <FormInput
              label="Duracao"
              value={selectedPlan?.duration ?? "-"}
              readOnly
            />
          </div>
        </Section>
        <Section title="4. Informações adicionais">
          <div className="grid gap-3 md:grid-cols-3">
            <FormInput
              label="Profissão"
              value={profession}
              onChange={(event) => setProfession(event.target.value)}
            />
            <FormSelect
              label="Como conheceu a academia?"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              options={[
                "Indicação",
                "Redes sociais",
                "Publicidade",
                "Passou pela unidade",
              ]}
            />
            <FormSelect
              label="Objetivo principal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              options={[
                "Hipertrofia",
                "Emagrecimento",
                "Saúde",
                "Condicionamento",
              ]}
            />
          </div>
          <FormTextarea
            label="Observações"
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            placeholder="Adicione observações sobre o cliente..."
          />
          {!isEditing ? (
            <FormCheckbox
              label="Enviar boas-vindas por e-mail ou WhatsApp"
              defaultChecked
            />
          ) : null}
        </Section>
      </div>
    </Modal>
  );
}

export function ProductFormModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product?: ProductRecord;
  onClose: () => void;
}) {
  const addProduct = useProductsStore((state) => state.addProduct);
  const updateProduct = useProductsStore((state) => state.updateProduct);
  const productCategories = useProductsStore((state) => state.categories);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Suplementos");
  const [barcode, setBarcode] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("Unidade");
  const [controlStock, setControlStock] = useState(true);
  const [minStock, setMinStock] = useState("10");
  const [active, setActive] = useState(product?.status !== "Inativo");
  const categoryOptions = useMemo(
    () =>
      productCategories
        .filter((item) => item.status !== "Inativo")
        .map((item) => item.name),
    [productCategories],
  );

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setCategory(product?.category ?? categoryOptions[0] ?? "Suplementos");
    setBarcode(product?.barcode ?? "");
    setSku(product?.sku ?? product?.id ?? "");
    setDescription(
      product?.description ?? "Produto para venda no POS da unidade.",
    );
    setPrice(String(product?.price ?? ""));
    setCost(String(product?.cost ?? ""));
    setStock(String(product?.stock ?? ""));
    setUnit(product?.unit ?? "Unidade");
    setControlStock(true);
    setMinStock(String(product?.minStock ?? 10));
    setActive(product?.status !== "Inativo");
  }, [categoryOptions, open, product]);

  const save = () => {
    const parsedPrice = parseNumericInput(price);
    const parsedCost = parseNumericInput(cost);
    const parsedStock = parseNumericInput(stock);
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome do produto.");
      return;
    }
    if (parsedPrice <= 0) {
      toastInfo("Preco invalido", "Informe um preco de venda maior que zero.");
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      barcode: barcode.trim() || undefined,
      sku: sku.trim() || undefined,
      stock: controlStock ? Math.max(0, Math.round(parsedStock)) : 0,
      price: parsedPrice,
      cost: Math.max(0, parsedCost),
      description: description.trim() || undefined,
      unit,
      minStock: Math.max(0, Math.round(parseNumericInput(minStock))),
      emoji: product?.emoji ?? name.trim().slice(0, 3).toUpperCase(),
      status: active ? "Ativo" : "Inativo",
    };

    if (product) updateProduct(product.id, payload);
    else addProduct(payload);
    toastSuccess(
      product ? "Produto atualizado com sucesso" : "Produto criado com sucesso",
    );
    onClose();
  };
  return (
    <Modal
      open={open}
      title={product ? "Editar produto" : "Novo produto"}
      description={
        product
          ? "Altere as informações do produto abaixo."
          : "Preencha as informações para cadastrar um novo produto."
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {product ? "Salvar alterações" : "Salvar produto"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Informacoes basicas">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome do produto"
              requiredMark
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Whey Protein 900g"
            />
            <FormSelect
              label="Categoria"
              requiredMark
              options={
                categoryOptions.length ? categoryOptions : ["Suplementos"]
              }
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <FormInput
              label="Codigo de barras"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
            />
            <FormInput
              label="SKU"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
            />
          </div>
          <FormTextarea
            label="Descricao"
            placeholder="Descreva o produto..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Section>
        <Section title="2. Preco e estoque">
          <div className="grid grid-cols-4 gap-3">
            <FormInput
              label="Preco de venda (Kz)"
              requiredMark
              type="number"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <FormInput
              label="Preco de custo (Kz)"
              requiredMark
              type="number"
              min="0"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
            <FormInput
              label="Estoque atual"
              requiredMark
              type="number"
              min="0"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
            <FormSelect
              label="Unidade"
              requiredMark
              options={["Unidade", "Caixa", "Pacote", "Kg", "Litro"]}
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSwitch
              label="Controlar estoque"
              checked={controlStock}
              onChange={setControlStock}
            />
            <FormInput
              label="Estoque minimo"
              type="number"
              min="0"
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
            />
          </div>
        </Section>
        <Section title="3. Imagem do produto (opcional)">
          <div className="grid grid-cols-[1fr_130px] gap-3">
            <FileUpload label="Clique para enviar ou arraste a imagem aqui" />
            <div className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-zinc-400">
              Pré-visualização
            </div>
          </div>
        </Section>
        <Section title="4. Status">
          <FormSwitch
            label="Produto ativo"
            description="Produtos inativos não ficam visíveis nas vendas POS."
            checked={active}
            onChange={setActive}
          />
        </Section>
      </div>
    </Modal>
  );
}

export function StockMovementModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product?: ProductRecord;
  onClose: () => void;
}) {
  const adjustStock = useProductsStore((state) => state.adjustStock);
  const [type, setType] = useState<"Entrada" | "Saida" | "Ajuste">("Entrada");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const nextStock = useMemo(() => {
    const current = product?.stock ?? 0;
    const value = Math.max(0, Math.round(parseNumericInput(quantity)));
    if (type === "Entrada") return current + value;
    if (type === "Saida") return Math.max(0, current - value);
    return value;
  }, [product, quantity, type]);

  useEffect(() => {
    if (!open) return;
    setType("Entrada");
    setQuantity("");
    setReason("");
  }, [open, product]);

  const save = () => {
    if (!product) return;
    const parsedQuantity = Math.max(0, Math.round(parseNumericInput(quantity)));
    if (type !== "Ajuste" && parsedQuantity <= 0) {
      toastInfo(
        "Quantidade invalida",
        "Informe uma quantidade maior que zero.",
      );
      return;
    }
    adjustStock(
      product.id,
      type,
      parsedQuantity,
      reason.trim() || `${type} manual`,
    );
    toastSuccess("Estoque atualizado com sucesso");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Movimentar estoque"
      description={product ? product.name : undefined}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar movimento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(["Entrada", "Saida", "Ajuste"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-md border px-3 py-3 text-sm font-medium ${type === option ? "border-noogym-lime bg-noogym-lime text-black" : "border-white/10 bg-white/[0.03] text-zinc-200"}`}
              onClick={() => setType(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label={type === "Ajuste" ? "Novo estoque" : "Quantidade"}
            type="number"
            min="0"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <FormInput label="Estoque final" value={String(nextStock)} readOnly />
        </div>
        <FormTextarea
          label="Motivo"
          placeholder="Ex: reposicao, perda, conferencia..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
          Estoque atual:{" "}
          <strong className="text-white">
            {product?.stock ?? 0} {product?.unit ?? "un"}
          </strong>
        </div>
      </div>
    </Modal>
  );
}

export function PlanFormModal({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan?: PlanRecord;
  onClose: () => void;
}) {
  const addPlan = usePlansStore((state) => state.addPlan);
  const updatePlan = usePlansStore((state) => state.updatePlan);
  const categories = usePlansStore((state) => state.categories);
  const gyms = useSettingsStore((state) => state.gyms);
  const activeGymId = useAppStore((state) => state.activeGymId);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Musculação");
  const [type, setType] = useState("Recorrente");
  const [description, setDescription] = useState("");
  const [normalPrice, setNormalPrice] = useState("");
  const [duration, setDuration] = useState("Mensal");
  const [active, setActive] = useState(true);
  const [showInApp, setShowInApp] = useState(true);
  const [autoRenew, setAutoRenew] = useState(true);
  const [color, setColor] = useState("#B6FF00");
  const [accessDays, setAccessDays] = useState<string[]>(defaultPlanWeekDays);
  const [availabilityMode, setAvailabilityMode] =
    useState<PlanAvailabilityMode>("all");
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const activeGyms = useMemo(
    () => gyms.filter((gym) => gym.isActive !== false),
    [gyms],
  );
  const activeGymName = activeGyms.find((gym) => gym.id === activeGymId)?.name;

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? "");
    setCategory(plan?.category ?? categories[0] ?? "Musculação");
    setType(plan?.type ?? "Recorrente");
    setDescription(plan?.description ?? "");
    setNormalPrice(moneyInputValue(plan?.price));
    setDuration(plan?.duration ?? "Mensal");
    setActive(plan?.status !== "Inativo");
    setShowInApp(true);
    setAutoRenew(true);
    setColor(plan?.color ?? "#B6FF00");
    setAccessDays(
      plan?.accessDays?.length ? plan.accessDays : defaultPlanWeekDays,
    );
    if (plan) {
      const planGymIds = plan.gymIds ?? [];
      setSelectedGymIds(planGymIds);
      setAvailabilityMode(
        !planGymIds.length
          ? "all"
          : activeGymId &&
              planGymIds.length === 1 &&
              planGymIds[0] === activeGymId
            ? "current"
            : "selected",
      );
    } else {
      setSelectedGymIds(activeGymId ? [activeGymId] : []);
      setAvailabilityMode(activeGymId ? "current" : "all");
    }
  }, [activeGymId, categories, open, plan]);

  const save = () => {
    const parsedPrice = parseNumericInput(normalPrice);
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome do plano.");
      return;
    }
    if (parsedPrice <= 0) {
      toastInfo("Preco invalido", "Informe o preco normal do plano.");
      return;
    }
    const gymIds =
      availabilityMode === "all"
        ? []
        : availabilityMode === "current" && activeGymId
          ? [activeGymId]
          : selectedGymIds;
    if (availabilityMode !== "all" && !gymIds.length) {
      toastInfo(
        "Unidade obrigatoria",
        "Selecione pelo menos uma unidade para disponibilizar o plano.",
      );
      return;
    }

    const payload = {
      name: name.trim(),
      description,
      category,
      price: formatPlanPrice(parsedPrice, duration),
      duration,
      type,
      status: active ? "Ativo" : "Inativo",
      color,
      accessDays,
      gymIds,
    };

    if (plan) updatePlan(plan.id, payload);
    else addPlan(payload);
    toastSuccess(
      plan ? "Plano atualizado com sucesso" : "Plano criado com sucesso",
    );
    onClose();
  };
  return (
    <Modal
      open={open}
      title={plan ? "Editar plano" : "Novo plano"}
      description="Preencha as informações do plano."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {plan ? "Salvar alterações" : "Salvar plano"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Informacoes basicas">
          <div className="grid grid-cols-3 gap-3">
            <FormInput
              label="Nome do plano"
              requiredMark
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormSelect
              label="Categoria"
              requiredMark
              options={categories.length ? categories : ["Musculação"]}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <FormSelect
              label="Tipo de plano"
              requiredMark
              options={["Recorrente", "Avulso", "Pré-pago", "Corporativo"]}
              value={type}
              onChange={(event) => setType(event.target.value)}
            />
          </div>
          <FormTextarea
            label="Descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Section>
        <Section title="2. Disponibilidade por unidade">
          <div className="grid gap-2 md:grid-cols-3">
            {[
              {
                id: "all" as const,
                label: "Todas as unidades",
                description: "Plano global da organizacao.",
              },
              {
                id: "current" as const,
                label: activeGymName ?? "Unidade atual",
                description: "Disponivel apenas na unidade selecionada.",
              },
              {
                id: "selected" as const,
                label: "Selecionar unidades",
                description: "Escolha uma ou mais unidades.",
              },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={option.id === "current" && !activeGymId}
                onClick={() => setAvailabilityMode(option.id)}
                className={`min-h-20 rounded-md border p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${availabilityMode === option.id ? "border-noogym-lime bg-noogym-lime/12 text-white" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20"}`}
              >
                <span className="block font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-zinc-400">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
          {availabilityMode === "selected" ? (
            <div className="grid gap-2 md:grid-cols-2">
              {activeGyms.map((gym) => (
                <FormCheckbox
                  key={gym.id}
                  label={gym.name}
                  description={`${gym.city ?? "Unidade"}${gym.province ? ` - ${gym.province}` : ""}`}
                  checked={selectedGymIds.includes(gym.id)}
                  onChange={(event) =>
                    setSelectedGymIds((ids) =>
                      event.target.checked
                        ? [...ids, gym.id]
                        : ids.filter((id) => id !== gym.id),
                    )
                  }
                />
              ))}
            </div>
          ) : null}
          <p className="text-xs text-zinc-400">
            Planos globais aparecem em todas as unidades. Planos por unidade
            aparecem apenas quando essa unidade estiver selecionada.
          </p>
        </Section>
        <Section title="3. Preco e duracao">
          <div className="grid grid-cols-4 gap-3">
            <FormInput
              label="Preco normal (Kz)"
              requiredMark
              type="number"
              min="0"
              value={normalPrice}
              onChange={(event) => setNormalPrice(event.target.value)}
            />
            <FormInput label="Preco promocional (Kz)" type="number" min="0" />
            <FormSelect
              label="Duracao"
              requiredMark
              options={["Mensal", "Trimestral", "Semestral", "Anual"]}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <FormSelect
              label="Periodo de cobranca"
              requiredMark
              options={["Mensal", "Trimestral", "Anual"]}
              value={duration === "Semestral" ? "Mensal" : duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <FormInput label="Taxa de matricula (Kz)" defaultValue="0" />
            <FormSelect
              label="Dia do vencimento"
              options={["1", "5", "10", "15", "20", "30"]}
            />
          </div>
        </Section>
        <Section title="4. Acesso e limitações">
          <div className="grid grid-cols-3 gap-3">
            <FormSelect
              label="Acesso à academia"
              options={["Livre", "Limitado", "Não incluso"]}
            />
            <FormSelect
              label="Acesso a aulas"
              options={["Todas", "Limitadas", "Não incluso"]}
            />
            <FormSelect label="Acesso a treinos" options={["Sim", "Não"]} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-200">Dias por semana</span>
                <span className="text-xs text-zinc-400">
                  {accessDays.length
                    ? accessDays.join(", ")
                    : "Nenhum dia selecionado"}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {planWeekDays.map((day) => {
                  const selected = accessDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`h-10 rounded-md border text-sm font-medium transition ${selected ? "border-noogym-lime bg-noogym-lime text-black" : "border-white/10 bg-black/20 text-zinc-300 hover:border-noogym-lime/60"}`}
                      onClick={() =>
                        setAccessDays((days) =>
                          selected
                            ? days.filter((item) => item !== day)
                            : [...days, day],
                        )
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200"
                  onClick={() => setAccessDays(defaultPlanWeekDays)}
                >
                  Dias úteis
                </button>
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200"
                  onClick={() => setAccessDays(planWeekDays)}
                >
                  Todos os dias
                </button>
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200"
                  onClick={() => setAccessDays([])}
                >
                  Limpar
                </button>
              </div>
            </div>
            <FormSelect
              label="Horário de acesso"
              options={["Horário livre", "Manhã", "Tarde", "Noite"]}
            />
          </div>
          <FormSwitch
            label="Permitir congelamento do plano"
            checked={true}
            onChange={() => undefined}
          />
        </Section>
        <Section title="5. Configuracoes adicionais">
          <div className="grid grid-cols-3 gap-3">
            <FormSwitch
              label="Plano ativo"
              checked={active}
              onChange={setActive}
            />
            <FormSwitch
              label="Exibir no app do aluno"
              checked={showInApp}
              onChange={setShowInApp}
            />
            <FormSwitch
              label="Permitir renovacao automatica"
              checked={autoRenew}
              onChange={setAutoRenew}
            />
          </div>
        </Section>
        <Section title="6. Imagem e cor do plano">
          <div className="grid grid-cols-[1fr_260px] gap-3">
            <FileUpload label="Clique para enviar ou arraste a imagem aqui" />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>Cor do plano</span>
                <span className="inline-flex items-center gap-2 text-zinc-300">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                </span>
              </div>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>
        </Section>
      </div>
    </Modal>
  );
}

export function CategoryModal({
  open,
  title = "Nova categoria",
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  title?: string;
  category?: PlanCategory | null;
  onClose: () => void;
  onSave?: (category: PlanCategoryInput) => boolean;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Musculação");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [order, setOrder] = useState("1");
  const [color, setColor] = useState("#B6FF00");

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setIcon(category?.icon ?? "Musculação");
    setDescription(category?.description ?? "");
    setActive(category?.status !== "Inativo");
    setOrder(String(category?.order ?? 1));
    setColor(category?.color ?? "#B6FF00");
  }, [category, open]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da categoria.");
      return;
    }
    const created = onSave
      ? onSave({
          name,
          icon,
          description: description.trim() || undefined,
          color,
          status: active ? "Ativo" : "Inativo",
          order: Number(order) || 1,
        })
      : true;
    if (!created) {
      toastInfo(
        "Categoria ja existe",
        "Escolha outro nome para esta categoria.",
      );
      return;
    }
    toastSuccess(
      category
        ? "Categoria atualizada com sucesso"
        : "Categoria criada com sucesso",
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      description="Crie uma nova categoria para organizar os registos."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {category ? "Salvar categoria" : "Criar categoria"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Informações da categoria">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome da categoria"
              requiredMark
              placeholder="Ex: Musculação"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormSelect
              label="Ícone da categoria"
              requiredMark
              options={["Musculação", "Cardio", "Produto", "Aula", "Plano"]}
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
            />
          </div>
          <FormTextarea
            label="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Section>
        <Section title="2. Configurações">
          <div className="grid grid-cols-2 gap-3">
            <FormSwitch
              label="Status da categoria"
              checked={active}
              onChange={setActive}
            />
            <FormInput
              label="Ordem de exibição"
              type="number"
              min="1"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
              <span>Cor da categoria</span>
              <span className="inline-flex items-center gap-2 text-zinc-200">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {color}
              </span>
            </div>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

const parseSaleAmount = (value: string, subtotal: number) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;
  if (normalized.endsWith("%")) {
    const percent = Number(normalized.slice(0, -1));
    return Number.isFinite(percent)
      ? Math.max(0, subtotal * (percent / 100))
      : 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const moneyLabel = (value: number) =>
  `${Math.round(value).toLocaleString("pt-AO")} Kz`;

function ClientAutocomplete({
  clients,
  value,
  onChange,
  requireCustomer,
}: {
  clients: ClientRecord[];
  value: string;
  onChange: (value: string) => void;
  requireCustomer?: boolean;
}) {
  const selected = clients.find((client) => client.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleClients = useMemo(() => {
    if (!normalizedQuery) return clients.slice(0, 8);
    return clients
      .filter((client) =>
        `${client.name} ${client.phone} ${client.email} ${client.document ?? ""} ${client.plan}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [clients, normalizedQuery]);

  useEffect(() => {
    setQuery(
      selected?.name ??
        (value === "final" && !requireCustomer ? "Consumidor final" : ""),
    );
  }, [requireCustomer, selected?.name, value]);

  const choose = (clientId: string) => {
    onChange(clientId);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm text-zinc-300">
        {requireCustomer ? "Cliente obrigatorio" : "Cliente"}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          className="h-10 w-full rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value.trim() && !requireCustomer)
              onChange("final");
          }}
          onFocus={() => {
            setOpen(true);
            if (value === "final") setQuery("");
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
            if (!query.trim())
              setQuery(
                selected?.name ?? (requireCustomer ? "" : "Consumidor final"),
              );
          }}
          placeholder={
            requireCustomer
              ? "Escreva nome, telefone, email ou BI"
              : "Consumidor final ou procurar cliente"
          }
        />
      </div>
      {open ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-md border border-white/10 bg-[#0b0f10] p-1 shadow-2xl">
          {!requireCustomer ? (
            <button
              type="button"
              className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition hover:bg-white/10 ${value === "final" ? "text-noogym-lime" : "text-zinc-100"}`}
              onMouseDown={(event) => {
                event.preventDefault();
                choose("final");
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs">
                CF
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  Consumidor final
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  Venda sem cliente associado
                </span>
              </span>
              {value === "final" ? <Check className="h-4 w-4" /> : null}
            </button>
          ) : null}
          {visibleClients.length ? (
            visibleClients.map((client) => (
              <button
                key={client.id}
                type="button"
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition hover:bg-white/10 ${value === client.id ? "text-noogym-lime" : "text-zinc-100"}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(client.id);
                }}
              >
                <Avatar
                  label={client.avatar ?? client.name.slice(0, 2).toUpperCase()}
                  className="h-8 w-8 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {client.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {client.phone} · {client.plan}
                  </span>
                </span>
                {value === client.id ? <Check className="h-4 w-4" /> : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-zinc-400">
              Nenhum cliente encontrado.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function FinalizeSaleModal({
  open,
  total,
  items,
  initialSaleType = "Venda normal",
  editingSale,
  requireCustomer = false,
  cashSessionId,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  total: number;
  items: SaleItemRecord[];
  initialSaleType?: string;
  editingSale?: SaleRecord | null;
  requireCustomer?: boolean;
  cashSessionId?: string;
  onClose: () => void;
  onConfirmed: (saleType: string, sale?: SaleRecord) => void;
}) {
  const addSale = useSalesStore((state) => state.addSale);
  const updateSale = useSalesStore((state) => state.updateSale);
  const clients = useClientsStore((state) => state.clients);
  const updateClient = useClientsStore((state) => state.updateClient);
  const employees = useEmployeesStore((state) => state.employees);
  const authUser = useAuthStore((state) => state.user);
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [tax, setTax] = useState("0");
  const [customerId, setCustomerId] = useState("final");
  const [seller, setSeller] = useState("Admin");
  const [saleType, setSaleType] = useState("Venda normal");
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] =
    useState("Transferencia");
  const [primaryAmount, setPrimaryAmount] = useState("");
  const [secondaryAmount, setSecondaryAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [dateTime, setDateTime] = useState(dateTimeInputValue);
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const discountAmount = parseSaleAmount(discount, total);
  const taxAmount = parseSaleAmount(tax, total);
  const finalTotal = Math.max(0, total - discountAmount + taxAmount);
  const primaryParsed = parseSaleAmount(primaryAmount, finalTotal);
  const secondaryParsed =
    paymentMethod === "Multi pagamento"
      ? parseSaleAmount(secondaryAmount, finalTotal)
      : 0;
  const paidAmount =
    paymentMethod === "Multi pagamento"
      ? primaryParsed + secondaryParsed
      : primaryParsed || finalTotal;
  const changeAmount =
    paymentMethod === "Dinheiro" || paymentMethod === "Multi pagamento"
      ? Math.max(0, paidAmount - finalTotal)
      : 0;
  const outstandingAmount = Math.max(0, finalTotal - paidAmount);
  const selectedCustomer = clients.find((client) => client.id === customerId);
  const sellerOptions = useMemo(
    () =>
      Array.from(
        new Set([
          authUser?.name ?? "Admin",
          ...employees
            .filter((employee) => employee.status !== "Inativo")
            .map((employee) => employee.name),
          "Recepcao",
        ]),
      ),
    [authUser?.name, employees],
  );
  const paymentMethods = [
    "Dinheiro",
    "Cartao de debito",
    "Cartao de credito",
    "Transferencia",
    "PIX/Referencia",
    "Multi pagamento",
    "Credito interno",
    "Vale presente",
  ];
  const needsReference = [
    "Cartao de debito",
    "Cartao de credito",
    "Transferencia",
    "PIX/Referencia",
    "Multi pagamento",
  ].includes(paymentMethod);
  const isEditingQuote = Boolean(editingSale);
  const confirmLabel = isEditingQuote
    ? "Atualizar orcamento"
    : saleType === "Orcamento"
      ? "Salvar orcamento"
      : "Confirmar venda";

  useEffect(() => {
    if (!open) return;
    setDiscount(
      editingSale?.discountAmount
        ? String(Math.round(editingSale.discountAmount))
        : "",
    );
    setDiscountReason(editingSale?.discountReason ?? "");
    setTax(
      editingSale?.taxAmount ? String(Math.round(editingSale.taxAmount)) : "0",
    );
    setCustomerId(editingSale?.memberId ?? "final");
    setSeller(editingSale?.seller ?? authUser?.name ?? "Admin");
    setSaleType(editingSale?.type ?? initialSaleType);
    setPaymentMethod(editingSale?.paymentMethod ?? "Dinheiro");
    setSecondaryPaymentMethod("Transferencia");
    setPrimaryAmount(
      editingSale?.amountReceived
        ? String(Math.round(editingSale.amountReceived))
        : "",
    );
    setSecondaryAmount("");
    setPaymentReference(editingSale?.paymentReference ?? "");
    setDateTime(
      editingSale?.soldAtIso
        ? editingSale.soldAtIso.slice(0, 16)
        : dateTimeInputValue(),
    );
    setNote(editingSale?.notes ?? "");
    setInternalNote("");
  }, [authUser?.name, editingSale, initialSaleType, open]);

  const confirm = () => {
    if (!items.length || finalTotal <= 0) {
      toastInfo(
        "Venda sem itens",
        "Adicione pelo menos um item ao carrinho antes de confirmar.",
      );
      return;
    }
    if (requireCustomer && customerId === "final") {
      toastInfo(
        "Cliente obrigatorio",
        "Planos e aulas precisam estar associados a um cliente.",
      );
      return;
    }
    if (!cashSessionId && saleType !== "Orcamento") {
      toastInfo("Caixa fechado", "Abra o caixa antes de finalizar vendas.");
      return;
    }
    if (discountAmount > 0 && !discountReason.trim()) {
      toastInfo(
        "Motivo do desconto",
        "Informe o motivo para auditar o desconto.",
      );
      return;
    }
    if (needsReference && !paymentReference.trim()) {
      toastInfo("Referencia obrigatoria", "Informe a referencia da transacao.");
      return;
    }
    if (
      paymentMethod === "Multi pagamento" &&
      Math.round(paidAmount) < Math.round(finalTotal)
    ) {
      toastInfo(
        "Pagamento incompleto",
        "A soma dos pagamentos precisa cobrir o total.",
      );
      return;
    }
    if (
      paymentMethod === "Dinheiro" &&
      primaryAmount &&
      primaryParsed < finalTotal
    ) {
      toastInfo(
        "Valor recebido insuficiente",
        "Informe um valor recebido igual ou superior ao total.",
      );
      return;
    }

    const soldAt = new Date(dateTime);
    if (Number.isNaN(soldAt.getTime())) {
      toastInfo(
        "Data invalida",
        "Selecione uma data e hora validas para a venda.",
      );
      return;
    }

    const payments =
      paymentMethod === "Multi pagamento"
        ? [
            {
              id: "PAY-1",
              method: "Dinheiro",
              amount: primaryParsed,
              reference: undefined,
            },
            {
              id: "PAY-2",
              method: secondaryPaymentMethod,
              amount: secondaryParsed,
              reference: paymentReference.trim() || undefined,
            },
          ].filter((payment) => payment.amount > 0)
        : [
            {
              id: "PAY-1",
              method: paymentMethod,
              amount: finalTotal,
              reference: paymentReference.trim() || undefined,
            },
          ];
    const notes = [
      note.trim(),
      discountAmount > 0 ? `Motivo desconto: ${discountReason.trim()}` : "",
      paymentReference.trim()
        ? `Referencia pagamento: ${paymentReference.trim()}`
        : "",
      internalNote.trim() ? `Interno: ${internalNote.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      cashSessionId,
      total: finalTotal,
      subtotal: total,
      discountAmount,
      discountReason: discountReason.trim() || undefined,
      taxAmount,
      amountReceived: paidAmount || finalTotal,
      changeAmount,
      paymentReference: paymentReference.trim() || undefined,
      customer: selectedCustomer?.name,
      memberId: selectedCustomer?.id,
      seller,
      type: saleType,
      paymentMethod,
      dateTime: formatDateTimeLabel(dateTime),
      soldAtIso: soldAt.toISOString(),
      notes: notes || undefined,
      payments,
    };
    const savedSale = editingSale
      ? updateSale(
          editingSale.id,
          { ...payload, status: "Orcamento", type: "Orcamento" },
          items,
        )
      : addSale(payload, items);
    const soldPlan = items.find((item) => item.kind === "plan");
    if (selectedCustomer && soldPlan && saleType !== "Orcamento") {
      updateClient(selectedCustomer.id, {
        plan: soldPlan.name,
        planId: soldPlan.id.replace(/^plan-/, ""),
        status: "Ativo",
      });
    }
    toastSuccess(
      editingSale
        ? "Orcamento atualizado"
        : saleType === "Orcamento"
          ? "Orcamento salvo"
          : "Venda concluida",
      "Carrinho limpo e historico atualizado.",
    );
    onConfirmed(saleType, savedSale);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={isEditingQuote ? "Editar orcamento" : "Finalizar venda"}
      description="Revise cliente, caixa, pagamento e desconto antes de confirmar."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <Section title="1. Dados da venda">
            <ClientAutocomplete
              clients={clients}
              value={customerId}
              onChange={setCustomerId}
              requireCustomer={requireCustomer}
            />
            <FormSelect
              label="Vendedor"
              value={seller}
              onChange={(event) => setSeller(event.target.value)}
            >
              {sellerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormSelect>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="Tipo de venda"
                options={["Venda normal", "Orcamento", "Plano", "Servico"]}
                value={saleType}
                onChange={(event) => setSaleType(event.target.value)}
              />
              <FormInput
                label="Data da venda"
                type="datetime-local"
                value={dateTime}
                onChange={(event) => setDateTime(event.target.value)}
              />
            </div>
            <FormTextarea
              label="Observacao"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Section>

          <Section title="2. Forma de pagamento">
            <Card className="border-noogym-lime/40 bg-noogym-lime/[0.06] p-4 shadow-none">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs uppercase text-zinc-400">
                    Total a pagar
                  </span>
                  <strong className="mt-1 block text-3xl text-noogym-lime">
                    {moneyLabel(finalTotal)}
                  </strong>
                </div>
                <div className="grid min-w-[260px] flex-1 gap-2 sm:grid-cols-3">
                  <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                    <span className="block text-xs text-zinc-500">
                      Recebido
                    </span>
                    {moneyLabel(paidAmount || 0)}
                  </p>
                  <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                    <span className="block text-xs text-zinc-500">Troco</span>
                    {moneyLabel(changeAmount)}
                  </p>
                  <p
                    className={`rounded-md border p-3 text-sm ${outstandingAmount > 0 ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-white/10 bg-black/20"}`}
                  >
                    <span className="block text-xs text-zinc-500">Falta</span>
                    {moneyLabel(outstandingAmount)}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`min-h-16 rounded-lg border p-2 text-sm transition ${paymentMethod === method ? "border-noogym-lime bg-noogym-lime/10 text-noogym-lime" : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20"}`}
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-3">
              <label className="block text-sm md:col-span-1">
                <span className="mb-2 block text-zinc-200">
                  {paymentMethod === "Dinheiro"
                    ? "Valor recebido"
                    : paymentMethod === "Multi pagamento"
                      ? "Valor em dinheiro"
                      : "Valor pago"}
                </span>
                <input
                  className="h-12 w-full rounded-md border border-noogym-lime/40 bg-black/30 px-3 text-lg font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime"
                  type="number"
                  min="0"
                  value={primaryAmount}
                  onChange={(event) => setPrimaryAmount(event.target.value)}
                  placeholder={String(Math.round(finalTotal))}
                />
              </label>
              {paymentMethod === "Multi pagamento" ? (
                <>
                  <FormSelect
                    label="Segundo metodo"
                    options={paymentMethods.filter(
                      (method) =>
                        method !== "Multi pagamento" && method !== "Dinheiro",
                    )}
                    value={secondaryPaymentMethod}
                    onChange={(event) =>
                      setSecondaryPaymentMethod(event.target.value)
                    }
                  />
                  <label className="block text-sm">
                    <span className="mb-2 block text-zinc-200">
                      Valor segundo metodo
                    </span>
                    <input
                      className="h-12 w-full rounded-md border border-white/10 bg-black/30 px-3 text-lg font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime"
                      type="number"
                      min="0"
                      value={secondaryAmount}
                      onChange={(event) =>
                        setSecondaryAmount(event.target.value)
                      }
                    />
                  </label>
                </>
              ) : null}
              {needsReference ? (
                <FormInput
                  className={
                    paymentMethod === "Multi pagamento"
                      ? "md:col-span-3"
                      : "md:col-span-2"
                  }
                  label="Referencia da transacao"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="TPA, transferencia ou referencia"
                />
              ) : null}
            </div>
            {paymentMethod === "Multi pagamento" ? (
              <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                Divisao: dinheiro {moneyLabel(primaryParsed)} +{" "}
                {secondaryPaymentMethod.toLowerCase()}{" "}
                {moneyLabel(secondaryParsed)}.
              </p>
            ) : null}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="3. Resumo financeiro">
            <Card className="space-y-4 p-4">
              <p className="flex justify-between">
                Itens <span>{items.length}</span>
              </p>
              <p className="flex justify-between">
                Subtotal <span>{moneyLabel(total)}</span>
              </p>
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <FormInput
                  label="Desconto (Kz ou %)"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  placeholder="0 ou 10%"
                />
                <Button onClick={() => setDiscount("10%")}>10%</Button>
              </div>
              {discountAmount > 0 ? (
                <FormInput
                  label="Motivo do desconto"
                  value={discountReason}
                  onChange={(event) => setDiscountReason(event.target.value)}
                  placeholder="Ex: campanha, autorizacao gerente"
                />
              ) : null}
              <FormInput
                label="Taxa (Kz ou %)"
                value={tax}
                onChange={(event) => setTax(event.target.value)}
                placeholder="0"
              />
              <p className="flex justify-between text-sm text-zinc-300">
                Desconto aplicado <span>{moneyLabel(discountAmount)}</span>
              </p>
              <p className="flex justify-between text-sm text-zinc-300">
                Taxa aplicada <span>{moneyLabel(taxAmount)}</span>
              </p>
              <p className="flex justify-between border-t border-white/10 pt-4 text-xl font-semibold">
                Total{" "}
                <span className="text-noogym-lime">
                  {moneyLabel(finalTotal)}
                </span>
              </p>
            </Card>
            <div className="rounded-lg border border-white/10 p-4 text-sm">
              <ShieldCheck className="mb-2 h-6 w-6 text-noogym-lime" />
              Caixa, cliente, desconto e pagamentos ficam registados para
              auditoria operacional.
            </div>
          </Section>
          <Section title="4. Observacoes internas">
            <FormTextarea
              label="Observacoes internas"
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
            />
          </Section>
        </div>
      </div>
    </Modal>
  );
}

export function BarcodeModal({
  open,
  onClose,
  onFound,
}: {
  open: boolean;
  onClose: () => void;
  onFound?: (product: ProductRecord) => void;
}) {
  const products = useProductsStore((state) => state.products);
  const [barcode, setBarcode] = useState("");
  const findProduct = useCallback(
    (value: string) => {
      const normalized = value.trim().toLowerCase();
      return normalized
        ? products.find((product) =>
            [product.barcode, product.sku, product.id].some(
              (entry) => entry?.toLowerCase() === normalized,
            ),
          )
        : undefined;
    },
    [products],
  );
  const found = findProduct(barcode);
  const confirm = useCallback(
    (product?: ProductRecord) => {
      if (!product) return;
      onFound?.(product);
      toastSuccess("Produto encontrado", product.name);
      onClose();
    },
    [onClose, onFound],
  );

  useEffect(() => {
    if (!open) return;
    setBarcode("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const scanner = createKeyboardScanner({
      onScan: (scan) => {
        setBarcode(scan.value);
        confirm(findProduct(scan.value));
      },
      preventDefaultOnTerminator: true,
    });

    scanner.start();
    return () => scanner.stop();
  }, [confirm, findProduct, open]);

  return (
    <Modal
      open={open}
      title="Codigo de barras"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!found}
            onClick={() => confirm(found)}
          >
            Adicionar produto
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <Barcode className="mx-auto h-16 w-16 text-noogym-lime" />
        <FormInput
          label="Codigo de barras"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="Digite ou leia o codigo"
        />
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          {found ? (
            <>
              <p className="font-semibold">{found.name}</p>
              <p className="text-sm text-zinc-400">Estoque: {found.stock} un</p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              Nenhum produto disponivel para leitura.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ClassFormModal({
  open,
  lesson,
  onClose,
}: {
  open: boolean;
  lesson?: ClassRecord;
  onClose: () => void;
}) {
  const addClass = useClassesStore((state) => state.addClass);
  const updateClass = useClassesStore((state) => state.updateClass);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cardio");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("55 min");
  const [seats, setSeats] = useState("25");
  const [instructor, setInstructor] = useState("João Silva");
  const [active, setActive] = useState(true);
  const [waitingList, setWaitingList] = useState(true);
  const [requiresCheckin, setRequiresCheckin] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(lesson?.name ?? "");
    setCategory(lesson?.category ?? "Cardio");
    setDescription(lesson?.description ?? "");
    setDuration(lesson?.duration ?? "55 min");
    setSeats(String(lesson?.seats ?? 25));
    setInstructor(lesson?.instructor ?? "João Silva");
    setActive(lesson?.status !== "Encerrada" && lesson?.status !== "Cancelada");
    setWaitingList(true);
    setRequiresCheckin(false);
  }, [lesson, open]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da aula.");
      return;
    }
    const payload = {
      name: name.trim(),
      category,
      description,
      instructor,
      duration,
      seats: Math.max(1, Math.round(parseNumericInput(seats, 25))),
      status: active
        ? lesson?.status === "Em andamento"
          ? "Em andamento"
          : "Agendada"
        : "Cancelada",
    };
    lesson ? updateClass(lesson.id, payload) : addClass(payload);
    toastSuccess(
      lesson ? "Aula atualizada com sucesso" : "Aula criada com sucesso",
    );
    onClose();
  };
  return (
    <Modal
      open={open}
      title={lesson ? "Editar aula" : "Nova aula"}
      description="Preencha as informações da aula."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {lesson ? "Salvar alterações" : "Salvar aula"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Informacoes basicas">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome da aula"
              requiredMark
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormSelect
              label="Categoria"
              requiredMark
              options={[
                "Cardio",
                "Funcional",
                "Corpo e Mente",
                "Dança",
                "Luta",
              ]}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <FormTextarea
            label="Descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <FormInput
              label="Duracao"
              requiredMark
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <FormInput
              label="Capacidade"
              requiredMark
              type="number"
              min="1"
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
            />
            <FormSelect
              label="Instrutor"
              requiredMark
              options={["João Silva", "Lucas Ferreira", "Mariana Costa"]}
              value={instructor}
              onChange={(event) => setInstructor(event.target.value)}
            />
          </div>
        </Section>
        <Section title="2. Equipamentos">
          <FormInput
            label="Equipamentos necessarios"
            placeholder="Bike Spinning, Toalha, Garrafa de agua"
          />
        </Section>
        <Section title="3. Configuracoes">
          <div className="grid grid-cols-3 gap-3">
            <FormSwitch
              label="Aula ativa"
              checked={active}
              onChange={setActive}
            />
            <FormSwitch
              label="Permitir lista de espera"
              checked={waitingList}
              onChange={setWaitingList}
            />
            <FormSwitch
              label="Exige check-in"
              checked={requiresCheckin}
              onChange={setRequiresCheckin}
            />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

export function WeeklyScheduleModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const days = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ];
  const hours = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];
  const save = () => {
    toastSuccess("Horários salvos com sucesso");
    onClose();
  };
  return (
    <Modal
      open={open}
      title="Horário semanal"
      description="Defina os dias e horários em que a aula estará disponível."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar horários
          </Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3">
        <FormSelect label="Aula" options={["Spinning", "Funcional", "Yoga"]} />
        <FormSelect
          label="Instrutor (opcional)"
          options={["João Silva", "Lucas Ferreira"]}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-8 bg-white/[0.03] text-sm">
            {["Horários", ...days].map((label) => (
              <div
                key={label}
                className="border-r border-white/10 p-3 text-center last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>
          {hours.map((hour, row) => (
            <div
              key={hour}
              className="grid grid-cols-8 border-t border-white/10 text-sm"
            >
              <div className="p-3 text-center">{hour}</div>
              {days.map((day, col) => (
                <button
                  key={`${day}-${hour}`}
                  type="button"
                  className="min-h-14 border-l border-white/10 p-1 hover:bg-noogym-lime/10"
                >
                  {(row + col) % 4 === 0 ? (
                    <span className="block rounded bg-noogym-lime/40 p-2 text-xs text-white">
                      Spinning
                      <br />
                      João Silva
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function EndClassModal({
  open,
  lesson,
  onClose,
}: {
  open: boolean;
  lesson?: ClassRecord;
  onClose: () => void;
}) {
  const closeClass = useClassesStore((state) => state.closeClass);
  const confirm = () => {
    if (lesson) closeClass(lesson.id);
    toastSuccess("Aula encerrada com sucesso");
    onClose();
  };
  return (
    <Modal
      open={open}
      title="Encerrar aula"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={confirm}>
            Encerrar aula
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>Confirme o encerramento da aula em andamento.</p>
        <div className="rounded-lg border border-white/10 p-4 text-sm">
          <p>Aula: {lesson?.name ?? "Spinning"}</p>
          <p>Horário: Hoje, 10:00</p>
          <p>Presentes: 23</p>
          <p>Ausentes: 2</p>
        </div>
        <FormTextarea label="Observação opcional" />
      </div>
    </Modal>
  );
}

export function StudentsClassModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const clients = useClientsStore((state) => state.clients);
  return (
    <Modal
      open={open}
      title="Lista de alunos da aula"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Presenças registadas com sucesso");
              onClose();
            }}
          >
            Salvar presenças
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {clients.slice(0, 8).map((client, index) => (
          <div
            key={client.id}
            className="flex items-center gap-3 rounded-md border border-white/10 p-3"
          >
            <Avatar label={client.avatar ?? "CL"} />
            <span className="flex-1">{client.name}</span>
            <FormCheckbox
              label={index < 6 ? "Presente" : "Ausente"}
              defaultChecked={index < 6}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}

const classCategories = [
  "Cardio",
  "Funcional",
  "Corpo e Mente",
  "Danca",
  "Luta",
  "Musculacao",
  "Aulas",
];
const classDateTimeInputValue = (date?: string) => {
  const value = date ? new Date(date) : new Date();
  if (Number.isNaN(value.getTime())) return dateTimeInputValue();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};
const classEndFromStart = (value: string, minutes: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};
const classDurationMinutes = (value: string, fallback = 55) => {
  const parsed = Number(String(value).match(/\d+/)?.[0] ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const classEquipmentOptions = [
  "Bike Spinning",
  "Tapete",
  "Halteres",
  "Elastico",
  "Step",
  "Bola",
  "Corda",
  "Colchonete",
  "Toalha",
  "Garrafa de agua",
];
const equipmentList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const toggleEquipmentValue = (value: string, option: string) => {
  const items = equipmentList(value);
  const exists = items.some(
    (item) => item.toLowerCase() === option.toLowerCase(),
  );
  return exists
    ? items
        .filter((item) => item.toLowerCase() !== option.toLowerCase())
        .join(", ")
    : [...items, option].join(", ");
};

export function ClassSessionModal({
  open,
  lesson,
  onClose,
}: {
  open: boolean;
  lesson?: ClassRecord;
  onClose: () => void;
}) {
  const addClass = useClassesStore((state) => state.addClass);
  const updateClass = useClassesStore((state) => state.updateClass);
  const employees = useEmployeesStore((state) => state.employees);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cardio");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("55 min");
  const [seats, setSeats] = useState("25");
  const [instructor, setInstructor] = useState("Instrutor");
  const [room, setRoom] = useState("Sala 1");
  const [startAt, setStartAt] = useState(dateTimeInputValue);
  const [equipment, setEquipment] = useState("");
  const [level, setLevel] = useState("Todos os niveis");
  const [modality, setModality] = useState("Coletiva");
  const [color, setColor] = useState("#B6FF00");
  const [active, setActive] = useState(true);
  const [waitingList, setWaitingList] = useState(true);
  const [requiresCheckin, setRequiresCheckin] = useState(false);
  const instructorOptions = useMemo(() => {
    const names = employees
      .filter((employee) => employee.status !== "Inativo")
      .map((employee) => employee.name);
    return names.length
      ? names
      : ["Instrutor", "Joao Silva", "Lucas Ferreira", "Mariana Costa"];
  }, [employees]);

  useEffect(() => {
    if (!open) return;
    setName(lesson?.name ?? "");
    setCategory(lesson?.category ?? "Cardio");
    setDescription(lesson?.description ?? "");
    setDuration(lesson?.duration ?? "55 min");
    setSeats(String(lesson?.seats ?? 25));
    setInstructor(lesson?.instructor ?? instructorOptions[0] ?? "Instrutor");
    setRoom(lesson?.room ?? "Sala 1");
    setStartAt(classDateTimeInputValue(lesson?.startAtIso));
    setEquipment(lesson?.equipment ?? "");
    setLevel(lesson?.level ?? "Todos os niveis");
    setModality(lesson?.modality ?? "Coletiva");
    setColor(lesson?.color ?? "#B6FF00");
    setActive(lesson?.status !== "Encerrada" && lesson?.status !== "Cancelada");
    setWaitingList(lesson?.allowWaitlist ?? true);
    setRequiresCheckin(lesson?.requiresCheckIn ?? false);
  }, [instructorOptions, lesson, open]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da aula.");
      return;
    }
    const durationMinutes = Math.max(15, classDurationMinutes(duration));
    const payload: Partial<ClassRecord> = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      instructor,
      room,
      time: formatDateTimeLabel(startAt),
      duration: `${durationMinutes} min`,
      seats: Math.max(1, Math.round(parseNumericInput(seats, 25))),
      status: active
        ? lesson?.status === "Em andamento"
          ? "Em andamento"
          : "Agendada"
        : "Cancelada",
      equipment: equipment.trim() || undefined,
      allowWaitlist: waitingList,
      requiresCheckIn: requiresCheckin,
      color,
      startAtIso: new Date(startAt).toISOString(),
      endAtIso: classEndFromStart(startAt, durationMinutes),
      level,
      modality,
    };
    lesson ? updateClass(lesson.id, payload) : addClass(payload);
    toastSuccess(
      lesson ? "Aula atualizada com sucesso" : "Aula criada com sucesso",
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title={lesson ? "Editar aula" : "Nova aula"}
      description="Cadastre o modelo e a sessao da aula."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {lesson ? "Salvar alteracoes" : "Salvar aula"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Dados da aula">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome da aula"
              requiredMark
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormSelect
              label="Categoria"
              requiredMark
              options={classCategories}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <FormTextarea
            label="Descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <FormSelect
              label="Duracao"
              requiredMark
              options={[
                "30 min",
                "45 min",
                "55 min",
                "60 min",
                "75 min",
                "90 min",
              ]}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <FormInput
              label="Capacidade"
              requiredMark
              type="number"
              min="1"
              max="200"
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
            />
            <FormSelect
              label="Nivel"
              options={[
                "Todos os niveis",
                "Iniciante",
                "Intermediario",
                "Avancado",
              ]}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            />
          </div>
        </Section>
        <Section title="2. Agenda e equipa">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Data e hora"
              type="datetime-local"
              requiredMark
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
            <FormSelect
              label="Instrutor"
              requiredMark
              options={instructorOptions}
              value={instructor}
              onChange={(event) => setInstructor(event.target.value)}
            />
            <FormInput
              label="Sala"
              placeholder="Ex: Sala 1, Estudio A, Outdoor"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
            />
            <FormSelect
              label="Modalidade"
              options={["Coletiva", "Individual", "Online", "Aula avulsa"]}
              value={modality}
              onChange={(event) => setModality(event.target.value)}
            />
          </div>
        </Section>
        <Section title="3. Equipamentos e cor">
          <div className="space-y-3">
            <span className="block text-sm text-zinc-200">
              Equipamentos necessarios
            </span>
            <div className="flex flex-wrap gap-2">
              {classEquipmentOptions.map((option) => {
                const selected = equipmentList(equipment).some(
                  (item) => item.toLowerCase() === option.toLowerCase(),
                );
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setEquipment((value) =>
                        toggleEquipmentValue(value, option),
                      )
                    }
                    className={`rounded border px-3 py-2 text-sm ${selected ? "border-noogym-lime bg-noogym-lime/10 text-noogym-lime" : "border-white/10 bg-white/[0.03] text-zinc-200"}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <FormInput
              label="Outros equipamentos"
              placeholder="Digite outro equipamento e separe por virgula"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Cor da aula</span>
              <span className="inline-flex items-center gap-2 text-zinc-200">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {color}
              </span>
            </div>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </Section>
        <Section title="4. Configuracoes">
          <div className="grid grid-cols-3 gap-3">
            <FormSwitch
              label="Aula ativa"
              checked={active}
              onChange={setActive}
            />
            <FormSwitch
              label="Permitir lista de espera"
              checked={waitingList}
              onChange={setWaitingList}
            />
            <FormSwitch
              label="Exige check-in"
              checked={requiresCheckin}
              onChange={setRequiresCheckin}
            />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

export function ClassAgendaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const classes = useClassesStore((state) => state.classes);
  const addClass = useClassesStore((state) => state.addClass);
  const employees = useEmployeesStore((state) => state.employees);
  const days = [
    "Segunda",
    "Terca",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sabado",
    "Domingo",
  ];
  const hours = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];
  const [lessonId, setLessonId] = useState("");
  const [instructor, setInstructor] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const baseLesson =
    classes.find((lesson) => lesson.id === lessonId) ?? classes[0];
  const instructorOptions = useMemo(() => {
    const names = employees
      .filter((employee) => employee.status !== "Inativo")
      .map((employee) => employee.name);
    return names.length
      ? names
      : ["Joao Silva", "Lucas Ferreira", "Mariana Costa"];
  }, [employees]);

  useEffect(() => {
    if (!open) return;
    setLessonId(classes[0]?.id ?? "");
    setInstructor(
      classes[0]?.instructor ?? instructorOptions[0] ?? "Instrutor",
    );
    setSelectedSlots([]);
  }, [classes, instructorOptions, open]);

  const toggleSlot = (slot: string) =>
    setSelectedSlots((slots) =>
      slots.includes(slot)
        ? slots.filter((item) => item !== slot)
        : [...slots, slot],
    );
  const slotDate = (dayIndex: number, hour: string) => {
    const date = new Date();
    const current = date.getDay() === 0 ? 7 : date.getDay();
    const diff = dayIndex + 1 - current;
    date.setDate(date.getDate() + (diff >= 0 ? diff : diff + 7));
    const [hh, mm] = hour.split(":").map(Number);
    date.setHours(hh, mm, 0, 0);
    return date;
  };
  const save = () => {
    if (!baseLesson || !selectedSlots.length) {
      toastInfo("Horario vazio", "Selecione pelo menos um horario na grelha.");
      return;
    }
    selectedSlots.forEach((slot) => {
      const [dayIndex, hour] = slot.split("|");
      const start = slotDate(Number(dayIndex), hour);
      const duration = classDurationMinutes(baseLesson.duration);
      addClass({
        ...baseLesson,
        name: baseLesson.name,
        instructor,
        time: formatDateTimeLabel(classDateTimeInputValue(start.toISOString())),
        participants: 0,
        status: "Agendada",
        startAtIso: start.toISOString(),
        endAtIso: classEndFromStart(
          classDateTimeInputValue(start.toISOString()),
          duration,
        ),
      });
    });
    toastSuccess("Horarios criados com sucesso");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Agenda semanal"
      description="Clique nas celulas para criar sessoes recorrentes da aula."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Criar sessoes
          </Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3">
        <FormSelect
          label="Aula base"
          value={lessonId}
          onChange={(event) => setLessonId(event.target.value)}
        >
          {classes.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.name}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Instrutor"
          options={instructorOptions}
          value={instructor}
          onChange={(event) => setInstructor(event.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-8 bg-white/[0.03] text-sm">
            {["Horarios", ...days].map((label) => (
              <div
                key={label}
                className="border-r border-white/10 p-3 text-center last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-8 border-t border-white/10 text-sm"
            >
              <div className="p-3 text-center">{hour}</div>
              {days.map((day, col) => {
                const slot = `${col}|${hour}`;
                const selected = selectedSlots.includes(slot);
                return (
                  <button
                    key={`${day}-${hour}`}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className="min-h-14 border-l border-white/10 p-1 hover:bg-noogym-lime/10"
                  >
                    {selected ? (
                      <span className="block rounded bg-noogym-lime/40 p-2 text-xs text-white">
                        {baseLesson?.name ?? "Aula"}
                        <br />
                        {instructor}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function ClassRosterModal({
  open,
  lesson,
  onClose,
}: {
  open: boolean;
  lesson?: ClassRecord;
  onClose: () => void;
}) {
  const clients = useClientsStore((state) => state.clients);
  const updateParticipants = useClassesStore(
    (state) => state.updateParticipants,
  );
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"Todos" | "Presentes" | "Ausentes">(
    "Todos",
  );
  const roster = useMemo(() => clients, [clients]);
  const filteredRoster = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roster.filter((client) => {
      const present = presentIds.includes(client.id);
      const matchesFilter =
        filter === "Todos" || (filter === "Presentes" ? present : !present);
      const text =
        `${client.name} ${client.phone} ${client.email} ${client.document ?? ""} ${client.plan}`.toLowerCase();
      return matchesFilter && (!normalized || text.includes(normalized));
    });
  }, [filter, presentIds, query, roster]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setFilter("Todos");
    setPresentIds(
      roster.slice(0, lesson?.participants ?? 0).map((client) => client.id),
    );
  }, [lesson?.participants, open, roster]);

  const toggle = (id: string) =>
    setPresentIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  const markVisible = (present: boolean) =>
    setPresentIds((ids) => {
      const visibleIds = filteredRoster.map((client) => client.id);
      return present
        ? Array.from(new Set([...ids, ...visibleIds]))
        : ids.filter((id) => !visibleIds.includes(id));
    });
  const save = () => {
    if (lesson) updateParticipants(lesson.id, presentIds.length);
    toastSuccess("Presencas registadas com sucesso");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Participantes da aula"
      description={lesson ? `${lesson.name} - ${lesson.time}` : undefined}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar presencas
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
          <FormInput
            label="Pesquisar aluno"
            placeholder="Nome, telefone, email, BI ou plano"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <FormSelect
            label="Filtro"
            options={["Todos", "Presentes", "Ausentes"]}
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as "Todos" | "Presentes" | "Ausentes",
              )
            }
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
          <span>
            <strong className="text-noogym-lime">{presentIds.length}</strong>{" "}
            presentes de {roster.length} alunos
          </span>
          <span>{filteredRoster.length} resultados visiveis</span>
          <div className="flex gap-2">
            <Button className="h-8" onClick={() => markVisible(true)}>
              Marcar visiveis
            </Button>
            <Button className="h-8" onClick={() => markVisible(false)}>
              Limpar visiveis
            </Button>
          </div>
        </div>
        <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
          {filteredRoster.length ? (
            filteredRoster.map((client) => {
              const present = presentIds.includes(client.id);
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => toggle(client.id)}
                  className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition ${present ? "border-noogym-lime/60 bg-noogym-lime/10" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}
                >
                  <Avatar label={client.avatar ?? "CL"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {client.name}
                    </span>
                    <span className="block truncate text-xs text-zinc-400">
                      {client.phone} - {client.plan}
                    </span>
                  </span>
                  <span
                    className={`rounded border px-3 py-1 text-xs ${present ? "border-noogym-lime/60 text-noogym-lime" : "border-white/10 text-zinc-400"}`}
                  >
                    {present ? "Presente" : "Ausente"}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="rounded-lg border border-white/10 p-6 text-center text-sm text-zinc-400">
              Nenhum aluno encontrado para esta pesquisa.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function WorkoutBuilderModal({
  open,
  workout,
  onClose,
}: {
  open: boolean;
  workout?: WorkoutRecord;
  onClose: () => void;
}) {
  const addWorkout = useWorkoutsStore((state) => state.addWorkout);
  const updateWorkout = useWorkoutsStore((state) => state.updateWorkout);
  const clients = useClientsStore((state) => state.clients);
  const employees = useEmployeesStore((state) => state.employees);
  const [name, setName] = useState("");
  const [client, setClient] = useState("Cliente avulso");
  const [goal, setGoal] = useState("Hipertrofia");
  const [level, setLevel] = useState("Intermediario");
  const [duration, setDuration] = useState("60 min");
  const [frequency, setFrequency] = useState("3x por semana");
  const [reviewDate, setReviewDate] = useState("30 dias");
  const [author, setAuthor] = useState("Admin");
  const [status, setStatus] = useState("Ativo");
  const [notes, setNotes] = useState("");
  const [blockName, setBlockName] = useState("Treino principal");
  const [exerciseRows, setExerciseRows] = useState<WorkoutExerciseRecord[]>([]);

  useEffect(() => {
    if (!open) return;
    const firstBlock = workout?.blocks?.[0];
    setName(workout?.name ?? "");
    setClient(workout?.client ?? clients[0]?.name ?? "Cliente avulso");
    setGoal(workout?.goal ?? "Hipertrofia");
    setLevel(workout?.level ?? "Intermediario");
    setDuration(workout?.duration ?? "60 min");
    setFrequency(workout?.frequency ?? "3x por semana");
    setReviewDate(workout?.reviewDate ?? "30 dias");
    setAuthor(
      workout?.author ??
        employees.find((employee) => employee.role.includes("Personal"))
          ?.name ??
        "Admin",
    );
    setStatus(workout?.status ?? "Ativo");
    setNotes(workout?.notes ?? "");
    setBlockName(firstBlock?.name ?? "Treino principal");
    setExerciseRows(
      firstBlock?.exercises?.length
        ? firstBlock.exercises
        : [
            {
              id: "draft-1",
              name: "Agachamento livre",
              group: "Pernas",
              equipment: "Barra",
              sets: 4,
              reps: "10-12",
              load: "Moderada",
              rest: "75s",
              notes: "",
            },
            {
              id: "draft-2",
              name: "Supino reto",
              group: "Peito",
              equipment: "Barra",
              sets: 4,
              reps: "8-10",
              load: "Progressiva",
              rest: "90s",
              notes: "",
            },
          ],
    );
  }, [clients, employees, open, workout]);

  const updateExercise = (
    id: string,
    patch: Partial<WorkoutExerciseRecord>,
  ) => {
    setExerciseRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addExerciseRow = () => {
    setExerciseRows((rows) => [
      ...rows,
      {
        id: `draft-${Date.now()}`,
        name: "",
        group: "Geral",
        equipment: "Livre",
        sets: 3,
        reps: "10",
        load: "",
        rest: "60s",
        notes: "",
      },
    ]);
  };

  const removeExercise = (id: string) => {
    setExerciseRows((rows) => rows.filter((row) => row.id !== id));
  };

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome do treino.");
      return;
    }
    const validRows = exerciseRows.filter((row) => row.name.trim());
    const selectedClient = clients.find((item) => item.name === client);
    const payload = {
      name: name.trim(),
      client,
      clientId: selectedClient?.id,
      goal,
      author,
      status,
      level,
      duration,
      frequency,
      reviewDate,
      notes,
      type: client === "Modelo sem cliente" ? "Modelo" : "Cliente",
      blocks: [
        {
          id: workout?.blocks?.[0]?.id ?? `block-${Date.now()}`,
          name: blockName.trim() || "Treino principal",
          exercises: validRows,
        },
      ],
      exercises: validRows.length,
    };
    workout ? updateWorkout(workout.id, payload) : addWorkout(payload);
    toastSuccess(
      workout ? "Treino atualizado com sucesso" : "Treino criado com sucesso",
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title={workout ? "Editar treino" : "Novo treino"}
      description="Monte a ficha com aluno, objetivo, revisao e exercicios."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar treino
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Dados do treino">
          <div className="grid gap-3 md:grid-cols-2">
            <FormInput
              label="Nome do treino"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormSelect
              label="Cliente"
              options={[
                "Modelo sem cliente",
                ...clients.map((item) => item.name),
              ]}
              value={client}
              onChange={(event) => setClient(event.target.value)}
            />
            <FormSelect
              label="Objetivo"
              options={[
                "Hipertrofia",
                "Emagrecimento",
                "Forca",
                "Condicionamento",
                "Definicao",
                "Reabilitacao",
              ]}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
            <FormSelect
              label="Nivel"
              options={["Iniciante", "Intermediario", "Avancado"]}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            />
            <FormSelect
              label="Frequencia"
              options={[
                "2x por semana",
                "3x por semana",
                "4x por semana",
                "5x por semana",
                "Livre",
              ]}
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
            />
            <FormSelect
              label="Revisao"
              options={["15 dias", "30 dias", "45 dias", "60 dias"]}
              value={reviewDate}
              onChange={(event) => setReviewDate(event.target.value)}
            />
            <FormInput
              label="Duracao media"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <FormSelect
              label="Criado por"
              options={["Admin", ...employees.map((employee) => employee.name)]}
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </div>
        </Section>
        <Section title="2. Exercicios">
          <FormInput
            label="Bloco"
            value={blockName}
            onChange={(event) => setBlockName(event.target.value)}
          />
          <div className="space-y-3">
            {exerciseRows.map((row, index) => (
              <div
                key={row.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <strong className="text-sm text-white">
                    Exercicio {index + 1}
                  </strong>
                  <button
                    type="button"
                    className="text-xs text-red-300"
                    onClick={() => removeExercise(row.id)}
                  >
                    Remover
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_120px_120px_120px_120px]">
                  <FormInput
                    label="Nome"
                    value={row.name}
                    onChange={(event) =>
                      updateExercise(row.id, { name: event.target.value })
                    }
                  />
                  <FormSelect
                    label="Grupo"
                    options={[
                      "Geral",
                      "Peito",
                      "Costas",
                      "Pernas",
                      "Ombros",
                      "Bracos",
                      "Core",
                      "Cardio",
                    ]}
                    value={row.group}
                    onChange={(event) =>
                      updateExercise(row.id, { group: event.target.value })
                    }
                  />
                  <FormInput
                    label="Series"
                    type="number"
                    value={String(row.sets)}
                    onChange={(event) =>
                      updateExercise(row.id, {
                        sets: Number(event.target.value) || 1,
                      })
                    }
                  />
                  <FormInput
                    label="Reps"
                    value={row.reps}
                    onChange={(event) =>
                      updateExercise(row.id, { reps: event.target.value })
                    }
                  />
                  <FormInput
                    label="Descanso"
                    value={row.rest}
                    onChange={(event) =>
                      updateExercise(row.id, { rest: event.target.value })
                    }
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <FormInput
                    label="Equipamento"
                    value={row.equipment}
                    onChange={(event) =>
                      updateExercise(row.id, { equipment: event.target.value })
                    }
                  />
                  <FormInput
                    label="Carga"
                    value={row.load ?? ""}
                    onChange={(event) =>
                      updateExercise(row.id, { load: event.target.value })
                    }
                  />
                  <FormInput
                    label="Notas"
                    value={row.notes ?? ""}
                    onChange={(event) =>
                      updateExercise(row.id, { notes: event.target.value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            icon={<Dumbbell className="h-4 w-4" />}
            onClick={addExerciseRow}
          >
            Adicionar exercicio
          </Button>
        </Section>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <FormTextarea
            label="Observacoes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <FormSelect
            label="Status"
            options={["Ativo", "Rascunho", "Pausado", "Arquivado"]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export function WorkoutFormModal({
  open,
  workout,
  onClose,
}: {
  open: boolean;
  workout?: WorkoutRecord;
  onClose: () => void;
}) {
  const addWorkout = useWorkoutsStore((state) => state.addWorkout);
  const updateWorkout = useWorkoutsStore((state) => state.updateWorkout);
  const [name, setName] = useState("");
  const [client, setClient] = useState("Carlos Alberto Silva");
  const [goal, setGoal] = useState("Hipertrofia");
  const [level, setLevel] = useState("Intermediário");
  const [duration, setDuration] = useState("60 min");
  const [author, setAuthor] = useState("Admin");
  const [status, setStatus] = useState("Ativo");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(workout?.name ?? "");
    setClient(workout?.client ?? "Carlos Alberto Silva");
    setGoal(workout?.goal ?? "Hipertrofia");
    setLevel("Intermediário");
    setDuration("60 min");
    setAuthor(workout?.author ?? "Admin");
    setStatus(workout?.status ?? "Ativo");
    setNotes("");
  }, [open, workout]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome do treino.");
      return;
    }
    const payload = { name: name.trim(), client, goal, author, status };
    workout ? updateWorkout(workout.id, payload) : addWorkout(payload);
    toastSuccess(
      workout ? "Treino atualizado com sucesso" : "Treino criado com sucesso",
    );
    onClose();
  };
  return (
    <Modal
      open={open}
      title={workout ? "Editar treino" : "Novo treino"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar treino
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Dados do treino">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome do treino"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormSelect
              label="Cliente"
              options={["Carlos Alberto Silva", "Ana Luísa Santos"]}
              value={client}
              onChange={(event) => setClient(event.target.value)}
            />
            <FormSelect
              label="Objetivo"
              options={[
                "Hipertrofia",
                "Emagrecimento",
                "Força",
                "Condicionamento",
              ]}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
            <FormSelect
              label="Nivel"
              options={["Iniciante", "Intermediário", "Avançado"]}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            />
            <FormInput
              label="Duracao media"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <FormInput
              label="Criado por"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </div>
        </Section>
        <Section title="2. Exercicios">
          <div className="rounded-lg border border-white/10 p-3 text-sm">
            <p>Supino reto - 4 series - 10 repeticoes - 60s descanso</p>
            <p className="mt-2">
              Agachamento livre - 4 series - 12 repeticoes - 90s descanso
            </p>
            <Button className="mt-3" icon={<Dumbbell className="h-4 w-4" />}>
              Adicionar exercicio
            </Button>
          </div>
        </Section>
        <FormTextarea
          label="Observacoes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <FormSelect
          label="Status"
          options={["Ativo", "Rascunho", "Inativo"]}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function ExerciseLibraryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Biblioteca de exercícios"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Exercício criado com sucesso");
              onClose();
            }}
          >
            Salvar exercício
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Nome" placeholder="Supino reto" />
        <FormSelect
          label="Grupo muscular"
          options={["Peito", "Costas", "Pernas", "Ombros", "Braços"]}
        />
        <FormSelect
          label="Equipamento"
          options={["Barra", "Halteres", "Máquina", "Peso corporal"]}
        />
        <FormSelect
          label="Nível"
          options={["Iniciante", "Intermediário", "Avançado"]}
        />
        <FormTextarea className="col-span-2" label="Instruções" />
        <FileUpload label="Vídeo/imagem opcional" />
      </div>
    </Modal>
  );
}

export function EmployeeFormModal({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee?: EmployeeRecord;
  onClose: () => void;
}) {
  const addEmployee = useEmployeesStore((state) => state.addEmployee);
  const updateEmployee = useEmployeesStore((state) => state.updateEmployee);
  const roles = useEmployeesStore((state) => state.roles);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Recepcionista");
  const [department, setDepartment] = useState("Atendimento");
  const [hireDate, setHireDate] = useState(todayInputValue);
  const [contractType, setContractType] = useState("Tempo integral");
  const [supervisor, setSupervisor] = useState("Gerente");
  const [shift, setShift] = useState("Manha");
  const [accessStatus, setAccessStatus] = useState("Liberado");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [notes, setNotes] = useState("");
  const selectedRole = roles.find((item) => item.name === role);

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? "");
    setEmail(employee?.email ?? "");
    setPhone(employee?.phone ?? "");
    setRole(employee?.role ?? roles[0]?.name ?? "Recepcionista");
    setDepartment(employee?.department ?? "Atendimento");
    setHireDate(employee?.hireDate ?? todayInputValue());
    setContractType(employee?.contractType ?? "Tempo integral");
    setSupervisor(employee?.supervisor ?? "Gerente");
    setShift(employee?.shift ?? "Manha");
    setAccessStatus(employee?.accessStatus ?? "Liberado");
    setSalary(employee?.salary ?? "");
    setStatus(employee?.status ?? "Ativo");
    setNotes(employee?.notes ?? "");
  }, [employee, open, roles]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome do funcionario.");
      return;
    }
    const payload = {
      name: name.trim(),
      role,
      email: email.trim(),
      phone: phone.trim(),
      department,
      hireDate,
      contractType,
      supervisor,
      shift,
      accessStatus,
      salary: salary.trim() || "0 Kz",
      status,
      notes,
      permissions: selectedRole?.modules ?? employee?.permissions,
    };
    employee ? updateEmployee(employee.id, payload) : addEmployee(payload);
    toastSuccess(
      employee
        ? "Funcionário atualizado com sucesso"
        : "Funcionário criado com sucesso",
    );
    onClose();
  };
  return (
    <Modal
      open={open}
      title={employee ? "Editar funcionário" : "Novo funcionário"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar funcionário
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FileUpload label="Foto opcional" />
        <FormInput
          label="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <FormInput
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FormInput
          label="Telefone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <FormSelect
          label="Funcao"
          options={[
            "Administrador",
            "Gerente",
            "Recepcionista",
            "Personal Trainer",
            "Instrutor de Aulas",
          ]}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <FormInput label="Data de admissao" defaultValue="08/05/2026" />
        <FormInput
          label="Salario mensal"
          value={salary}
          onChange={(event) => setSalary(event.target.value)}
        />
        <FormSelect
          label="Status"
          options={["Ativo", "Inativo"]}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
        <div className="col-span-2 grid grid-cols-3 gap-2">
          {[
            "Dashboard",
            "Check-in",
            "Clientes",
            "Vendas",
            "Produtos",
            "Financas",
          ].map((permission) => (
            <FormCheckbox key={permission} label={permission} defaultChecked />
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function EmployeeBuilderModal({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee?: EmployeeRecord;
  onClose: () => void;
}) {
  const addEmployee = useEmployeesStore((state) => state.addEmployee);
  const updateEmployee = useEmployeesStore((state) => state.updateEmployee);
  const roles = useEmployeesStore((state) => state.roles);
  const users = useSettingsStore((state) => state.users);
  const gyms = useSettingsStore((state) => state.gyms);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Recepcionista");
  const [department, setDepartment] = useState("Atendimento");
  const [hireDate, setHireDate] = useState(todayInputValue);
  const [contractType, setContractType] = useState("Tempo integral");
  const [supervisor, setSupervisor] = useState("Gerente");
  const [shift, setShift] = useState("Manha");
  const [accessStatus, setAccessStatus] = useState("Liberado");
  const [accountMode, setAccountMode] =
    useState<EmployeeRecord["accountMode"]>("Sem acesso");
  const [accountEmail, setAccountEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [gymScope, setGymScope] =
    useState<EmployeeRecord["gymScope"]>("Organizacao");
  const [gymIds, setGymIds] = useState<string[]>([]);
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [notes, setNotes] = useState("");
  const selectedRole = roles.find((item) => item.name === role);
  const gymOptions = gyms.length
    ? gyms
    : [
        { id: "unidade-central", name: "Unidade Central" },
        { id: "multiunidade", name: "Todas as unidades" },
      ];
  const userOptions = users.length ? users : [];

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? "");
    setEmail(employee?.email ?? "");
    setPhone(employee?.phone ?? "");
    setRole(employee?.role ?? roles[0]?.name ?? "Recepcionista");
    setDepartment(employee?.department ?? "Atendimento");
    setHireDate(employee?.hireDate ?? todayInputValue());
    setContractType(employee?.contractType ?? "Tempo integral");
    setSupervisor(employee?.supervisor ?? "Gerente");
    setShift(employee?.shift ?? "Manha");
    setAccessStatus(employee?.accessStatus ?? "Liberado");
    setAccountMode(
      employee?.accountMode ??
        (employee?.userId ? "Vincular usuario existente" : "Sem acesso"),
    );
    setAccountEmail(employee?.accountEmail ?? employee?.email ?? "");
    setUserId(employee?.userId ?? "");
    setGymScope(
      employee?.gymScope ??
        (employee?.role?.includes("Personal") ? "Multiunidade" : "Organizacao"),
    );
    setGymIds(
      employee?.gymIds?.length
        ? employee.gymIds
        : employee?.gymId
          ? [employee.gymId]
          : [],
    );
    setSalary(employee?.salary ?? "");
    setStatus(employee?.status ?? "Ativo");
    setNotes(employee?.notes ?? "");
  }, [employee, open, roles]);

  useEffect(() => {
    if (accountMode === "Convidar nova conta" && !accountEmail)
      setAccountEmail(email);
  }, [accountEmail, accountMode, email]);

  const toggleGym = (id: string) => {
    setGymIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  };

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome do funcionario.");
      return;
    }
    if (accountMode === "Convidar nova conta" && !accountEmail.trim()) {
      toastInfo(
        "Email de acesso obrigatorio",
        "Informe o email para enviar o convite.",
      );
      return;
    }
    if (accountMode === "Vincular usuario existente" && !userId.trim()) {
      toastInfo(
        "Usuario obrigatorio",
        "Selecione ou informe o usuario existente.",
      );
      return;
    }
    const resolvedGymIds =
      gymScope === "Organizacao"
        ? []
        : gymScope === "Unidade especifica"
          ? gymIds.slice(0, 1)
          : gymIds.length
            ? gymIds
            : gymOptions.map((gym) => gym.id);
    const resolvedAccessStatus =
      accountMode === "Sem acesso"
        ? "Sem acesso"
        : accountMode === "Convidar nova conta"
          ? "Convite pendente"
          : accessStatus === "Sem acesso"
            ? "Liberado"
            : accessStatus;
    const payload = {
      name: name.trim(),
      role,
      email: email.trim(),
      phone: phone.trim(),
      userId:
        accountMode === "Vincular usuario existente"
          ? userId.trim()
          : undefined,
      gymId: gymScope === "Unidade especifica" ? resolvedGymIds[0] : undefined,
      department,
      hireDate,
      contractType,
      supervisor,
      shift,
      accessStatus: resolvedAccessStatus,
      accountMode,
      accountEmail:
        accountMode === "Sem acesso" ? undefined : accountEmail.trim(),
      accountStatus:
        accountMode === "Sem acesso"
          ? "Sem conta"
          : accountMode === "Convidar nova conta"
            ? "Convite pendente"
            : "Conta vinculada",
      gymScope,
      gymIds: resolvedGymIds,
      salary: salary.trim() || "0 Kz",
      status,
      notes,
      permissions: selectedRole?.modules ?? employee?.permissions,
    };
    employee ? updateEmployee(employee.id, payload) : addEmployee(payload);
    toastSuccess(
      employee
        ? "Funcionario atualizado com sucesso"
        : "Funcionario criado com sucesso",
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title={employee ? "Editar funcionario" : "Novo funcionario"}
      description="Cadastre dados profissionais, acesso e permissao."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar funcionario
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title="1. Dados pessoais">
          <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr]">
            <FileUpload label="Foto opcional" />
            <FormInput
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FormInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FormInput
              label="Telefone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <FormInput
              label="Data de admissao"
              type="date"
              value={hireDate}
              onChange={(event) => setHireDate(event.target.value)}
            />
            <FormInput
              label="Salario mensal"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
            />
          </div>
        </Section>
        <Section title="2. Dados profissionais">
          <div className="grid gap-3 md:grid-cols-3">
            <FormSelect
              label="Funcao"
              options={roles.map((item) => item.name)}
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
            <FormSelect
              label="Departamento"
              options={[
                "Administracao",
                "Atendimento",
                "Tecnico",
                "Financeiro",
                "Comercial",
              ]}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
            <FormSelect
              label="Contrato"
              options={[
                "Tempo integral",
                "Meio periodo",
                "Prestador",
                "Estagiario",
              ]}
              value={contractType}
              onChange={(event) => setContractType(event.target.value)}
            />
            <FormInput
              label="Supervisor"
              value={supervisor}
              onChange={(event) => setSupervisor(event.target.value)}
            />
            <FormSelect
              label="Turno"
              options={["Manha", "Tarde", "Noite", "Rotativo"]}
              value={shift}
              onChange={(event) => setShift(event.target.value)}
            />
            <FormSelect
              label="Status"
              options={["Ativo", "Inativo", "Licenca", "Desligado"]}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            />
          </div>
        </Section>
        <Section title="3. Acesso e permissoes">
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <FormSelect
                label="Conta de acesso"
                options={[
                  "Sem acesso",
                  "Convidar nova conta",
                  "Vincular usuario existente",
                ]}
                value={accountMode}
                onChange={(event) =>
                  setAccountMode(
                    event.target.value as EmployeeRecord["accountMode"],
                  )
                }
              />
              {accountMode === "Convidar nova conta" ? (
                <FormInput
                  label="Email do convite"
                  type="email"
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                />
              ) : null}
              {accountMode === "Vincular usuario existente" ? (
                userOptions.length ? (
                  <FormSelect
                    label="Usuario existente"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {userOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                  </FormSelect>
                ) : (
                  <FormInput
                    label="ID do usuario existente"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                  />
                )
              ) : null}
              {accountMode !== "Sem acesso" ? (
                <FormSelect
                  label="Status de acesso"
                  options={["Liberado", "Bloqueado", "Convite pendente"]}
                  value={accessStatus}
                  onChange={(event) => setAccessStatus(event.target.value)}
                />
              ) : null}
            </div>
            <div className="space-y-3">
              <FormSelect
                label="Escopo de unidade"
                options={["Organizacao", "Unidade especifica", "Multiunidade"]}
                value={gymScope}
                onChange={(event) =>
                  setGymScope(event.target.value as EmployeeRecord["gymScope"])
                }
              />
              {gymScope !== "Organizacao" ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {gymOptions.map((gym) => (
                    <FormCheckbox
                      key={gym.id}
                      label={gym.name}
                      checked={gymIds.includes(gym.id)}
                      onChange={() => toggleGym(gym.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400">
                  A conta pode operar no contexto da organizacao. A senha
                  continua pertencendo ao usuario, nao ao cadastro do
                  funcionario.
                </p>
              )}
              <div className="grid gap-2 md:grid-cols-3">
                {(selectedRole?.modules ?? []).map((permission) => (
                  <FormCheckbox
                    key={permission}
                    label={permission}
                    checked
                    readOnly
                  />
                ))}
                {!selectedRole?.modules.length ? (
                  <p className="rounded-md border border-white/10 p-3 text-sm text-zinc-400">
                    Funcao sem permissoes configuradas.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Section>
        <FormTextarea
          label="Observacoes internas"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function RolesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const modules = [
    "Dashboard",
    "Check-in",
    "Clientes",
    "Planos",
    "Vendas",
    "Produtos",
    "Aulas",
    "Treinos",
    "Funcionários",
    "Relatórios",
    "Finanças",
    "Configurações",
  ];
  return (
    <Modal
      open={open}
      title="Funções e permissões"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Função criada com sucesso");
              onClose();
            }}
          >
            Criar função
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {["Administrador", "Gerente", "Recepção", "Instrutor"].map((role) => (
            <button
              key={role}
              className="block w-full rounded-md border border-white/10 p-3 text-left"
            >
              {role}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {modules.map((module) => (
            <FormCheckbox key={module} label={module} defaultChecked />
          ))}
        </div>
      </div>
    </Modal>
  );
}

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const parseNumericInput = (value: string, fallback = 0) => {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const moneyInputValue = (value?: string | number) => {
  if (typeof value === "number") return String(value);
  if (!value) return "";
  return String(parseNumericInput(value));
};

const formatPlanPrice = (value: number, duration: string) => {
  const suffix =
    duration === "Anual"
      ? "ano"
      : duration === "Trimestral"
        ? "trimestre"
        : duration === "Semestral"
          ? "semestre"
          : "mes";
  return `${value.toLocaleString("pt-AO")} Kz/${suffix}`;
};

export function FinanceEntryModal({
  open,
  kind,
  onClose,
}: {
  open: boolean;
  kind: "Receita" | "Despesa";
  onClose: () => void;
}) {
  const addRevenue = useFinanceStore((state) => state.addRevenue);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const financeCategories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useMemo(
    () =>
      financeCategories
        .filter((category) => category.kind === kind)
        .map((category) => category.name),
    [financeCategories, kind],
  );
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [methodOrSupplier, setMethodOrSupplier] = useState("");
  const [date, setDate] = useState(todayInputValue);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setCategory(categories[0] ?? "");
    setAccountId(
      accounts.find((account) => account.isDefault)?.id ??
        accounts[0]?.id ??
        "",
    );
    setValue("");
    setStatus(kind === "Receita" ? "Recebido" : "Pendente");
    setMethodOrSupplier(kind === "Receita" ? "Dinheiro" : "Fornecedor local");
    setDate(todayInputValue());
    setNote("");
  }, [categories, kind, open]);

  const save = () => {
    const parsedValue = Number(value);
    if (!category) {
      toastInfo(
        "Categoria obrigatoria",
        "Crie ou selecione uma categoria para continuar.",
      );
      return;
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      toastInfo("Valor invalido", "Informe um valor maior que zero.");
      return;
    }
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      toastInfo(
        "Conta obrigatoria",
        "Selecione uma conta para movimentar o financeiro.",
      );
      return;
    }

    const record = {
      category,
      value: parsedValue,
      date: date || "Hoje",
      status,
      note: note.trim() || methodOrSupplier,
      accountId: account.id,
      accountName: account.name,
      method:
        kind === "Receita"
          ? methodOrSupplier
          : status === "Pago"
            ? "Transferencia"
            : "A pagar",
      supplier: kind === "Despesa" ? methodOrSupplier : undefined,
      dueDate: status === "Pendente" ? date : undefined,
      paidAt: status === "Recebido" || status === "Pago" ? date : undefined,
    };

    kind === "Receita" ? addRevenue(record) : addExpense(record);
    toastSuccess(`${kind} criada com sucesso`);
    onClose();
  };
  return (
    <Modal
      open={open}
      title={kind === "Receita" ? "Adicionar receita" : "Adicionar despesa"}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormSelect
          label="Categoria"
          requiredMark
          options={categories.length ? categories : ["Sem categorias"]}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <FormInput
          label="Valor (Kz)"
          requiredMark
          type="number"
          min="1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ex: 25000"
        />
        <FormSelect
          label="Conta"
          requiredMark
          options={accounts.map((account) => account.name)}
          value={
            accounts.find((account) => account.id === accountId)?.name ?? ""
          }
          onChange={(event) =>
            setAccountId(
              accounts.find((account) => account.name === event.target.value)
                ?.id ?? "",
            )
          }
        />
        <FormSelect
          label={kind === "Receita" ? "Metodo de pagamento" : "Fornecedor"}
          options={
            kind === "Receita"
              ? ["Dinheiro", "Cartao", "Transferencia"]
              : ["Fornecedor local", "Equipe", "Prestador"]
          }
          value={methodOrSupplier}
          onChange={(event) => setMethodOrSupplier(event.target.value)}
        />
        <FormInput
          label="Data"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <FormSelect
          label="Status"
          options={
            kind === "Receita" ? ["Recebido", "Pendente"] : ["Pendente", "Pago"]
          }
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
        {kind === "Receita" ? (
          <FormSelect
            label="Cliente relacionado"
            options={[
              "Consumidor final",
              "Carlos Alberto Silva",
              "Ana Luisa Santos",
            ]}
          />
        ) : null}
        <FormTextarea
          className="sm:col-span-2"
          label="Observacao"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function FinanceCategoryModal({
  open,
  kind,
  onClose,
}: {
  open: boolean;
  kind: "Receita" | "Despesa";
  onClose: () => void;
}) {
  const addCategory = useFinanceStore((state) => state.addCategory);
  const updateCategory = useFinanceStore((state) => state.updateCategory);
  const removeCategory = useFinanceStore((state) => state.removeCategory);
  const categories = useFinanceStore((state) => state.categories).filter(
    (category) => category.kind === kind,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setEditingId("");
  }, [open]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da categoria.");
      return;
    }

    const saved = editingId
      ? updateCategory(editingId, {
          kind,
          name,
          description: description.trim() || undefined,
        })
      : addCategory({
          kind,
          name,
          description: description.trim() || undefined,
        });
    if (!saved) {
      toastInfo(
        "Categoria ja existe",
        "Escolha outro nome para esta categoria.",
      );
      return;
    }

    toastSuccess(
      editingId
        ? "Categoria atualizada com sucesso"
        : "Categoria criada com sucesso",
    );
    setName("");
    setDescription("");
    setEditingId("");
  };

  return (
    <Modal
      open={open}
      title={`Categorias de ${kind.toLowerCase()}`}
      description="Organize os lancamentos financeiros por categoria."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Fechar</Button>
          <Button
            variant="primary"
            icon={<Tag className="h-4 w-4" />}
            onClick={save}
          >
            {editingId ? "Salvar categoria" : "Criar categoria"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormInput
          label="Nome da categoria"
          requiredMark
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === "Despesa" ? "Ex: Limpeza" : "Ex: Eventos"}
        />
        <FormTextarea
          label="Descricao"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="rounded-lg border border-white/10">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-sm last:border-b-0"
            >
              <div>
                <p className="font-medium">{category.name}</p>
                {category.description ? (
                  <p className="text-xs text-zinc-400">
                    {category.description}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  className="h-8 px-3"
                  onClick={() => {
                    setEditingId(category.id);
                    setName(category.name);
                    setDescription(category.description ?? "");
                  }}
                >
                  Editar
                </Button>
                <Button
                  className="h-8 px-3"
                  onClick={() => {
                    const removed = removeCategory(category.id);
                    if (!removed)
                      toastInfo(
                        "Categoria em uso",
                        "Nao e possivel remover uma categoria com lancamentos.",
                      );
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function BankAccountsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Contas bancárias"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Conta salva com sucesso");
              onClose();
            }}
          >
            Salvar conta
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormInput label="Nome da conta" defaultValue="Conta BAI" />
        <FormInput label="Banco" defaultValue="BAI" />
        <FormInput
          label="IBAN"
          defaultValue="AO06 0040 0000 0000 0000 0000 0"
        />
        <FormInput label="Saldo inicial" defaultValue="53500" />
      </div>
    </Modal>
  );
}

export function FinanceAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addAccount = useFinanceStore((state) => state.addAccount);
  const accounts = useFinanceStore((state) => state.accounts);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [type, setType] = useState("Corrente");
  const [openingBalance, setOpeningBalance] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setBank("");
    setType("Corrente");
    setOpeningBalance("");
    setIsDefault(!accounts.some((account) => account.isDefault));
  }, [accounts, open]);

  const save = () => {
    const balance = parseNumericInput(openingBalance);
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da conta.");
      return;
    }
    addAccount({
      name: name.trim(),
      bank: bank.trim() || undefined,
      type: type as
        | "Caixa"
        | "Corrente"
        | "Poupanca"
        | "Carteira movel"
        | "Cartao"
        | "Outro",
      openingBalance: balance,
      balance,
      isDefault,
      status: "Ativa",
    });
    toastSuccess("Conta salva com sucesso");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Contas financeiras"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Salvar conta
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput
            label="Nome da conta"
            requiredMark
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Conta BAI"
          />
          <FormInput
            label="Banco/instituicao"
            value={bank}
            onChange={(event) => setBank(event.target.value)}
            placeholder="Ex: BAI, BFA, Interno"
          />
          <FormSelect
            label="Tipo"
            options={[
              "Caixa",
              "Corrente",
              "Poupanca",
              "Carteira movel",
              "Cartao",
              "Outro",
            ]}
            value={type}
            onChange={(event) => setType(event.target.value)}
          />
          <FormInput
            label="Saldo inicial"
            type="number"
            min="0"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            placeholder="0"
          />
        </div>
        <FormSwitch
          label="Conta principal"
          checked={isDefault}
          onChange={setIsDefault}
        />
        <div className="rounded-lg border border-white/10">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-sm last:border-b-0"
            >
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-zinc-400">
                  {account.bank ?? "-"} | {account.type}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-noogym-lime">
                  {account.balance.toLocaleString("pt-AO")} Kz
                </p>
                {account.isDefault ? (
                  <p className="text-xs text-zinc-400">Principal</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function DebtorsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const clients = useClientsStore((state) => state.clients);
  const token = useAuthStore((state) => state.accessToken);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendReminder = async (client: ClientRecord, daysOverdue: number) => {
    if (!onlineOnly || !token) {
      toastInfo(
        "Mensagens online indisponiveis",
        "Entre no web-admin conectado a API para enviar.",
      );
      return;
    }

    const memberId = remoteIdOf(client, ["CLI"]);
    if (!memberId) {
      toastInfo(
        "Cliente nao sincronizado",
        "Sincronize este cliente com a API antes de enviar lembrete.",
      );
      return;
    }

    setSendingId(client.id);
    try {
      const message = await apiRequest<{ id: string }>("/messages", {
        method: "POST",
        token,
        body: {
          title: "Lembrete de pagamento Noogym",
          content: [
            `Ola ${client.name}.`,
            `Identificamos pagamento em atraso ha ${daysOverdue} dia(s).`,
            "Regularize a mensalidade para manter o acesso aos servicos Noogym.",
          ].join(" "),
          channel: "EMAIL",
          status: "DRAFT",
          memberIds: [memberId],
        },
      });
      const sent = await apiRequest<{ status?: string }>(
        `/messages/${message.id}/send`,
        { method: "PATCH", token },
      );
      if (sent.status === "FAILED") {
        toastError("Lembrete nao enviado", "A API registou falha na entrega.");
        return;
      }
      if (sent.status === "SCHEDULED") {
        toastSuccess("Lembrete em fila", client.name);
        return;
      }
      toastSuccess("Lembrete enviado", client.name);
    } catch (error) {
      toastError(
        "Lembrete nao enviado",
        error instanceof Error ? error.message : "A API nao confirmou o envio.",
      );
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Modal open={open} title="Inadimplência" size="md" onClose={onClose}>
      <div className="space-y-2">
        {clients.slice(0, 5).map((client, index) => (
          <div
            key={client.id}
            className="flex items-center gap-3 rounded-md border border-white/10 p-3"
          >
            <Avatar label={client.avatar ?? "CL"} />
            <div className="flex-1">
              <p>{client.name}</p>
              <p className="text-sm text-red-300">
                Pagamento em atraso há {index + 3} dias
              </p>
            </div>
            <Button
              disabled={sendingId === client.id}
              onClick={() => void sendReminder(client, index + 3)}
            >
              {sendingId === client.id ? "Enviando..." : "Enviar lembrete"}
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function SettingsModal({
  open,
  title,
  onClose,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description="Configure os parâmetros desta área."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Configurações salvas com sucesso");
              onClose();
            }}
          >
            Salvar configurações
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Nome da academia"
          defaultValue="Noogym Fitness Center"
        />
        <FormInput label="NIF" defaultValue="5001234567" />
        <FormSelect label="Moeda" options={["Kwanza (Kz)", "Dólar", "Euro"]} />
        <FormSelect label="Região" options={["Angola / Luanda"]} />
        <FormSwitch
          label="Backup automático"
          checked={true}
          onChange={() => undefined}
        />
        <FormSwitch
          label="Notificações automáticas"
          checked={true}
          onChange={() => undefined}
        />
        <FormTextarea
          className="col-span-2"
          label="Observações e regras"
          defaultValue="Regras preparadas para operação local-first e futura integração SQLite."
        />
      </div>
    </Modal>
  );
}

export function ReportExportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Exportar relatório"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Relatório exportado com sucesso");
              onClose();
            }}
          >
            Exportar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Tipo de relatório"
          options={[
            "Visão geral",
            "Financeiro",
            "Clientes",
            "Check-ins",
            "Planos",
            "Aulas",
            "Treinos",
            "Vendas POS",
            "Produtos",
            "Funcionários",
          ]}
        />
        <FormSelect label="Formato" options={["PDF", "Excel", "CSV", "JSON"]} />
        <FormInput label="Período" defaultValue="01/05/2026 - 08/05/2026" />
        <FormSelect label="Unidade" options={["Unidade Central"]} />
        <FormCheckbox label="Incluir gráficos" defaultChecked />
        <FormCheckbox label="Incluir detalhes" defaultChecked />
      </div>
    </Modal>
  );
}
