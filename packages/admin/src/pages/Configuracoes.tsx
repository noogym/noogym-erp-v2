import {
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  FileText,
  Globe2,
  KeyRound,
  Link2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  Wifi
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, FormInput, FormSelect, FormSwitch, FormTextarea, Tabs } from "@noogym/ui";
import { NoogymLogo } from "../components/brand/NoogymLogo";
import { PageHeader } from "../components/layout/PageHeader";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { useAppStore } from "../store/appStore";
import { useOperationalSettingsStore, type OperationalSettings } from "../store/operationalSettingsStore";
import { useSettingsStore } from "../store/settingsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";
import type { GymSettings, OrganizationSettings } from "../lib/settingsApi";

const configTabs = [
  "Geral",
  "Academia",
  "Financeiro",
  "Impressao",
  "Planos e contratos",
  "Check-in",
  "Notificacoes",
  "Usuarios e permissoes",
  "Integracoes",
  "Backup"
];

type ConfigTab = (typeof configTabs)[number];

function useSaveOperationalSettings() {
  const saveOnline = useOperationalSettingsStore((state) => state.saveOnline);
  const isSaving = useOperationalSettingsStore((state) => state.isSaving);

  const saveOperational = (title = "Configuracoes salvas", message = "As alteracoes foram guardadas na API.") =>
    saveOnline()
      .then(() => toastSuccess(title, message))
      .catch((error) => toastInfo("Nao foi possivel salvar", error instanceof Error ? error.message : "Verifique a API e tente novamente."));

  return { isSaving, saveOperational };
}

export default function Configuracoes() {
  const [tab, setTab] = useState<ConfigTab>("Geral");
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const syncNow = useAppStore((state) => state.syncNow);
  const syncState = useAppStore((state) => state.syncState);
  const organization = useSettingsStore((state) => state.organization);
  const gyms = useSettingsStore((state) => state.gyms);
  const users = useSettingsStore((state) => state.users);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const loadOnline = useSettingsStore((state) => state.loadOnline);
  const loadOperationalSettings = useOperationalSettingsStore((state) => state.loadOnline);
  const primaryGym = gyms[0];
  const { isSaving, saveOperational } = useSaveOperationalSettings();

  useEffect(() => {
    Promise.all([loadOnline(), loadOperationalSettings()]).catch((error) => {
      toastInfo("Configuracoes locais", error instanceof Error ? error.message : "Nao foi possivel carregar configuracoes da API.");
    });
  }, [loadOnline, loadOperationalSettings]);

  const counters = useMemo(() => [
    { label: "Unidades", value: String(gyms.length || organization?._count?.gyms || 1), hint: primaryGym?.name ?? "Unidade principal", icon: Building2 },
    { label: "Usuarios", value: String(users.length || organization?._count?.users || 0), hint: "Acessos administrativos", icon: Users },
    { label: "Clientes", value: String(organization?._count?.members ?? 0), hint: onlineOnly ? "Sincronizado com API" : "Modo local-first", icon: ShieldCheck },
    { label: "Estado", value: onlineOnly ? "Online" : "Local", hint: isLoading ? "A carregar dados" : "Pronto para operar", icon: Wifi }
  ], [gyms.length, isLoading, onlineOnly, organization?._count?.gyms, organization?._count?.members, organization?._count?.users, primaryGym?.name, users.length]);

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="Configuracoes"
            subtitle={isLoading ? "Sincronizando configuracoes com a API..." : "Administre regras, unidade, acessos e operacao do sistema."}
          />
          <div className="flex flex-wrap gap-2">
            <Button icon={<RefreshCw className={`h-4 w-4 ${syncState === "syncing" ? "animate-spin" : ""}`} />} onClick={() => syncNow()}>
              Sincronizar
            </Button>
            <Button variant="primary" disabled={isSaving} icon={<Save className="h-4 w-4" />} onClick={() => saveOperational()}>
              {isSaving ? "Guardando..." : "Guardar estado"}
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {counters.map((item) => <StatusCard key={item.label} {...item} />)}
        </div>
      </div>

      <div className="panel p-6">
        <Tabs tabs={configTabs} active={tab} onChange={(next) => setTab(next as ConfigTab)} />
        <div className="mt-5">
          {tab === "Geral" ? <GeneralTab organization={organization} primaryGym={primaryGym} /> : null}
          {tab === "Academia" ? <GymTab organization={organization} gyms={gyms} primaryGym={primaryGym} /> : null}
          {tab === "Financeiro" ? <FinanceTab /> : null}
          {tab === "Impressao" ? <PrintingTab /> : null}
          {tab === "Planos e contratos" ? <ContractsTab /> : null}
          {tab === "Check-in" ? <CheckinTab /> : null}
          {tab === "Notificacoes" ? <NotificationsTab /> : null}
          {tab === "Usuarios e permissoes" ? <UsersTab users={users} /> : null}
          {tab === "Integracoes" ? <IntegrationsTab /> : null}
          {tab === "Backup" ? <BackupTab /> : null}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Building2 }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="icon-tile text-noogym-lime">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-2 truncate text-xs text-noogym-lime">{hint}</p>
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof Building2; title: string; description: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="icon-tile text-noogym-lime">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

function GeneralTab({ organization, primaryGym }: { organization: OrganizationSettings | null; primaryGym?: GymSettings }) {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const settings = useOperationalSettingsStore((state) => state.settings);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const resetOperationalSettingsOnline = useOperationalSettingsStore((state) => state.resetOperationalSettingsOnline);
  const isSavingOperational = useOperationalSettingsStore((state) => state.isSaving);
  const saveOrganization = useSettingsStore((state) => state.saveOrganization);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const [form, setForm] = useState(() => organizationForm(organization));

  useEffect(() => {
    setForm(organizationForm(organization));
  }, [organization]);

  const save = () => {
    if (!form.name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da organizacao.");
      return;
    }

    saveOrganization({
      name: form.name,
      slug: form.slug,
      email: optional(form.email),
      phone: optional(form.phone),
      website: optional(form.website),
      country: form.country,
      currency: form.currency,
      timezone: form.timezone,
      logoUrl: optional(form.logoUrl)
    })
      .then(() => toastSuccess("Organizacao atualizada", "Os dados gerais foram guardados."))
      .catch((error) => toastInfo("Nao foi possivel salvar", error instanceof Error ? error.message : "Verifique a API e tente novamente."));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card className="p-5">
          <SectionTitle icon={Building2} title="Identidade da organizacao" description="Dados principais usados em recibos, relatorios, contratos e cabecalhos do sistema." />
          <div className="grid gap-3 md:grid-cols-2">
            <FormInput label="Nome da organizacao" requiredMark value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <FormInput label="Slug" requiredMark value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <FormInput label="E-mail" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <FormInput label="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <FormInput label="Website" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
            <FormInput label="URL do logotipo" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
            <FormSelect label="Pais" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} options={["Angola"]} />
            <FormSelect label="Fuso horario" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} options={["Africa/Luanda", "UTC"]} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled={isLoading} icon={<Save className="h-4 w-4" />} onClick={save}>
              {isLoading ? "Salvando..." : "Salvar dados gerais"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={Globe2} title="Preferencias do sistema" description="Controles locais que afetam a experiencia da equipa neste terminal." />
          <div className="grid gap-3 md:grid-cols-2">
            <FormSwitch label="Tema escuro" description="Mantem o painel no visual operacional escuro." checked={theme === "dark"} onChange={(checked) => setTheme(checked ? "dark" : "light")} />
            <FormSwitch label="Sons do sistema" checked={settings.preferences.sounds} onChange={(sounds) => updateSection("preferences", { sounds })} />
            <FormSwitch label="Confirmacao de acoes" checked={settings.preferences.confirmations} onChange={(confirmations) => updateSection("preferences", { confirmations })} />
            <FormSwitch label="Atualizacoes automaticas" checked={settings.preferences.autoUpdates} onChange={(autoUpdates) => updateSection("preferences", { autoUpdates })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={isSavingOperational} onClick={() => resetOperationalSettingsOnline().then(() => toastSuccess("Padroes restaurados", "Configuracoes operacionais repostas na API.")).catch((error) => toastInfo("Nao foi possivel restaurar", error instanceof Error ? error.message : "Verifique a API e tente novamente."))}>
              {isSavingOperational ? "Restaurando..." : "Restaurar padroes operacionais"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle icon={ShieldCheck} title="Resumo da empresa" description="Identificacao rapida da organizacao ativa." />
        <div className="flex items-center gap-5">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] p-5">
            <NoogymLogo variant="mark" className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold">{organization?.name ?? "Noogym Fitness Center"}</h3>
            <p className="mt-1 text-sm text-zinc-400">{primaryGym?.name ?? "Unidade Central"}</p>
            <span className="mt-3 inline-flex">
              <Badge>{organization?.currency ?? "AOA"}</Badge>
            </span>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-sm text-zinc-300">
          <InfoLine label="Slug" value={organization?.slug ?? "noogym"} />
          <InfoLine label="Endereco" value={primaryGym?.address ?? "Avenida 21 de Janeiro, Luanda"} />
          <InfoLine label="Telefone" value={organization?.phone ?? primaryGym?.phone ?? "+244 923 777 888"} />
          <InfoLine label="E-mail" value={organization?.email ?? primaryGym?.email ?? "contato@noogym.com"} />
        </div>
      </Card>
    </div>
  );
}

function GymTab({ organization, gyms, primaryGym }: { organization: OrganizationSettings | null; gyms: GymSettings[]; primaryGym?: GymSettings }) {
  const saveGym = useSettingsStore((state) => state.saveGym);
  const deactivateGym = useSettingsStore((state) => state.deactivateGym);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const gymHours = useOperationalSettingsStore((state) => state.settings.gymHours);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const { isSaving, saveOperational } = useSaveOperationalSettings();
  const [formMode, setFormMode] = useState<"edit" | "create">("edit");
  const [editingGymId, setEditingGymId] = useState<string | null>(primaryGym?.id ?? null);
  const [gymToDeactivate, setGymToDeactivate] = useState<GymSettings | null>(null);
  const [gymToReactivate, setGymToReactivate] = useState<GymSettings | null>(null);
  const [form, setForm] = useState(() => gymForm(organization, primaryGym));
  const displayGyms = gyms.length ? gyms : [primaryGym ?? mockGym(organization)].filter(Boolean);
  const editingGym = editingGymId ? gyms.find((gym) => gym.id === editingGymId) : undefined;

  useEffect(() => {
    if (formMode === "edit" && !editingGymId && primaryGym?.id) setEditingGymId(primaryGym.id);
  }, [editingGymId, formMode, primaryGym?.id]);

  useEffect(() => {
    if (formMode === "create") return;
    setForm(gymForm(organization, editingGym ?? primaryGym));
  }, [editingGym, formMode, organization, primaryGym]);

  const save = () => {
    if (!form.name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da unidade.");
      return;
    }

    saveGym(formMode === "edit" ? editingGym?.id ?? null : null, {
      name: form.name,
      slug: form.slug,
      email: optional(form.email),
      phone: optional(form.phone),
      address: optional(form.address),
      city: optional(form.city),
      province: optional(form.province),
      country: form.country,
      logoUrl: optional(form.logoUrl),
      isActive: form.isActive
    })
      .then((gym) => {
        if (gym) {
          setEditingGymId(gym.id);
          setFormMode("edit");
        }
        toastSuccess(formMode === "create" ? "Unidade criada" : "Unidade atualizada", "Os dados da academia foram guardados na API.");
      })
      .catch((error) => toastInfo("Nao foi possivel salvar", error instanceof Error ? error.message : "Verifique a API e tente novamente."));
  };

  const startNewGym = () => {
    setFormMode("create");
    setEditingGymId(null);
    setForm(newGymForm());
  };

  const editGym = (gym: GymSettings) => {
    setFormMode("edit");
    setEditingGymId(gym.id);
    setForm(gymForm(organization, gym));
  };

  const requestDeactivateGym = (gym: GymSettings) => {
    if (gym.isActive === false) {
      toastInfo("Unidade ja inativa", `${gym.name} ja esta desativada.`);
      return;
    }

    if (gyms.length <= 1) {
      toastInfo("Unidade obrigatoria", "A organizacao precisa manter pelo menos uma unidade cadastrada.");
      return;
    }

    setGymToDeactivate(gym);
  };

  const confirmReactivateGym = () => {
    if (!gymToReactivate) return;

    saveGym(gymToReactivate.id, { isActive: true })
      .then((gym) => {
        toastSuccess("Unidade reativada", `${gym?.name ?? gymToReactivate.name} voltou a aparecer nas operacoes.`);
        setGymToReactivate(null);
      })
      .catch((error) => toastInfo("Nao foi possivel reativar", error instanceof Error ? error.message : "Verifique a API e tente novamente."));
  };

  const confirmDeactivateGym = () => {
    if (!gymToDeactivate) return;

    deactivateGym(gymToDeactivate.id)
      .then(() => {
        toastSuccess("Unidade desativada", `${gymToDeactivate.name} ficou inativa e o historico foi preservado.`);
        if (editingGymId === gymToDeactivate.id) {
          const nextGym = gyms.find((item) => item.id !== gymToDeactivate.id && item.isActive !== false);
          setFormMode("edit");
          setEditingGymId(nextGym?.id ?? null);
          setForm(gymForm(organization, nextGym));
        }
        setGymToDeactivate(null);
      })
      .catch((error) => toastInfo("Nao foi possivel desativar", error instanceof Error ? error.message : "Verifique a API e tente novamente."));
  };

  return (
    <>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <SectionTitle icon={Building2} title={formMode === "create" ? "Nova unidade" : "Editar unidade"} description="Dados operacionais da academia que aparecem em relatorios, check-in e recibos." />
            <Button variant={formMode === "create" ? "primary" : "secondary"} icon={<Plus className="h-4 w-4" />} onClick={startNewGym}>Nova unidade</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormInput label="Nome da unidade" requiredMark value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <FormInput label="Slug da unidade" requiredMark value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <FormInput className="md:col-span-2" label="Endereco" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            <FormInput label="Cidade" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            <FormInput label="Provincia" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} />
            <FormInput label="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <FormInput label="E-mail" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <FormSwitch label="Unidade ativa" checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled={isLoading} icon={<Save className="h-4 w-4" />} onClick={save}>
              {isLoading ? "Salvando..." : formMode === "create" ? "Criar unidade" : "Salvar unidade"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={CalendarClock} title="Horarios de funcionamento" description="Referencia operacional para aulas, check-in e atendimento." />
          <div className="grid gap-3 md:grid-cols-4">
            <FormInput label="Seg-Sex abre" type="time" value={gymHours.weekdaysStart} onChange={(event) => updateSection("gymHours", { weekdaysStart: event.target.value })} />
            <FormInput label="Seg-Sex fecha" type="time" value={gymHours.weekdaysEnd} onChange={(event) => updateSection("gymHours", { weekdaysEnd: event.target.value })} />
            <FormInput label="Sabado abre" type="time" value={gymHours.saturdayStart} onChange={(event) => updateSection("gymHours", { saturdayStart: event.target.value })} />
            <FormInput label="Sabado fecha" type="time" value={gymHours.saturdayEnd} onChange={(event) => updateSection("gymHours", { saturdayEnd: event.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={isSaving} onClick={() => saveOperational("Horarios salvos", "Os horarios foram guardados na API.")}>
              {isSaving ? "Guardando..." : "Guardar horarios"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle icon={Globe2} title="Unidades cadastradas" description="Lista das academias vinculadas a organizacao." />
        <div className="space-y-3">
          {displayGyms.map((gym) => (
            <div key={gym.id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{gym.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">{gym.city ?? "Luanda"} - {gym.province ?? "Luanda"}</p>
                </div>
                <Badge>{gym.isActive === false ? "Inativa" : "Ativa"}</Badge>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{gym.address ?? "Endereco nao informado"}</p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button onClick={() => editGym(gym)}>Editar</Button>
                {gym.isActive === false ? (
                  <Button onClick={() => setGymToReactivate(gym)}>
                    Reativar
                  </Button>
                ) : (
                  <Button
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => requestDeactivateGym(gym)}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
    <ConfirmModal
      open={Boolean(gymToDeactivate)}
      title="Desativar unidade"
      message={`Deseja desativar ${gymToDeactivate?.name ?? "esta unidade"}? Ela deixara de aparecer nas operacoes principais, mas o historico continuara disponivel em relatorios e auditoria.`}
      confirmLabel="Desativar unidade"
      danger
      details={gymToDeactivate ? (
        <div className="space-y-2 text-sm text-zinc-300">
          <p><span className="text-zinc-400">Unidade:</span> {gymToDeactivate.name}</p>
          <p><span className="text-zinc-400">Endereco:</span> {gymToDeactivate.address ?? "Nao informado"}</p>
          <p><span className="text-zinc-400">Cidade:</span> {gymToDeactivate.city ?? "Nao informado"}</p>
        </div>
      ) : null}
      onClose={() => setGymToDeactivate(null)}
      onConfirm={confirmDeactivateGym}
    />
    <ConfirmModal
      open={Boolean(gymToReactivate)}
      title="Reativar unidade"
      message={`Deseja reativar ${gymToReactivate?.name ?? "esta unidade"}? Ela voltara a aparecer nas operacoes e na troca de unidade para os usuarios com permissao.`}
      confirmLabel="Reativar unidade"
      details={gymToReactivate ? (
        <div className="space-y-2 text-sm text-zinc-300">
          <p><span className="text-zinc-400">Unidade:</span> {gymToReactivate.name}</p>
          <p><span className="text-zinc-400">Endereco:</span> {gymToReactivate.address ?? "Nao informado"}</p>
          <p><span className="text-zinc-400">Cidade:</span> {gymToReactivate.city ?? "Nao informado"}</p>
        </div>
      ) : null}
      onClose={() => setGymToReactivate(null)}
      onConfirm={confirmReactivateGym}
    />
    </>
  );
}

function FinanceTab() {
  const settings = useOperationalSettingsStore((state) => state.settings);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const updatePaymentMethod = useOperationalSettingsStore((state) => state.updatePaymentMethod);
  const { isSaving, saveOperational } = useSaveOperationalSettings();
  const finance = settings.finance;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5">
        <SectionTitle icon={CreditCard} title="Regras financeiras" description="Parametros usados por vendas, recibos, cobrancas e relatorios financeiros." />
        <div className="grid gap-3 md:grid-cols-3">
          <FormSelect label="Moeda padrao" value={finance.currency} onChange={(event) => updateSection("finance", { currency: event.target.value })} options={["AOA", "USD", "EUR"]} />
          <FormInput label="Imposto/taxa" value={finance.taxName} onChange={(event) => updateSection("finance", { taxName: event.target.value })} />
          <FormInput label="Percentual da taxa" type="number" min="0" value={finance.taxRate} onChange={(event) => updateSection("finance", { taxRate: numberValue(event.target.value) })} />
          <FormInput label="Prefixo do recibo" value={finance.receiptPrefix} onChange={(event) => updateSection("finance", { receiptPrefix: event.target.value })} />
          <FormInput label="Serie fiscal" value={finance.invoiceSeries} onChange={(event) => updateSection("finance", { invoiceSeries: event.target.value })} />
          <FormTextarea className="md:col-span-3" label="Rodape do recibo" value={finance.receiptFooter} onChange={(event) => updateSection("finance", { receiptFooter: event.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={isSaving} icon={<Save className="h-4 w-4" />} onClick={() => saveOperational("Financeiro salvo", "As regras financeiras foram guardadas na API.")}>
            {isSaving ? "Salvando..." : "Salvar financeiro"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={FileText} title="Resumo fiscal" description="Configuracao atual aplicada ao POS e financas." />
        <div className="space-y-3 text-sm">
          <InfoLine label="Moeda" value={finance.currency} />
          <InfoLine label="Taxa" value={`${finance.taxName} ${finance.taxRate}%`} />
          <InfoLine label="Recibos" value={`${finance.receiptPrefix}-${finance.invoiceSeries}`} />
          <InfoLine label="Metodos ativos" value={String(finance.paymentMethods.filter((method) => method.enabled).length)} />
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <SectionTitle icon={CreditCard} title="Metodos de pagamento" description="Ative metodos, informe prazo de liquidacao e custos para o caixa." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-zinc-400">
              <tr>
                <th className="py-3">Metodo</th>
                <th className="py-3">Estado</th>
                <th className="py-3">Liquidacao</th>
                <th className="py-3">Taxa</th>
                <th className="py-3 text-right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {finance.paymentMethods.map((method) => (
                <tr key={method.id} className="border-b border-white/10">
                  <td className="py-3 font-medium">{method.name}</td>
                  <td className="py-3"><Badge>{method.enabled ? "Ativo" : "Inativo"}</Badge></td>
                  <td className="py-3">
                    <input
                      className="h-9 w-24 rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-noogym-lime/70"
                      type="number"
                      min="0"
                      value={method.settlementDays}
                      onChange={(event) => updatePaymentMethod(method.id, { settlementDays: numberValue(event.target.value) })}
                    />
                    <span className="ml-2 text-zinc-500">dias</span>
                  </td>
                  <td className="py-3">
                    <input
                      className="h-9 w-24 rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-noogym-lime/70"
                      type="number"
                      min="0"
                      value={method.feePercent}
                      onChange={(event) => updatePaymentMethod(method.id, { feePercent: numberValue(event.target.value) })}
                    />
                    <span className="ml-2 text-zinc-500">%</span>
                  </td>
                  <td className="py-3 text-right">
                    <Button onClick={() => updatePaymentMethod(method.id, { enabled: !method.enabled })}>
                      {method.enabled ? "Desativar" : "Ativar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PrintingTab() {
  const printing = useOperationalSettingsStore((state) => state.settings.printing);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const { isSaving, saveOperational } = useSaveOperationalSettings();
  const [printers, setPrinters] = useState<Array<{ id: string; name: string; connectionType: string; isDefault?: boolean }>>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);
  const printerBridge = typeof window === "undefined" ? undefined : window.noogym?.printer;
  const bridgeLabel = printerBridge ? "Desktop conectado" : "Bridge desktop indisponivel";

  const updatePrinting = (data: Partial<OperationalSettings["printing"]>) => updateSection("printing", data);

  const loadPrinters = () => {
    if (!printerBridge) {
      toastInfo("Impressao desktop", "Abra o Noogym Desktop para listar impressoras USB/Serial.");
      return;
    }

    printerBridge.list()
      .then((items) => {
        setPrinters(items);
        toastSuccess("Impressoras verificadas", items.length ? `${items.length} impressora(s) encontrada(s).` : "Nenhuma impressora USB/Serial retornada pela bridge.");
      })
      .catch((error) => toastInfo("Falha ao listar", error instanceof Error ? error.message : "Nao foi possivel listar impressoras."));
  };

  const testPrint = () => {
    if (!printerBridge) {
      toastInfo("Impressao desktop", "A impressao termica esta disponivel no aplicativo Desktop/Electron.");
      return;
    }

    const config = buildPrinterConfig(printing);
    const validation = validatePrintingConfig(printing);
    if (validation) {
      toastInfo("Configuracao incompleta", validation);
      return;
    }

    setIsTesting(true);
    printerBridge.printTestPage(config)
      .then((result) => result.success ? toastSuccess("Teste enviado", result.message) : toastInfo("Teste falhou", result.error || result.message))
      .catch((error) => toastInfo("Teste falhou", error instanceof Error ? error.message : "Nao foi possivel testar a impressora."))
      .finally(() => setIsTesting(false));
  };

  const openDrawer = () => {
    if (!printerBridge) {
      toastInfo("Gaveta de dinheiro", "A abertura de gaveta precisa do aplicativo Desktop/Electron.");
      return;
    }

    const validation = validatePrintingConfig(printing);
    if (validation) {
      toastInfo("Configuracao incompleta", validation);
      return;
    }

    setIsOpeningDrawer(true);
    printerBridge.openCashDrawer(buildPrinterConfig(printing))
      .then((result) => result.success ? toastSuccess("Pulso enviado", result.message) : toastInfo("Gaveta nao abriu", result.error || result.message))
      .catch((error) => toastInfo("Gaveta nao abriu", error instanceof Error ? error.message : "Nao foi possivel enviar o comando."))
      .finally(() => setIsOpeningDrawer(false));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Card className="p-5">
          <SectionTitle icon={Printer} title="Impressora padrao" description="Configure a impressora termica usada por POS, recibos, pagamentos e caixa." />
          <div className="grid gap-3 md:grid-cols-3">
            <FormSwitch label="Impressao ativa" checked={printing.enabled} onChange={(enabled) => updatePrinting({ enabled })} />
            <FormInput className="md:col-span-2" label="Nome da impressora" value={printing.defaultPrinterName} onChange={(event) => updatePrinting({ defaultPrinterName: event.target.value })} />
            <FormSelect label="Tipo de conexao" value={printing.connectionType} onChange={(event) => updatePrinting({ connectionType: event.target.value as OperationalSettings["printing"]["connectionType"] })} options={["network", "usb", "serial"]} />
            <FormSelect label="Perfil ESC/POS" value={printing.profile} onChange={(event) => updatePrinting({ profile: event.target.value as OperationalSettings["printing"]["profile"] })} options={["generic", "epson", "bematech", "xprinter", "rongta", "wintec"]} />
            <FormSelect label="Largura do papel" value={String(printing.paperWidth)} onChange={(event) => updatePrinting({ paperWidth: Number(event.target.value) as 58 | 80 })} options={["58", "80"]} />
          </div>

          {printing.connectionType === "network" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FormInput className="md:col-span-2" label="IP/Host da impressora" value={printing.networkHost} onChange={(event) => updatePrinting({ networkHost: event.target.value })} />
              <FormInput label="Porta" type="number" min="1" value={printing.networkPort} onChange={(event) => updatePrinting({ networkPort: numberValue(event.target.value, 9100) })} />
            </div>
          ) : null}

          {printing.connectionType === "usb" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <FormInput label="Dispositivo USB" value={printing.usbDeviceName} onChange={(event) => updatePrinting({ usbDeviceName: event.target.value })} />
              <Button onClick={loadPrinters}>Listar impressoras</Button>
            </div>
          ) : null}

          {printing.connectionType === "serial" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FormInput label="Porta serial" value={printing.serialPath} onChange={(event) => updatePrinting({ serialPath: event.target.value })} />
              <Button className="self-end" onClick={loadPrinters}>Listar portas</Button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button disabled={isSaving} onClick={() => saveOperational("Impressora salva", "A configuracao de impressao foi guardada na API.")}>
              {isSaving ? "Salvando..." : "Salvar impressora"}
            </Button>
            <Button variant="primary" disabled={isTesting} icon={<Printer className="h-4 w-4" />} onClick={testPrint}>
              {isTesting ? "Testando..." : "Testar impressao"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={CreditCard} title="Gaveta de dinheiro" description="Configure o pulso ESC/POS para abrir a gaveta conectada a impressora." />
          <div className="grid gap-3 md:grid-cols-3">
            <FormSwitch label="Gaveta ativa" checked={printing.cashDrawerEnabled} onChange={(cashDrawerEnabled) => updatePrinting({ cashDrawerEnabled })} />
            <FormSwitch label="Abrir no pagamento em dinheiro" checked={printing.openDrawerOnCashPayment} onChange={(openDrawerOnCashPayment) => updatePrinting({ openDrawerOnCashPayment })} />
            <FormSwitch label="Imprimir recibo automaticamente" checked={printing.autoPrintReceipt} onChange={(autoPrintReceipt) => updatePrinting({ autoPrintReceipt })} />
            <FormSelect label="Pino" value={String(printing.cashDrawerPin)} onChange={(event) => updatePrinting({ cashDrawerPin: Number(event.target.value) as 0 | 1 })} options={["0", "1"]} />
            <FormInput label="Pulso ligado (ms)" type="number" min="1" value={printing.cashDrawerOnTimeMs} onChange={(event) => updatePrinting({ cashDrawerOnTimeMs: numberValue(event.target.value, 50) })} />
            <FormInput label="Pulso desligado (ms)" type="number" min="1" value={printing.cashDrawerOffTimeMs} onChange={(event) => updatePrinting({ cashDrawerOffTimeMs: numberValue(event.target.value, 250) })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={isOpeningDrawer || !printing.cashDrawerEnabled} onClick={openDrawer}>
              {isOpeningDrawer ? "Abrindo..." : "Testar gaveta"}
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <SectionTitle icon={Printer} title="Estado de impressao" description="Resumo da configuracao aplicada ao Desktop." />
          <div className="space-y-3 text-sm">
            <InfoLine label="Bridge" value={bridgeLabel} />
            <InfoLine label="Conexao" value={printing.connectionType.toUpperCase()} />
            <InfoLine label="Papel" value={`${printing.paperWidth}mm`} />
            <InfoLine label="Perfil" value={printing.profile} />
            <InfoLine label="Gaveta" value={printing.cashDrawerEnabled ? "Ativa" : "Inativa"} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={Wifi} title="Impressoras detectadas" description="USB/Serial dependem da bridge do Desktop." />
          {printers.length ? (
            <div className="space-y-3">
              {printers.map((printer) => (
                <button
                  key={printer.id}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] p-3 text-left text-sm transition hover:border-noogym-lime/50"
                  onClick={() => updatePrinting({ defaultPrinterName: printer.name, connectionType: printer.connectionType as OperationalSettings["printing"]["connectionType"] })}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium">{printer.name}</span>
                    <Badge>{printer.isDefault ? "Padrao" : printer.connectionType}</Badge>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400">
              Nenhuma impressora listada ainda. Use LAN/IP ou clique em listar no Desktop.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function ContractsTab() {
  const contracts = useOperationalSettingsStore((state) => state.settings.contracts);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const { isSaving, saveOperational } = useSaveOperationalSettings();

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5">
        <SectionTitle icon={ShieldCheck} title="Regras de planos e contratos" description="Controla renovacao, vencimento, bloqueio e congelamento dos planos." />
        <div className="grid gap-3 md:grid-cols-3">
          <FormInput label="Dias de tolerancia" type="number" min="0" value={contracts.graceDays} onChange={(event) => updateSection("contracts", { graceDays: numberValue(event.target.value) })} />
          <FormInput label="Avisar renovacao com" type="number" min="0" value={contracts.renewalNoticeDays} onChange={(event) => updateSection("contracts", { renewalNoticeDays: numberValue(event.target.value) })} />
          <FormInput label="Maximo congelamento" type="number" min="0" value={contracts.maxFreezeDays} onChange={(event) => updateSection("contracts", { maxFreezeDays: numberValue(event.target.value) })} />
          <FormSwitch label="Renovacao automatica" checked={contracts.autoRenew} onChange={(autoRenew) => updateSection("contracts", { autoRenew })} />
          <FormSwitch label="Permitir congelamento" checked={contracts.allowFreeze} onChange={(allowFreeze) => updateSection("contracts", { allowFreeze })} />
          <FormSwitch label="Bloquear plano vencido" checked={contracts.blockOnOverdue} onChange={(blockOnOverdue) => updateSection("contracts", { blockOnOverdue })} />
          <FormTextarea className="md:col-span-3" label="Modelo padrao de contrato" value={contracts.defaultContractModel} onChange={(event) => updateSection("contracts", { defaultContractModel: event.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={isSaving} icon={<Save className="h-4 w-4" />} onClick={() => saveOperational("Regras salvas", "Planos e contratos foram guardados na API.")}>
            {isSaving ? "Salvando..." : "Salvar regras"}
          </Button>
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle icon={FileText} title="Impacto operacional" description="Como estas regras afetam o dia a dia." />
        <div className="space-y-3 text-sm text-zinc-300">
          <RuleLine active={contracts.blockOnOverdue} text="Planos vencidos bloqueiam check-in automaticamente." />
          <RuleLine active={contracts.autoRenew} text="Renovacao automatica fica disponivel nos planos recorrentes." />
          <RuleLine active={contracts.allowFreeze} text={`Congelamento permitido ate ${contracts.maxFreezeDays} dias.`} />
          <RuleLine active text={`Cliente recebe aviso ${contracts.renewalNoticeDays} dias antes do vencimento.`} />
        </div>
      </Card>
    </div>
  );
}

function CheckinTab() {
  const checkin = useOperationalSettingsStore((state) => state.settings.checkin);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const { isSaving, saveOperational } = useSaveOperationalSettings();
  const accessMethods = [
    { key: "manual", label: "Manual", description: "Recepcao registra entrada do cliente." },
    { key: "qrCode", label: "QR Code", description: "Cliente usa codigo pelo app ou cartao." },
    { key: "biometric", label: "Biometria", description: "Preparado para leitor biometrico." },
    { key: "turnstile", label: "Catraca", description: "Controle por equipamento externo." }
  ] as const;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5">
        <SectionTitle icon={QrCode} title="Regras de acesso" description="Defina como o aluno entra na unidade e quando deve ser bloqueado." />
        <div className="grid gap-3 md:grid-cols-2">
          {accessMethods.map((method) => (
            <FormSwitch
              key={method.key}
              label={method.label}
              description={method.description}
              checked={Boolean(checkin[method.key])}
              onChange={(value) => updateSection("checkin", { [method.key]: value })}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <FormInput label="Limite diario" type="number" min="1" value={checkin.dailyLimit} onChange={(event) => updateSection("checkin", { dailyLimit: numberValue(event.target.value, 1) })} />
          <FormInput label="Tolerancia" type="number" min="0" value={checkin.toleranceMinutes} onChange={(event) => updateSection("checkin", { toleranceMinutes: numberValue(event.target.value) })} />
          <FormInput label="Inicio acesso" type="time" value={checkin.accessStart} onChange={(event) => updateSection("checkin", { accessStart: event.target.value })} />
          <FormInput label="Fim acesso" type="time" value={checkin.accessEnd} onChange={(event) => updateSection("checkin", { accessEnd: event.target.value })} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <FormSwitch label="Bloquear plano vencido" checked={checkin.blockExpiredPlan} onChange={(blockExpiredPlan) => updateSection("checkin", { blockExpiredPlan })} />
          <FormSwitch label="Permitir check-in avulso" checked={checkin.allowGuestCheckin} onChange={(allowGuestCheckin) => updateSection("checkin", { allowGuestCheckin })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={isSaving} icon={<Save className="h-4 w-4" />} onClick={() => saveOperational("Check-in salvo", "As regras de acesso foram guardadas na API.")}>
            {isSaving ? "Salvando..." : "Salvar check-in"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={CheckCircle2} title="Politica atual" description="Resumo aplicado na recepcao." />
        <div className="space-y-3 text-sm">
          <InfoLine label="Janela" value={`${checkin.accessStart} - ${checkin.accessEnd}`} />
          <InfoLine label="Limite diario" value={`${checkin.dailyLimit} entrada(s)`} />
          <InfoLine label="Tolerancia" value={`${checkin.toleranceMinutes} min`} />
          <InfoLine label="Plano vencido" value={checkin.blockExpiredPlan ? "Bloqueia acesso" : "Permite acesso"} />
        </div>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const notifications = useOperationalSettingsStore((state) => state.settings.notifications);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const { isSaving, saveOperational } = useSaveOperationalSettings();

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5">
        <SectionTitle icon={Bell} title="Canais e automacoes" description="Escolha como o Noogym comunica eventos importantes aos clientes." />
        <div className="grid gap-3 md:grid-cols-3">
          <FormSwitch label="WhatsApp" checked={notifications.whatsapp} onChange={(whatsapp) => updateSection("notifications", { whatsapp })} />
          <FormSwitch label="E-mail" checked={notifications.email} onChange={(email) => updateSection("notifications", { email })} />
          <FormSwitch label="SMS" checked={notifications.sms} onChange={(sms) => updateSection("notifications", { sms })} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <FormInput label="Lembrete de vencimento" type="number" min="0" value={notifications.dueReminderDays} onChange={(event) => updateSection("notifications", { dueReminderDays: numberValue(event.target.value) })} />
          <FormSwitch label="Mensagem de aniversario" checked={notifications.birthdayMessage} onChange={(birthdayMessage) => updateSection("notifications", { birthdayMessage })} />
          <FormSwitch label="Enviar recibo de pagamento" checked={notifications.paymentReceipt} onChange={(paymentReceipt) => updateSection("notifications", { paymentReceipt })} />
          <FormSwitch label="Alerta de check-in" checked={notifications.checkinAlert} onChange={(checkinAlert) => updateSection("notifications", { checkinAlert })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={isSaving} icon={<Save className="h-4 w-4" />} onClick={() => saveOperational("Notificacoes salvas", "Os canais e automacoes foram guardados na API.")}>
            {isSaving ? "Salvando..." : "Salvar notificacoes"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={Bell} title="Templates ativos" description="Mensagens automaticas preparadas para envio." />
        <div className="space-y-3">
          <TemplateLine title="Plano a vencer" enabled days={notifications.dueReminderDays} />
          <TemplateLine title="Aniversario" enabled={notifications.birthdayMessage} />
          <TemplateLine title="Recibo de pagamento" enabled={notifications.paymentReceipt} />
          <TemplateLine title="Check-in realizado" enabled={notifications.checkinAlert} />
        </div>
      </Card>
    </div>
  );
}

function UsersTab({ users }: { users: Array<{ id: string; name: string; email: string; role: string; status: string }> }) {
  const [query, setQuery] = useState("");
  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <SectionTitle icon={Users} title="Usuarios" description="Contas com acesso ao sistema." />
          <p className="text-3xl font-semibold">{users.length}</p>
          <p className="mt-2 text-sm text-noogym-lime">Sincronizado com a API</p>
        </Card>
        <Card className="p-5">
          <SectionTitle icon={KeyRound} title="Permissoes" description="Geridas no modulo Funcionarios." />
          <p className="text-3xl font-semibold">12</p>
          <p className="mt-2 text-sm text-noogym-lime">Modulos controlaveis</p>
        </Card>
        <Card className="p-5">
          <SectionTitle icon={ShieldCheck} title="Seguranca" description="Bloqueio e convite ficam no cadastro do funcionario." />
          <p className="text-3xl font-semibold">{users.filter((user) => user.status === "Ativo").length}</p>
          <p className="mt-2 text-sm text-noogym-lime">Usuarios ativos</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle icon={Users} title="Lista de usuarios" description="Pesquise administradores, funcionarios e perfis de acesso." />
          <FormInput className="w-full md:w-80" label="Buscar usuario" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-zinc-400">
              <tr>
                <th className="py-3">Usuario</th>
                <th className="py-3">E-mail</th>
                <th className="py-3">Funcao</th>
                <th className="py-3">Estado</th>
                <th className="py-3 text-right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {(filteredUsers.length ? filteredUsers : fallbackUsers()).map((user) => (
                <tr key={user.id} className="border-b border-white/10">
                  <td className="py-3 font-medium">{user.name}</td>
                  <td className="py-3 text-zinc-300">{user.email}</td>
                  <td className="py-3">{user.role}</td>
                  <td className="py-3"><Badge>{user.status}</Badge></td>
                  <td className="py-3 text-right"><Button onClick={() => toastInfo("Permissoes", "Use o menu Funcionarios para editar funcoes e convites.")}>Gerir</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = useOperationalSettingsStore((state) => state.settings.integrations);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const { isSaving, saveOperational } = useSaveOperationalSettings();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <SectionTitle icon={Link2} title="Integracoes externas" description="Configure conectores usados por pagamentos, agenda, catracas e automacoes." />
        <div className="grid gap-3 md:grid-cols-2">
          <FormSwitch label="WhatsApp Business" checked={integrations.whatsappBusiness} onChange={(whatsappBusiness) => updateSection("integrations", { whatsappBusiness })} />
          <FormSwitch label="Google Calendar" checked={integrations.googleCalendar} onChange={(googleCalendar) => updateSection("integrations", { googleCalendar })} />
          <FormSwitch label="API publica" checked={integrations.publicApi} onChange={(publicApi) => updateSection("integrations", { publicApi })} />
          <FormSelect label="Gateway de pagamento" value={integrations.paymentGateway} onChange={(event) => updateSection("integrations", { paymentGateway: event.target.value })} options={["Nenhum", "Multicaixa Express", "EMIS", "Stripe", "Outro"]} />
          <FormSelect label="Fornecedor de catraca" value={integrations.turnstileProvider} onChange={(event) => updateSection("integrations", { turnstileProvider: event.target.value })} options={["Nenhum", "Henry", "Topdata", "ZKTeco", "Outro"]} />
          <FormInput label="Webhook URL" value={integrations.webhookUrl} onChange={(event) => updateSection("integrations", { webhookUrl: event.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={isSaving} icon={<Save className="h-4 w-4" />} onClick={() => saveOperational("Integracoes salvas", "Os conectores foram guardados na API.")}>
            {isSaving ? "Salvando..." : "Salvar integracoes"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={Wifi} title="Estado dos conectores" description="Visao rapida do que esta ativo." />
        <div className="space-y-3">
          <IntegrationLine title="WhatsApp Business" active={integrations.whatsappBusiness} />
          <IntegrationLine title={`Pagamentos: ${integrations.paymentGateway}`} active={integrations.paymentGateway !== "Nenhum"} />
          <IntegrationLine title="Google Calendar" active={integrations.googleCalendar} />
          <IntegrationLine title={`Catraca: ${integrations.turnstileProvider}`} active={integrations.turnstileProvider !== "Nenhum"} />
          <IntegrationLine title="API publica" active={integrations.publicApi} />
        </div>
      </Card>
    </div>
  );
}

function BackupTab() {
  const backup = useOperationalSettingsStore((state) => state.settings.backup);
  const updateSection = useOperationalSettingsStore((state) => state.updateSection);
  const runBackup = useOperationalSettingsStore((state) => state.runBackup);
  const { isSaving, saveOperational } = useSaveOperationalSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const backupBridge = typeof window === "undefined" ? undefined : window.noogym?.backup;

  const exportDesktopBackup = () => {
    if (!backupBridge) {
      toastInfo("Backup desktop", "Abra o Noogym Desktop para exportar dados locais para ficheiro.");
      return;
    }

    setIsExporting(true);
    backupBridge.exportLocalData(buildLocalBackupPayload())
      .then((result) => {
        if (result.canceled) return;
        result.success ? toastSuccess("Backup exportado", result.path ?? result.message) : toastInfo("Backup nao exportado", result.message);
      })
      .catch((error) => toastInfo("Backup nao exportado", error instanceof Error ? error.message : "Nao foi possivel exportar o backup."))
      .finally(() => setIsExporting(false));
  };

  const restoreDesktopBackup = () => {
    if (!backupBridge) {
      toastInfo("Backup desktop", "Abra o Noogym Desktop para restaurar dados locais.");
      return;
    }

    setIsRestoring(true);
    backupBridge.importLocalData()
      .then((result) => {
        if (result.canceled) return;
        if (!result.success || !result.payload?.localStorage) {
          toastInfo("Backup nao restaurado", result.message);
          return;
        }

        restoreLocalBackupPayload(result.payload.localStorage);
        toastSuccess("Backup restaurado", "A aplicacao sera recarregada com os dados restaurados.");
        window.setTimeout(() => window.location.reload(), 700);
      })
      .catch((error) => toastInfo("Backup nao restaurado", error instanceof Error ? error.message : "Nao foi possivel restaurar o backup."))
      .finally(() => setIsRestoring(false));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5">
        <SectionTitle icon={Database} title="Backup e retencao" description="Controle exportacao de dados, retencao e rotina de copia." />
        <div className="grid gap-3 md:grid-cols-2">
          <FormSwitch label="Backup local" checked={backup.localBackup} onChange={(localBackup) => updateSection("backup", { localBackup })} />
          <FormSwitch label="Backup em nuvem" checked={backup.cloudBackup} onChange={(cloudBackup) => updateSection("backup", { cloudBackup })} />
          <FormInput label="Retencao em dias" type="number" min="1" value={backup.retentionDays} onChange={(event) => updateSection("backup", { retentionDays: numberValue(event.target.value, 1) })} />
          <FormInput label="Horario automatico" type="time" value={backup.autoBackupTime} onChange={(event) => updateSection("backup", { autoBackupTime: event.target.value })} />
          <FormSelect label="Formato de exportacao" value={backup.exportFormat} onChange={(event) => updateSection("backup", { exportFormat: event.target.value })} options={["JSON", "CSV", "XLSX"]} />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button disabled={isExporting} icon={<Download className="h-4 w-4" />} onClick={exportDesktopBackup}>{isExporting ? "Exportando..." : "Exportar dados"}</Button>
          <Button disabled={isRestoring} icon={<UploadCloud className="h-4 w-4" />} onClick={restoreDesktopBackup}>{isRestoring ? "Restaurando..." : "Restaurar"}</Button>
          <Button
            variant="primary"
            disabled={isSaving}
            icon={<Database className="h-4 w-4" />}
            onClick={() => {
              runBackup();
              saveOperational("Backup executado", "O estado do ultimo backup foi guardado na API.");
            }}
          >
            {isSaving ? "Executando..." : "Executar backup"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={Database} title="Estado do backup" description="Situacao atual de seguranca dos dados." />
        <div className="space-y-3 text-sm">
          <InfoLine label="Ultimo backup" value={backup.lastBackupAt} />
          <InfoLine label="Retencao" value={`${backup.retentionDays} dias`} />
          <InfoLine label="Local" value={backup.localBackup ? "Ativo" : "Inativo"} />
          <InfoLine label="Nuvem" value={backup.cloudBackup ? "Ativo" : "Inativo"} />
          <InfoLine label="Desktop" value={backupBridge ? "Bridge disponivel" : "Bridge indisponivel"} />
        </div>
      </Card>
    </div>
  );
}

const localBackupExcludedKeys = new Set(["noogym:auth"]);

function buildLocalBackupPayload() {
  const localStorageSnapshot: Record<string, string> = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("noogym:") || localBackupExcludedKeys.has(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) localStorageSnapshot[key] = value;
  }

  return {
    version: 1,
    source: "noogym-desktop",
    exportedAt: new Date().toISOString(),
    localStorage: localStorageSnapshot
  };
}

function restoreLocalBackupPayload(localStorageSnapshot: Record<string, string>) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("noogym:") && !localBackupExcludedKeys.has(key)) keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  Object.entries(localStorageSnapshot).forEach(([key, value]) => {
    if (key.startsWith("noogym:") && !localBackupExcludedKeys.has(key)) {
      window.localStorage.setItem(key, value);
    }
  });
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-2 last:border-b-0">
      <span className="text-zinc-400">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-zinc-100">{value || "-"}</span>
    </div>
  );
}

function RuleLine({ active, text }: { active: boolean; text: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-noogym-lime" : "bg-zinc-600"}`} />
      <span>{text}</span>
    </div>
  );
}

function TemplateLine({ title, enabled, days }: { title: string; enabled: boolean; days?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-zinc-400">{typeof days === "number" ? `${days} dias antes` : "Envio automatico"}</p>
      </div>
      <Badge>{enabled ? "Ativo" : "Inativo"}</Badge>
    </div>
  );
}

function IntegrationLine({ title, active }: { title: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
      <span>{title}</span>
      <Badge>{active ? "Ligado" : "Desligado"}</Badge>
    </div>
  );
}

function organizationForm(organization: OrganizationSettings | null) {
  return {
    name: organization?.name ?? "Noogym Fitness Center",
    slug: organization?.slug ?? "noogym",
    email: organization?.email ?? "",
    phone: organization?.phone ?? "",
    website: organization?.website ?? "",
    country: organization?.country ?? "Angola",
    currency: organization?.currency ?? "AOA",
    timezone: organization?.timezone ?? "Africa/Luanda",
    logoUrl: organization?.logoUrl ?? ""
  };
}

function gymForm(organization: OrganizationSettings | null, gym?: GymSettings) {
  return {
    name: gym?.name ?? organization?.name ?? "Unidade Central",
    slug: gym?.slug ?? "unidade-central",
    email: gym?.email ?? organization?.email ?? "",
    phone: gym?.phone ?? organization?.phone ?? "",
    address: gym?.address ?? "",
    city: gym?.city ?? "Luanda",
    province: gym?.province ?? "Luanda",
    country: gym?.country ?? "Angola",
    logoUrl: gym?.logoUrl ?? "",
    isActive: gym?.isActive ?? true
  };
}

function newGymForm() {
  return {
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    city: "Luanda",
    province: "Luanda",
    country: "Angola",
    logoUrl: "",
    isActive: true
  };
}

function mockGym(organization: OrganizationSettings | null): GymSettings {
  return {
    id: "local-gym",
    name: organization?.name ?? "Noogym Fitness Center",
    slug: "unidade-central",
    city: "Luanda",
    province: "Luanda",
    country: "Angola",
    isActive: true
  };
}

function fallbackUsers() {
  return [
    { id: "local-admin", name: "Admin", email: "admin@noogym.local", role: "Proprietario", status: "Ativo" }
  ];
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPrinterConfig(printing: OperationalSettings["printing"]) {
  return {
    name: printing.defaultPrinterName,
    connectionType: printing.connectionType,
    profile: printing.profile,
    paperWidth: printing.paperWidth,
    network: printing.connectionType === "network" ? {
      host: printing.networkHost.trim(),
      port: printing.networkPort || 9100,
      timeoutMs: 5000
    } : undefined,
    usb: printing.connectionType === "usb" ? {
      deviceName: printing.usbDeviceName.trim() || undefined
    } : undefined,
    serial: printing.connectionType === "serial" ? {
      path: printing.serialPath.trim(),
      baudRate: 9600
    } : undefined,
    cashDrawer: {
      enabled: printing.cashDrawerEnabled,
      pin: printing.cashDrawerPin,
      onTimeMs: printing.cashDrawerOnTimeMs,
      offTimeMs: printing.cashDrawerOffTimeMs
    }
  };
}

function validatePrintingConfig(printing: OperationalSettings["printing"]) {
  if (!printing.enabled) return "Ative a impressao antes de testar.";
  if (!printing.defaultPrinterName.trim()) return "Informe o nome da impressora padrao.";
  if (printing.connectionType === "network" && !printing.networkHost.trim()) return "Informe o IP/host da impressora LAN.";
  if (printing.connectionType === "serial" && !printing.serialPath.trim()) return "Informe a porta serial.";
  return "";
}

function optional(value: string) {
  return value.trim() || undefined;
}

export type { OperationalSettings };
