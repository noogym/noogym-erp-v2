import { Building2, Database, Edit, Globe2, Hash, Percent, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { NoogymLogo } from "../components/brand/NoogymLogo";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Tabs } from "../components/ui/Tabs";
import { useAppStore } from "../store/appStore";

function Toggle({ on = true, onClick }: { on?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`no-drag relative inline-flex h-6 w-12 items-center rounded-full transition ${on ? "bg-noogym-lime" : "bg-zinc-700"}`}
    >
      <span className={`h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function SettingsCard({ icon, title, children, button = "Editar" }: { icon: React.ReactNode; title: string; children: React.ReactNode; button?: string }) {
  return <Card className="p-5"><div className="flex gap-4"><span className="icon-tile text-noogym-lime">{icon}</span><div className="flex-1"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-3 text-sm text-zinc-300">{children}</div><Button className="mt-5 min-w-32">{button}</Button></div></div></Card>;
}

export default function Configuracoes() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const darkMode = theme === "dark";

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Configurações" subtitle="Gerencie as configurações do sistema e da sua academia." />
        <Tabs tabs={["Geral", "Academia", "Financeiro", "Planos e contratos", "Check-in", "Notificações", "Usuários e permissões", "Integrações", "Backup"]} active="Geral" onChange={() => undefined} />
        <div className="mt-5 grid grid-cols-2 gap-4">
          <SettingsCard icon={<Building2 className="h-5 w-5" />} title="Informações da academia"><p>Atualize os dados básicos da sua academia.</p></SettingsCard>
          <SettingsCard icon={<Database className="h-5 w-5" />} title="Moeda"><p className="flex justify-between">Moeda principal <span className="text-noogym-lime">Kwanza (Kz)</span></p><p className="flex justify-between">Casas decimais <span>2 casas</span></p></SettingsCard>
          <SettingsCard icon={<Globe2 className="h-5 w-5" />} title="Configurações regionais"><p className="flex justify-between">Idioma do sistema <span className="text-noogym-lime">Português (BR)</span></p><p className="flex justify-between">Fuso horário <span>(UTC+01:00) Luanda</span></p><p className="flex justify-between">Formato de data <span>DD/MM/YYYY</span></p></SettingsCard>
          <SettingsCard icon={<ShieldCheck className="h-5 w-5" />} title="Backup e segurança" button="Gerenciar backups"><p className="flex justify-between">Último backup <span>Hoje, 02:15</span></p><p className="flex justify-between">Backup automático <span className="text-noogym-lime">Ativado</span></p><p className="flex justify-between">Retenção de backups <span>30 dias</span></p></SettingsCard>
          <SettingsCard icon={<Hash className="h-5 w-5" />} title="Numerações e códigos" button="Configurar"><p>Configure a numeração de recibos, contratos, check-ins e outros documentos.</p></SettingsCard>
          <SettingsCard icon={<Trash2 className="h-5 w-5" />} title="Limpeza de dados" button="Executar limpeza"><p>Remova logs, registros antigos e dados que não são mais utilizados.</p></SettingsCard>
          <SettingsCard icon={<Percent className="h-5 w-5" />} title="Impostos e taxas" button="Configurar"><p>Gerencie impostos, taxas e configurações fiscais do sistema.</p></SettingsCard>
        </div>
      </div>
      <aside className="space-y-3">
        <Card className="p-6">
          <h2 className="font-semibold">Informações da empresa</h2>
          <div className="mt-8 flex items-center gap-6"><div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] p-5"><NoogymLogo variant="mark" className="h-full w-full" /></div><Button>Alterar logo</Button></div>
          <h3 className="mt-6 flex items-center gap-2 text-xl font-semibold">Noogym Fitness Center <Edit className="h-4 w-4" /></h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-300"><p>Unidade Central</p><p>NIF: 5001234567</p><p>Avenida 21 de Janeiro, 1234<br />Luanda, Angola</p><p>+244 923 777 888</p><p>contato@noogym.com</p></div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-5 font-semibold">Preferências do sistema</h2>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p>Tema escuro</p>
              <p className="text-sm text-zinc-400">{darkMode ? "Manter o tema escuro ativado" : "Usar tema claro no sistema"}</p>
            </div>
            <Toggle on={darkMode} onClick={() => setTheme(darkMode ? "light" : "dark")} />
          </div>
          {["Sons do sistema|Ativar sons em ações do sistema|1", "Confirmação de ações|Mostrar confirmação em ações críticas|1", "Atualizações automáticas|Baixar atualizações automaticamente|0"].map((row) => { const [title, desc, on] = row.split("|"); return <div key={title} className="mb-5 flex items-center justify-between"><div><p>{title}</p><p className="text-sm text-zinc-400">{desc}</p></div><Toggle on={on === "1"} /></div>; })}
          <Button className="w-full">Restaurar padrões</Button>
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Estado local-first</h2><Badge>Local-First</Badge><p className="mt-3 text-sm text-zinc-400">Dados operacionais persistem localmente e ficam preparados para sincronização posterior.</p></Card>
      </aside>
    </div>
  );
}
