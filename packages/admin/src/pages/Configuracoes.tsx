import { Bell, Building2, CreditCard, Database, Globe2, KeyRound, Link2, QrCode, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { NoogymLogo } from "../components/brand/NoogymLogo";
import { Badge, Button, Card, FormInput, FormSelect, FormSwitch, FormTextarea, Modal, Tabs } from "@noogym/ui";
import { useAppStore } from "../store/appStore";
import { useSettingsStore } from "../store/settingsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";
import type { GymSettings, OrganizationSettings } from "../lib/settingsApi";

function Toggle({ on = true, onClick }: { on?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${on ? "bg-noogym-lime" : "bg-zinc-700"}`}>
      <span className={`h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

const configTabs = ["Geral", "Academia", "Financeiro", "Planos e contratos", "Check-in", "Notificacoes", "Usuarios e permissoes", "Integracoes", "Backup"];
const icons = [Building2, Globe2, CreditCard, ShieldCheck, QrCode, Bell, Users, Link2, Database];

const details: Record<string, string[]> = {
  Geral: ["Informacoes da academia", "Moeda: Kwanza (Kz)", "Configuracoes regionais: Angola / Luanda", "Backup e limpeza de dados", "Impostos e taxas"],
  Academia: ["Nome da academia", "NIF", "Endereco", "Telefones", "E-mail", "Logo", "Horarios de funcionamento"],
  Financeiro: ["Moeda", "Metodos de pagamento", "Taxas", "Recibos", "Faturacao"],
  "Planos e contratos": ["Regras de vencimento", "Congelamento", "Renovacao automatica", "Modelos de contrato"],
  "Check-in": ["Tipos de acesso", "QR Code", "Biometria", "Catracas", "Limites de acesso", "Tolerancia"],
  Notificacoes: ["WhatsApp", "E-mail", "SMS", "Lembretes automaticos"],
  "Usuarios e permissoes": ["Administradores", "Funcoes", "Permissoes"],
  Integracoes: ["Pagamentos", "WhatsApp Business", "Google Calendar", "Catracas", "API"],
  Backup: ["Backup local", "Backup em nuvem", "Retencao", "Exportacao de dados", "Restaurar backup"]
};

type SettingsScope = "organization" | "gym";

export default function Configuracoes() {
  const [tab, setTab] = useState("Geral");
  const [modal, setModal] = useState<{ title: string; scope: SettingsScope } | null>(null);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const organization = useSettingsStore((state) => state.organization);
  const gyms = useSettingsStore((state) => state.gyms);
  const users = useSettingsStore((state) => state.users);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const loadOnline = useSettingsStore((state) => state.loadOnline);
  const darkMode = theme === "dark";
  const Icon = icons[configTabs.indexOf(tab)] ?? KeyRound;
  const primaryGym = gyms[0];
  const configDescription = onlineOnly ? "Configuracao sincronizada com a API do servidor." : "Configuracao local-first preparada para sincronizacao posterior.";

  useEffect(() => {
    if (!onlineOnly) return;
    loadOnline().catch((error) => toastInfo("Configuracoes locais", error instanceof Error ? error.message : "Nao foi possivel carregar configuracoes da API."));
  }, [loadOnline, onlineOnly]);

  const openSettings = (item: string) => {
    const scope: SettingsScope = tab === "Academia" || item === "Endereco" || item === "Horarios de funcionamento" ? "gym" : "organization";
    setModal({ title: `${tab}: ${item}`, scope });
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Configuracoes"
          subtitle={isLoading ? "Sincronizando configuracoes com a API..." : "Gerencie as configuracoes do sistema e da sua academia."}
        />
        <Tabs tabs={configTabs} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-2 gap-4">
          {details[tab].map((item, index) => (
            <Card key={item} className="p-5">
              <div className="flex gap-4">
                <span className="icon-tile text-noogym-lime">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-semibold">{item}</h2>
                  <p className="mt-3 text-sm text-zinc-400">{settingHint(item, organization, primaryGym, configDescription)}</p>
                  {index % 2 === 0 ? (
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span>Ativo</span>
                      <Toggle />
                    </div>
                  ) : null}
                  <Button className="mt-5 min-w-32" onClick={() => openSettings(item)}>
                    Editar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-6">
          <h2 className="font-semibold">Informacoes da empresa</h2>
          <div className="mt-8 flex items-center gap-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] p-5">
              <NoogymLogo variant="mark" className="h-full w-full" />
            </div>
            <Button onClick={() => setModal({ title: "Academia: Logo", scope: "organization" })}>Alterar logo</Button>
          </div>
          <h3 className="mt-6 text-xl font-semibold">{organization?.name ?? "Noogym Fitness Center"}</h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <p>{primaryGym?.name ?? "Unidade Central"}</p>
            <p>Slug: {organization?.slug ?? "noogym"}</p>
            <p>{primaryGym?.address ?? "Avenida 21 de Janeiro, Luanda, Angola"}</p>
            <p>{organization?.phone ?? primaryGym?.phone ?? "+244 923 777 888"}</p>
            <p>{organization?.email ?? primaryGym?.email ?? "contato@noogym.com"}</p>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-5 font-semibold">Preferencias do sistema</h2>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p>Tema escuro</p>
              <p className="text-sm text-zinc-400">{darkMode ? "Manter tema escuro" : "Usar tema claro"}</p>
            </div>
            <Toggle on={darkMode} onClick={() => setTheme(darkMode ? "light" : "dark")} />
          </div>
          {["Sons do sistema", "Confirmacao de acoes", "Atualizacoes automaticas"].map((item) => (
            <div key={item} className="mb-5 flex items-center justify-between">
              <p>{item}</p>
              <Toggle on={item !== "Atualizacoes automaticas"} />
            </div>
          ))}
          <Button className="w-full" onClick={() => setModal({ title: "Restaurar padroes", scope: "organization" })}>
            Restaurar padroes
          </Button>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">{onlineOnly ? "Estado online" : "Estado local-first"}</h2>
          <Badge>{onlineOnly ? "Online" : "Local-First"}</Badge>
          <p className="mt-3 text-sm text-zinc-400">
            {onlineOnly
              ? `API ativa. ${organization?._count?.members ?? 0} clientes, ${organization?._count?.plans ?? 0} planos e ${users.length || organization?._count?.users || 0} usuarios.`
              : "Dados operacionais persistem localmente e ficam prontos para sincronizacao posterior."}
          </p>
        </Card>
      </aside>
      <SettingsEditorModal open={Boolean(modal)} title={modal?.title ?? "Configuracoes"} scope={modal?.scope ?? "organization"} organization={organization} gym={primaryGym} onClose={() => setModal(null)} />
    </div>
  );
}

function settingHint(item: string, organization: OrganizationSettings | null, gym: GymSettings | undefined, fallback: string) {
  if (item.includes("Moeda")) return `Moeda atual: ${organization?.currency ?? "AOA"}.`;
  if (item.includes("regionais")) return `Fuso horario: ${organization?.timezone ?? "Africa/Luanda"}.`;
  if (item === "Nome da academia" || item === "Informacoes da academia") return organization?.name ?? fallback;
  if (item === "Endereco") return gym?.address ?? fallback;
  if (item === "Telefones") return organization?.phone ?? gym?.phone ?? fallback;
  if (item === "E-mail") return organization?.email ?? gym?.email ?? fallback;
  return fallback;
}

function SettingsEditorModal({
  open,
  title,
  scope,
  organization,
  gym,
  onClose
}: {
  open: boolean;
  title: string;
  scope: SettingsScope;
  organization: OrganizationSettings | null;
  gym?: GymSettings;
  onClose: () => void;
}) {
  const saveOrganization = useSettingsStore((state) => state.saveOrganization);
  const savePrimaryGym = useSettingsStore((state) => state.savePrimaryGym);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("Angola");
  const [currency, setCurrency] = useState("AOA");
  const [timezone, setTimezone] = useState("Africa/Luanda");
  const [logoUrl, setLogoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (scope === "gym") {
      setName(gym?.name ?? organization?.name ?? "Unidade Central");
      setSlug(gym?.slug ?? "unidade-central");
      setEmail(gym?.email ?? organization?.email ?? "");
      setPhone(gym?.phone ?? organization?.phone ?? "");
      setAddress(gym?.address ?? "");
      setCity(gym?.city ?? "Luanda");
      setProvince(gym?.province ?? "Luanda");
      setCountry(gym?.country ?? "Angola");
      setLogoUrl(gym?.logoUrl ?? "");
      setIsActive(gym?.isActive ?? true);
      return;
    }

    setName(organization?.name ?? "Noogym Fitness Center");
    setSlug(organization?.slug ?? "noogym");
    setEmail(organization?.email ?? "");
    setPhone(organization?.phone ?? "");
    setWebsite(organization?.website ?? "");
    setCountry(organization?.country ?? "Angola");
    setCurrency(organization?.currency ?? "AOA");
    setTimezone(organization?.timezone ?? "Africa/Luanda");
    setLogoUrl(organization?.logoUrl ?? "");
  }, [gym, open, organization, scope]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome antes de salvar.");
      return;
    }

    const action = scope === "gym"
      ? savePrimaryGym({ name, slug, email: optional(email), phone: optional(phone), address: optional(address), city: optional(city), province: optional(province), country, logoUrl: optional(logoUrl), isActive })
      : saveOrganization({ name, slug, email: optional(email), phone: optional(phone), website: optional(website), country, currency, timezone, logoUrl: optional(logoUrl) });

    action
      .then(() => {
        toastSuccess("Configuracoes salvas com sucesso");
        onClose();
      })
      .catch((error) => toastInfo("Nao foi possivel salvar", error instanceof Error ? error.message : "Verifique a API e tente novamente."));
  };

  return (
    <Modal
      open={open}
      title={title}
      description={scope === "gym" ? "Atualize os dados da unidade principal na API." : "Atualize os dados da organizacao na API."}
      size="lg"
      onClose={onClose}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={isLoading} onClick={save}>{isLoading ? "Salvando..." : "Salvar configuracoes"}</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <FormInput label={scope === "gym" ? "Nome da unidade" : "Nome da academia"} requiredMark value={name} onChange={(event) => setName(event.target.value)} />
        <FormInput label="Slug" requiredMark value={slug} onChange={(event) => setSlug(event.target.value)} />
        <FormInput label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormInput label="Telefone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        {scope === "gym" ? (
          <>
            <FormInput className="col-span-2" label="Endereco" value={address} onChange={(event) => setAddress(event.target.value)} />
            <FormInput label="Cidade" value={city} onChange={(event) => setCity(event.target.value)} />
            <FormInput label="Provincia" value={province} onChange={(event) => setProvince(event.target.value)} />
            <FormSelect label="Pais" value={country} onChange={(event) => setCountry(event.target.value)} options={["Angola"]} />
            <FormSwitch label="Unidade ativa" checked={isActive} onChange={setIsActive} />
          </>
        ) : (
          <>
            <FormInput label="Website" value={website} onChange={(event) => setWebsite(event.target.value)} />
            <FormSelect label="Pais" value={country} onChange={(event) => setCountry(event.target.value)} options={["Angola"]} />
            <FormSelect label="Moeda" value={currency} onChange={(event) => setCurrency(event.target.value)} options={["AOA", "USD", "EUR"]} />
            <FormSelect label="Fuso horario" value={timezone} onChange={(event) => setTimezone(event.target.value)} options={["Africa/Luanda", "UTC"]} />
          </>
        )}
        <FormInput className="col-span-2" label="URL do logotipo" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
        <FormTextarea className="col-span-2" label="Observacoes internas" defaultValue="Configuracoes sincronizadas com a API Noogym ERP." />
      </div>
    </Modal>
  );
}

function optional(value: string) {
  return value.trim() || undefined;
}
