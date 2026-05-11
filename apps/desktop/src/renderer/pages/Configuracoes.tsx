import { Bell, Building2, CreditCard, Database, Globe2, KeyRound, Link2, QrCode, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { SettingsModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { NoogymLogo } from "../components/brand/NoogymLogo";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { useAppStore } from "../store/appStore";

function Toggle({ on = true, onClick }: { on?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${on ? "bg-noogym-lime" : "bg-zinc-700"}`}><span className={`h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-6" : "translate-x-1"}`} /></button>;
}

const configTabs = ["Geral", "Academia", "Financeiro", "Planos e contratos", "Check-in", "Notificações", "Usuários e permissões", "Integrações", "Backup"];
const icons = [Building2, Globe2, CreditCard, ShieldCheck, QrCode, Bell, Users, Link2, Database];

const details: Record<string, string[]> = {
  Geral: ["Informações da academia", "Moeda: Kwanza (Kz)", "Configurações regionais: Angola / Luanda", "Backup e limpeza de dados", "Impostos e taxas"],
  Academia: ["Nome da academia", "NIF", "Endereço", "Telefones", "E-mail", "Logo", "Horários de funcionamento"],
  Financeiro: ["Moeda", "Métodos de pagamento", "Taxas", "Recibos", "Faturação"],
  "Planos e contratos": ["Regras de vencimento", "Congelamento", "Renovação automática", "Modelos de contrato"],
  "Check-in": ["Tipos de acesso", "QR Code", "Biometria", "Catracas", "Limites de acesso", "Tolerância"],
  Notificações: ["WhatsApp", "E-mail", "SMS", "Lembretes automáticos"],
  "Usuários e permissões": ["Administradores", "Funções", "Permissões"],
  Integrações: ["Pagamentos", "WhatsApp Business", "Google Calendar", "Catracas", "API"],
  Backup: ["Backup local", "Backup em nuvem", "Retenção", "Exportação de dados", "Restaurar backup"]
};

export default function Configuracoes() {
  const [tab, setTab] = useState("Geral");
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const darkMode = theme === "dark";
  const Icon = icons[configTabs.indexOf(tab)] ?? KeyRound;

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Configurações" subtitle="Gerencie as configurações do sistema e da sua academia." />
        <Tabs tabs={configTabs} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-2 gap-4">
          {details[tab].map((item, index) => (
            <Card key={item} className="p-5">
              <div className="flex gap-4">
                <span className="icon-tile text-noogym-lime"><Icon className="h-5 w-5" /></span>
                <div className="flex-1">
                  <h2 className="font-semibold">{item}</h2>
                  <p className="mt-3 text-sm text-zinc-400">Configuração local-first preparada para futura integração com SQLite.</p>
                  {index % 2 === 0 ? <div className="mt-4 flex items-center justify-between text-sm"><span>Ativo</span><Toggle /></div> : null}
                  <Button className="mt-5 min-w-32" onClick={() => setModalTitle(`${tab}: ${item}`)}>Editar</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-6"><h2 className="font-semibold">Informações da empresa</h2><div className="mt-8 flex items-center gap-6"><div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] p-5"><NoogymLogo variant="mark" className="h-full w-full" /></div><Button onClick={() => setModalTitle("Academia: Logo")}>Alterar logo</Button></div><h3 className="mt-6 text-xl font-semibold">Noogym Fitness Center</h3><div className="mt-4 space-y-3 text-sm text-zinc-300"><p>Unidade Central</p><p>NIF: 5001234567</p><p>Avenida 21 de Janeiro, Luanda, Angola</p><p>+244 923 777 888</p><p>contato@noogym.com</p></div></Card>
        <Card className="p-6"><h2 className="mb-5 font-semibold">Preferências do sistema</h2><div className="mb-5 flex items-center justify-between"><div><p>Tema escuro</p><p className="text-sm text-zinc-400">{darkMode ? "Manter tema escuro" : "Usar tema claro"}</p></div><Toggle on={darkMode} onClick={() => setTheme(darkMode ? "light" : "dark")} /></div>{["Sons do sistema", "Confirmação de ações", "Atualizações automáticas"].map((item) => <div key={item} className="mb-5 flex items-center justify-between"><p>{item}</p><Toggle on={item !== "Atualizações automáticas"} /></div>)}<Button className="w-full" onClick={() => setModalTitle("Restaurar padrões")}>Restaurar padrões</Button></Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Estado local-first</h2><Badge>Local-First</Badge><p className="mt-3 text-sm text-zinc-400">Dados operacionais persistem localmente e ficam prontos para sincronização posterior.</p></Card>
      </aside>
      <SettingsModal open={Boolean(modalTitle)} title={modalTitle ?? "Configurações"} onClose={() => setModalTitle(null)} />
    </div>
  );
}
