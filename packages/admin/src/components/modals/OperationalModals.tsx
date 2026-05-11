import { Barcode, Check, CheckCircle2, Clock, CreditCard, Dumbbell, Info, QrCode, Search, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
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
import { useCheckinsStore } from "../../store/checkinsStore";
import { useClassesStore } from "../../store/classesStore";
import { useClientsStore } from "../../store/clientsStore";
import { useEmployeesStore } from "../../store/employeesStore";
import { useFinanceStore } from "../../store/financeStore";
import { usePlansStore } from "../../store/plansStore";
import { useProductsStore } from "../../store/productsStore";
import { useSalesStore } from "../../store/salesStore";
import { useWorkoutsStore } from "../../store/workoutsStore";
import { toastInfo, toastSuccess } from "../../store/toastStore";
import type { ClassRecord, EmployeeRecord, PlanRecord, ProductRecord, WorkoutRecord } from "@noogym/types";

const today = "Hoje, 10:30";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-noogym-lime">{title}</h3>
      {children}
    </section>
  );
}

export function ManualCheckinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useClientsStore((state) => state.clients);
  const addCheckin = useCheckinsStore((state) => state.addCheckin);
  const [query, setQuery] = useState("");
  const [accessType, setAccessType] = useState("Entrada");
  const selected = clients.find((client) => `${client.name} ${client.id} ${client.email} ${client.phone}`.toLowerCase().includes(query.toLowerCase())) ?? clients[0];

  const confirm = () => {
    addCheckin({ clientName: selected.name, clientId: selected.id, type: "Manual", accessType, dateTime: today });
    toastSuccess("Check-in realizado", `${selected.name} registado com sucesso.`);
    onClose();
  };

  return (
    <Modal open={open} title="Check-in manual" description="Realize o check-in de um aluno informando os dados manualmente." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={confirm}>Confirmar check-in</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Section title="1. Buscar aluno">
            <div className="flex gap-2 border-b border-white/10 text-sm">
              {["Buscar por nome", "Buscar por código", "Buscar por e-mail", "Buscar por telefone"].map((tab, index) => <span key={tab} className={`px-3 py-2 ${index === 0 ? "border-b border-noogym-lime text-noogym-lime" : "text-zinc-400"}`}>{tab}</span>)}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input className="h-11 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 outline-none focus:border-noogym-lime/70" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite nome, código, e-mail ou telefone..." />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-noogym-lime">Aluno encontrado</p>
              <div className="flex items-center gap-4">
                <Avatar label={selected.avatar ?? "CL"} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="font-semibold">{selected.name}</p><Badge>Ativo</Badge></div>
                  <p className="text-sm text-zinc-300">Plano: {selected.plan}</p>
                  <p className="text-sm text-zinc-300">Código: {selected.id}</p>
                  <p className="text-sm text-zinc-300">E-mail: {selected.email}</p>
                  <p className="text-sm text-zinc-300">Telefone: {selected.phone}</p>
                </div>
                <div className="text-sm"><p className="text-zinc-400">Vencimento</p><p className="text-noogym-lime">{selected.expires}</p><p className="mt-3 text-zinc-400">Dias restantes</p><p className="text-noogym-lime">15 dias</p></div>
              </div>
            </div>
          </Section>
          <Section title="2. Informações do check-in">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Data e hora do check-in" defaultValue="08/05/2026 - 10:30" />
              <FormSelect label="Tipo de acesso" value={accessType} onChange={(event) => setAccessType(event.target.value)} options={["Entrada", "Saída"]} />
            </div>
            <FormTextarea label="Observações (opcional)" placeholder="Adicione alguma observação sobre o check-in..." maxLength={150} />
          </Section>
        </div>
        <Card className="p-5">
          <h3 className="text-noogym-lime">Resumo do check-in</h3>
          <div className="mt-8 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-noogym-lime/50 bg-noogym-lime/10"><CheckCircle2 className="h-12 w-12 text-noogym-lime" /></span>
            <p className="mt-4">Check-in será realizado com sucesso.</p>
          </div>
          <div className="mt-6 space-y-4 border-t border-white/10 pt-4 text-sm">
            <p className="flex items-center gap-3"><UsersRound className="h-4 w-4 text-zinc-400" /> {selected.name}</p>
            <p className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-zinc-400" /> {selected.plan}</p>
            <p className="flex items-center gap-3"><Clock className="h-4 w-4 text-zinc-400" /> 08/05/2026 - 10:30</p>
            <p className="flex items-center gap-3"><Info className="h-4 w-4 text-zinc-400" /> {accessType}</p>
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export function QrScannerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useClientsStore((state) => state.clients);
  const addCheckin = useCheckinsStore((state) => state.addCheckin);
  const [scanned, setScanned] = useState(false);
  const client = clients[0];
  const confirm = () => {
    addCheckin({ clientName: client.name, clientId: client.id, type: "QR Code", accessType: "Entrada", dateTime: today });
    toastSuccess("Check-in realizado", "QR Code confirmado com sucesso.");
    setScanned(false);
    onClose();
  };
  return (
    <Modal open={open} title="Escanear QR Code" description="Use a leitura simulada para identificar o aluno." size="md" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed border-noogym-lime/35 bg-black/30">
          {scanned ? <div><Avatar label={client.avatar ?? "CL"} className="mx-auto h-16 w-16" /><p className="mt-3 font-semibold">{client.name}</p><p className="text-sm text-zinc-400">{client.plan}</p></div> : <QrCode className="h-24 w-24 text-noogym-lime" />}
        </div>
        <div className="mt-5 grid w-full grid-cols-3 gap-3">
          <Button onClick={() => setScanned(true)}>Simular leitura</Button>
          <Button onClick={() => setScanned(true)}>Inserir código manualmente</Button>
          <Button onClick={onClose}>Cancelar</Button>
        </div>
        {scanned ? <Button className="mt-3 w-full" variant="primary" onClick={confirm}>Confirmar check-in</Button> : null}
      </div>
    </Modal>
  );
}

export function NewCheckinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useClientsStore((state) => state.clients);
  const addCheckin = useCheckinsStore((state) => state.addCheckin);
  const [tab, setTab] = useState("Buscar cliente");
  const client = clients[0];
  const confirm = () => {
    addCheckin({ clientName: client.name, clientId: client.id, type: tab === "Check-in avulso" ? "Manual" : "Presencial", accessType: "Entrada", dateTime: today });
    toastSuccess("Check-in realizado", "Resumo do dia atualizado.");
    onClose();
  };
  return (
    <Modal open={open} title="Novo check-in" description="Selecione o cliente e registre o check-in na unidade." size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={confirm}>Confirmar check-in</Button></>}>
      <Section title="1. Cliente">
        <div className="flex gap-6 border-b border-white/10 text-sm">
          {["Buscar cliente", "Check-in avulso"].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`py-2 ${tab === item ? "border-b border-noogym-lime text-noogym-lime" : "text-zinc-400"}`}>{item}</button>)}
        </div>
        <FormInput label="Busca por nome, CPF/BI ou código" placeholder="Digite o nome ou BI do cliente..." />
        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <Avatar label={client.avatar ?? "CL"} className="h-14 w-14" />
          <div className="flex-1"><p className="font-semibold">{client.name}</p><p className="text-sm text-zinc-400">BI: {client.document} • {client.plan}</p></div>
          <Badge>Ativo</Badge>
        </div>
      </Section>
      <Section title="2. Detalhes do check-in">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Data e hora" defaultValue="08/05/2026 10:30" />
          <FormSelect label="Tipo de check-in" options={["Presencial", "QR Code", "App", "Manual"]} />
        </div>
        <FormTextarea label="Observação opcional" placeholder="Adicione uma observação, se necessário..." />
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">Este check-in será contabilizado no plano do cliente conforme as regras de acesso da unidade.</div>
      </Section>
    </Modal>
  );
}

export function MessageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const send = () => { toastSuccess("Mensagem enviada", "Envio simulado concluído."); onClose(); };
  return (
    <Modal open={open} title="Enviar mensagem" size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={send}>Enviar</Button></>}>
      <div className="grid gap-3">
        <FormSelect label="Destinatários" options={["Todos", "Selecionados", "Por plano", "Por status"]} />
        <FormSelect label="Canal" options={["WhatsApp", "E-mail", "SMS"]} />
        <FormTextarea label="Mensagem" placeholder="Escreva a mensagem em português..." />
      </div>
    </Modal>
  );
}

export function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addClient = useClientsStore((state) => state.addClient);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const save = () => {
    if (!name.trim() || !phone.trim()) { toastInfo("Campos obrigatórios", "Informe pelo menos nome e telefone."); return; }
    addClient({ name, email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`, phone });
    toastSuccess("Cliente criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title="Novo cliente" description="Preencha as informações para cadastrar um novo cliente." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Cadastrar cliente</Button></>}>
      <div className="space-y-5">
        <Section title="1. Dados pessoais">
          <div className="grid grid-cols-[140px_1fr_180px] gap-3">
            <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-center text-sm text-zinc-400">Foto opcional<br />PNG, JPG até 5MB</div>
            <FormInput label="Nome completo" requiredMark value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite o nome completo" />
            <FormInput label="Data de nascimento" requiredMark placeholder="DD/MM/AAAA" />
            <FormInput label="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" />
            <FormInput label="Telefone" requiredMark value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+244 9XX XXX XXX" />
            <FormInput label="Documento/BI" placeholder="000000000LA000" />
            <FormSelect label="Sexo" options={["Selecione", "Feminino", "Masculino", "Outro"]} />
            <FormSelect label="Estado civil" options={["Selecione", "Solteiro(a)", "Casado(a)", "Outro"]} />
          </div>
        </Section>
        <Section title="2. Endereço">
          <div className="grid grid-cols-3 gap-3"><FormInput label="Endereço" placeholder="Rua, número, bairro" /><FormInput label="Cidade" placeholder="Luanda" /><FormSelect label="Província" options={["Luanda", "Benguela", "Huíla", "Huambo", "Cabinda"]} /><FormSelect label="País" options={["Angola"]} /><FormInput label="Código postal" placeholder="0000-000" /></div>
        </Section>
        <Section title="3. Informações adicionais">
          <div className="grid grid-cols-3 gap-3"><FormInput label="Profissão" /><FormSelect label="Como conheceu a academia?" options={["Indicação", "Redes sociais", "Publicidade", "Passou pela unidade"]} /><FormSelect label="Objetivo principal" options={["Hipertrofia", "Emagrecimento", "Saúde", "Condicionamento"]} /></div>
          <FormTextarea label="Observações" placeholder="Adicione observações sobre o cliente..." />
          <FormCheckbox label="Enviar boas-vindas por e-mail ou WhatsApp" defaultChecked />
        </Section>
      </div>
    </Modal>
  );
}

export function ProductFormModal({ open, product, onClose }: { open: boolean; product?: ProductRecord; onClose: () => void }) {
  const addProduct = useProductsStore((state) => state.addProduct);
  const updateProduct = useProductsStore((state) => state.updateProduct);
  const [active, setActive] = useState(product?.status !== "Inativo");
  const save = () => {
    if (product) updateProduct(product.id, { status: active ? "Ativo" : "Inativo" });
    else addProduct({ name: "Novo produto Noogym", category: "Suplementos", stock: 10, price: 25000, cost: 15000, emoji: "PRD", status: active ? "Ativo" : "Inativo" });
    toastSuccess(product ? "Produto atualizado com sucesso" : "Produto criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={product ? "Editar produto" : "Novo produto"} description={product ? "Altere as informações do produto abaixo." : "Preencha as informações para cadastrar um novo produto."} size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{product ? "Salvar alterações" : "Salvar produto"}</Button></>}>
      <div className="space-y-5">
        <Section title="1. Informações básicas"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome do produto" requiredMark defaultValue={product?.name} placeholder="Ex: Whey Protein 900g" /><FormSelect label="Categoria" requiredMark options={["Suplementos", "Roupas", "Acessórios", "Bebidas", "Outros"]} defaultValue={product?.category} /><FormInput label="Código de barras" defaultValue={product?.barcode} /><FormInput label="SKU" defaultValue={product?.sku} /></div><FormTextarea label="Descrição" placeholder="Descreva o produto..." defaultValue="Produto para venda no POS da unidade." /></Section>
        <Section title="2. Preço e estoque"><div className="grid grid-cols-4 gap-3"><FormInput label="Preço de venda (Kz)" requiredMark defaultValue={String(product?.price ?? 0)} /><FormInput label="Preço de custo (Kz)" requiredMark defaultValue={String(product?.cost ?? 0)} /><FormInput label="Estoque atual" requiredMark defaultValue={String(product?.stock ?? 0)} /><FormSelect label="Unidade" requiredMark options={["Unidade", "Caixa", "Pacote", "Kg", "Litro"]} /></div><div className="grid grid-cols-2 gap-3"><FormSwitch label="Controlar estoque" checked={true} onChange={() => undefined} /><FormInput label="Estoque mínimo" defaultValue="10" /></div></Section>
        <Section title="3. Imagem do produto (opcional)"><div className="grid grid-cols-[1fr_130px] gap-3"><FileUpload label="Clique para enviar ou arraste a imagem aqui" /><div className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-zinc-400">Pré-visualização</div></div></Section>
        <Section title="4. Status"><FormSwitch label="Produto ativo" description="Produtos inativos não ficam visíveis nas vendas POS." checked={active} onChange={setActive} /></Section>
      </div>
    </Modal>
  );
}

export function PlanFormModal({ open, plan, onClose }: { open: boolean; plan?: PlanRecord; onClose: () => void }) {
  const addPlan = usePlansStore((state) => state.addPlan);
  const updatePlan = usePlansStore((state) => state.updatePlan);
  const [color, setColor] = useState("#B6FF00");
  const save = () => {
    if (plan) updatePlan(plan.id, { name: plan.name });
    else addPlan({ name: "Plano Premium Mensal", description: "Acesso completo à academia.", category: "Musculação", price: "28.450 Kz/mês", duration: "Mensal", type: "Recorrente" });
    toastSuccess(plan ? "Plano atualizado com sucesso" : "Plano criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={plan ? "Editar plano" : "Novo plano"} description="Preencha as informações do plano." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{plan ? "Salvar alterações" : "Salvar plano"}</Button></>}>
      <div className="space-y-5">
        <Section title="1. Informações básicas"><div className="grid grid-cols-3 gap-3"><FormInput label="Nome do plano" requiredMark defaultValue={plan?.name} /><FormSelect label="Categoria" requiredMark options={["Musculação", "Funcional", "Lutas", "Natação", "Cross Training"]} /><FormSelect label="Tipo de plano" requiredMark options={["Recorrente", "Avulso", "Pré-pago", "Corporativo"]} /></div><FormTextarea label="Descrição" defaultValue={plan?.description} /></Section>
        <Section title="2. Preço e duração"><div className="grid grid-cols-4 gap-3"><FormInput label="Preço normal (Kz)" requiredMark defaultValue="28450" /><FormInput label="Preço promocional (Kz)" /><FormSelect label="Duração" requiredMark options={["Mensal", "Trimestral", "Semestral", "Anual"]} /><FormSelect label="Período de cobrança" requiredMark options={["Mensal", "Trimestral", "Anual"]} /><FormInput label="Taxa de matrícula (Kz)" defaultValue="0" /><FormSelect label="Dia do vencimento" options={["1", "5", "10", "15", "20", "30"]} /></div></Section>
        <Section title="3. Acesso e limitações"><div className="grid grid-cols-3 gap-3"><FormSelect label="Acesso à academia" options={["Livre", "Limitado", "Não incluso"]} /><FormSelect label="Acesso a aulas" options={["Todas", "Limitadas", "Não incluso"]} /><FormSelect label="Acesso a treinos" options={["Sim", "Não"]} /></div><div className="grid grid-cols-2 gap-3"><FormInput label="Dias por semana" defaultValue="Seg, Ter, Qua, Qui, Sex" /><FormSelect label="Horário de acesso" options={["Horário livre", "Manhã", "Tarde", "Noite"]} /></div><FormSwitch label="Permitir congelamento do plano" checked={true} onChange={() => undefined} /></Section>
        <Section title="4. Configurações adicionais"><div className="grid grid-cols-3 gap-3"><FormSwitch label="Plano ativo" checked={true} onChange={() => undefined} /><FormSwitch label="Exibir no app do aluno" checked={true} onChange={() => undefined} /><FormSwitch label="Permitir renovação automática" checked={true} onChange={() => undefined} /></div></Section>
        <Section title="5. Imagem e cor do plano"><div className="grid grid-cols-[1fr_260px] gap-3"><FileUpload label="Clique para enviar ou arraste a imagem aqui" /><div><p className="mb-3 text-sm">Cor do plano</p><ColorPicker value={color} onChange={setColor} /></div></div></Section>
      </div>
    </Modal>
  );
}

export function CategoryModal({ open, title = "Nova categoria", onClose }: { open: boolean; title?: string; onClose: () => void }) {
  const [color, setColor] = useState("#B6FF00");
  const save = () => { toastSuccess("Categoria criada com sucesso"); onClose(); };
  return (
    <Modal open={open} title={title} description="Crie uma nova categoria para organizar os registos." size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Criar categoria</Button></>}>
      <div className="space-y-5">
        <Section title="1. Informações da categoria"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome da categoria" requiredMark placeholder="Ex: Musculação" /><FormSelect label="Ícone da categoria" requiredMark options={["Musculação", "Cardio", "Produto", "Aula", "Plano"]} /></div><FormTextarea label="Descrição" /></Section>
        <Section title="2. Configurações"><div className="grid grid-cols-2 gap-3"><FormSwitch label="Status da categoria" checked={true} onChange={() => undefined} /><FormInput label="Ordem de exibição" type="number" defaultValue="1" /></div><p className="text-sm text-zinc-400">Cor da categoria</p><ColorPicker value={color} onChange={setColor} /></Section>
        <Section title="3. Vincular planos existentes"><FormSelect label="Planos existentes" options={["Selecione os planos", "Plano Premium Mensal", "Plano Basic"]} /></Section>
      </div>
    </Modal>
  );
}

export function FinalizeSaleModal({ open, total, onClose, onConfirmed }: { open: boolean; total: number; onClose: () => void; onConfirmed: () => void }) {
  const addSale = useSalesStore((state) => state.addSale);
  const [discount, setDiscount] = useState(0);
  const finalTotal = Math.max(0, total - discount);
  const confirm = () => {
    addSale({ total: finalTotal, seller: "Admin", type: "Venda normal", paymentMethod: "Dinheiro", dateTime: today });
    toastSuccess("Venda concluída", "Carrinho limpo e histórico atualizado.");
    onConfirmed();
    onClose();
  };
  return (
    <Modal open={open} title="Finalizar venda" description="Revise os detalhes e escolha a forma de pagamento." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={confirm}>Confirmar venda</Button></>}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <Section title="1. Dados da venda"><FormSelect label="Cliente opcional" options={["Carlos Alberto Silva", "Consumidor final"]} /><FormSelect label="Vendedor" options={["Admin", "Recepção"]} /><div className="grid grid-cols-2 gap-3"><FormSelect label="Tipo de venda" options={["Venda normal", "Orçamento"]} /><FormInput label="Data da venda" defaultValue="08/05/2026 10:30" /></div><FormTextarea label="Observação" /></Section>
          <Section title="2. Forma de pagamento"><div className="grid grid-cols-4 gap-3">{["Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "PIX/Referência", "Multi pagamento", "Credifit/crédito interno", "Vale presente"].map((method, index) => <button key={method} type="button" className={`min-h-20 rounded-lg border p-2 text-sm ${index === 0 ? "border-noogym-lime bg-noogym-lime/10 text-noogym-lime" : "border-white/10 bg-white/[0.03]"}`}>{method}</button>)}</div></Section>
        </div>
        <div className="space-y-5">
          <Section title="3. Resumo financeiro"><Card className="space-y-4 p-4"><p className="flex justify-between">Subtotal <span>{total.toLocaleString("pt-AO")} Kz</span></p><div className="flex items-end gap-3"><FormInput label="Desconto (Kz ou %)" type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /><Button onClick={() => setDiscount(Math.round(total * 0.1))}>10%</Button></div><p className="flex justify-between">Taxa <span>0 Kz</span></p><p className="flex justify-between border-t border-white/10 pt-4 text-xl font-semibold">Total <span className="text-noogym-lime">{finalTotal.toLocaleString("pt-AO")} Kz</span></p></Card><div className="rounded-lg border border-white/10 p-4 text-sm"><ShieldCheck className="mb-2 h-6 w-6 text-noogym-lime" />Ambiente seguro com dados protegidos localmente.</div></Section>
          <Section title="4. Observações internas"><FormTextarea label="Observações internas" /></Section>
        </div>
      </div>
    </Modal>
  );
}

export function BarcodeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const found = useProductsStore((state) => state.products[0]);
  return (
    <Modal open={open} title="Código de barras" size="sm" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Produto encontrado", found.name); onClose(); }}>Adicionar produto</Button></>}>
      <div className="space-y-4 text-center"><Barcode className="mx-auto h-16 w-16 text-noogym-lime" /><FormInput label="Código de barras" defaultValue="7891234567890" /><div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><p className="font-semibold">{found.name}</p><p className="text-sm text-zinc-400">Estoque: {found.stock} un</p></div></div>
    </Modal>
  );
}

export function ClassFormModal({ open, lesson, onClose }: { open: boolean; lesson?: ClassRecord; onClose: () => void }) {
  const addClass = useClassesStore((state) => state.addClass);
  const updateClass = useClassesStore((state) => state.updateClass);
  const save = () => { lesson ? updateClass(lesson.id, {}) : addClass({ name: "Spinning", category: "Cardio", instructor: "João Silva", seats: 25, duration: "55 min" }); toastSuccess(lesson ? "Aula atualizada com sucesso" : "Aula criada com sucesso"); onClose(); };
  return (
    <Modal open={open} title={lesson ? "Editar aula" : "Nova aula"} description="Preencha as informações da aula." size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{lesson ? "Salvar alterações" : "Salvar aula"}</Button></>}>
      <div className="space-y-5"><Section title="1. Informações básicas"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome da aula" requiredMark defaultValue={lesson?.name} /><FormSelect label="Categoria" requiredMark options={["Cardio", "Funcional", "Corpo e Mente", "Dança", "Luta"]} /></div><FormTextarea label="Descrição" defaultValue={lesson?.description} /><div className="grid grid-cols-3 gap-3"><FormInput label="Duração" requiredMark defaultValue={lesson?.duration ?? "55 min"} /><FormInput label="Capacidade" requiredMark defaultValue={String(lesson?.seats ?? 25)} /><FormSelect label="Instrutor" requiredMark options={["João Silva", "Lucas Ferreira", "Mariana Costa"]} /></div></Section><Section title="2. Equipamentos"><FormInput label="Equipamentos necessários" placeholder="Bike Spinning, Toalha, Garrafa de água" /></Section><Section title="3. Configurações"><div className="grid grid-cols-3 gap-3"><FormSwitch label="Aula ativa" checked={true} onChange={() => undefined} /><FormSwitch label="Permitir lista de espera" checked={true} onChange={() => undefined} /><FormSwitch label="Exige check-in" checked={false} onChange={() => undefined} /></div></Section></div>
    </Modal>
  );
}

export function WeeklyScheduleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const hours = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "18:00", "19:00", "20:00", "21:00"];
  const save = () => { toastSuccess("Horários salvos com sucesso"); onClose(); };
  return (
    <Modal open={open} title="Horário semanal" description="Defina os dias e horários em que a aula estará disponível." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar horários</Button></>}>
      <div className="mb-5 grid grid-cols-2 gap-3"><FormSelect label="Aula" options={["Spinning", "Funcional", "Yoga"]} /><FormSelect label="Instrutor (opcional)" options={["João Silva", "Lucas Ferreira"]} /></div>
      <div className="overflow-hidden rounded-lg border border-white/10"><div className="grid grid-cols-8 bg-white/[0.03] text-sm">{["Horários", ...days].map((label) => <div key={label} className="border-r border-white/10 p-3 text-center last:border-r-0">{label}</div>)}</div>{hours.map((hour, row) => <div key={hour} className="grid grid-cols-8 border-t border-white/10 text-sm"><div className="p-3 text-center">{hour}</div>{days.map((day, col) => <button key={`${day}-${hour}`} type="button" className="min-h-14 border-l border-white/10 p-1 hover:bg-noogym-lime/10">{(row + col) % 4 === 0 ? <span className="block rounded bg-noogym-lime/40 p-2 text-xs text-white">Spinning<br />João Silva</span> : null}</button>)}</div>)}</div>
    </Modal>
  );
}

export function EndClassModal({ open, lesson, onClose }: { open: boolean; lesson?: ClassRecord; onClose: () => void }) {
  const closeClass = useClassesStore((state) => state.closeClass);
  const confirm = () => { if (lesson) closeClass(lesson.id); toastSuccess("Aula encerrada com sucesso"); onClose(); };
  return (
    <Modal open={open} title="Encerrar aula" size="sm" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={confirm}>Encerrar aula</Button></>}>
      <div className="space-y-4"><p>Confirme o encerramento da aula em andamento.</p><div className="rounded-lg border border-white/10 p-4 text-sm"><p>Aula: {lesson?.name ?? "Spinning"}</p><p>Horário: Hoje, 10:00</p><p>Presentes: 23</p><p>Ausentes: 2</p></div><FormTextarea label="Observação opcional" /></div>
    </Modal>
  );
}

export function StudentsClassModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useClientsStore((state) => state.clients);
  return (
    <Modal open={open} title="Lista de alunos da aula" size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Presenças registadas com sucesso"); onClose(); }}>Salvar presenças</Button></>}>
      <div className="space-y-2">{clients.slice(0, 8).map((client, index) => <div key={client.id} className="flex items-center gap-3 rounded-md border border-white/10 p-3"><Avatar label={client.avatar ?? "CL"} /><span className="flex-1">{client.name}</span><FormCheckbox label={index < 6 ? "Presente" : "Ausente"} defaultChecked={index < 6} /></div>)}</div>
    </Modal>
  );
}

export function WorkoutFormModal({ open, workout, onClose }: { open: boolean; workout?: WorkoutRecord; onClose: () => void }) {
  const addWorkout = useWorkoutsStore((state) => state.addWorkout);
  const updateWorkout = useWorkoutsStore((state) => state.updateWorkout);
  const save = () => { workout ? updateWorkout(workout.id, {}) : addWorkout({ name: "Treino Hipertrofia A", client: "Carlos Alberto Silva" }); toastSuccess(workout ? "Treino atualizado com sucesso" : "Treino criado com sucesso"); onClose(); };
  return (
    <Modal open={open} title={workout ? "Editar treino" : "Novo treino"} size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar treino</Button></>}>
      <div className="space-y-5"><Section title="1. Dados do treino"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome do treino" defaultValue={workout?.name} /><FormSelect label="Cliente" options={["Carlos Alberto Silva", "Ana Luísa Santos"]} /><FormSelect label="Objetivo" options={["Hipertrofia", "Emagrecimento", "Força", "Condicionamento"]} /><FormSelect label="Nível" options={["Iniciante", "Intermediário", "Avançado"]} /><FormInput label="Duração média" defaultValue="60 min" /><FormInput label="Criado por" defaultValue="Admin" /></div></Section><Section title="2. Exercícios"><div className="rounded-lg border border-white/10 p-3 text-sm"><p>Supino reto • 4 séries • 10 repetições • 60s descanso</p><p className="mt-2">Agachamento livre • 4 séries • 12 repetições • 90s descanso</p><Button className="mt-3" icon={<Dumbbell className="h-4 w-4" />}>Adicionar exercício</Button></div></Section><FormTextarea label="Observações" /><FormSelect label="Status" options={["Ativo", "Rascunho", "Inativo"]} /></div>
    </Modal>
  );
}

export function ExerciseLibraryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Biblioteca de exercícios" size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Exercício criado com sucesso"); onClose(); }}>Salvar exercício</Button></>}>
      <div className="grid grid-cols-2 gap-3"><FormInput label="Nome" placeholder="Supino reto" /><FormSelect label="Grupo muscular" options={["Peito", "Costas", "Pernas", "Ombros", "Braços"]} /><FormSelect label="Equipamento" options={["Barra", "Halteres", "Máquina", "Peso corporal"]} /><FormSelect label="Nível" options={["Iniciante", "Intermediário", "Avançado"]} /><FormTextarea className="col-span-2" label="Instruções" /><FileUpload label="Vídeo/imagem opcional" /></div>
    </Modal>
  );
}

export function EmployeeFormModal({ open, employee, onClose }: { open: boolean; employee?: EmployeeRecord; onClose: () => void }) {
  const addEmployee = useEmployeesStore((state) => state.addEmployee);
  const updateEmployee = useEmployeesStore((state) => state.updateEmployee);
  const save = () => { employee ? updateEmployee(employee.id, {}) : addEmployee({ name: "Novo Funcionário", role: "Recepcionista", salary: "280.000 Kz" }); toastSuccess(employee ? "Funcionário atualizado com sucesso" : "Funcionário criado com sucesso"); onClose(); };
  return (
    <Modal open={open} title={employee ? "Editar funcionário" : "Novo funcionário"} size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar funcionário</Button></>}>
      <div className="grid grid-cols-2 gap-3"><FileUpload label="Foto opcional" /><FormInput label="Nome" defaultValue={employee?.name} /><FormInput label="E-mail" defaultValue={employee?.email} /><FormInput label="Telefone" defaultValue={employee?.phone} /><FormSelect label="Função" options={["Administrador", "Gerente", "Recepcionista", "Personal Trainer", "Instrutor de Aulas"]} /><FormInput label="Data de admissão" defaultValue="08/05/2026" /><FormInput label="Salário mensal" defaultValue={employee?.salary} /><FormSelect label="Status" options={["Ativo", "Inativo"]} /><div className="col-span-2 grid grid-cols-3 gap-2">{["Dashboard", "Check-in", "Clientes", "Vendas", "Produtos", "Finanças"].map((permission) => <FormCheckbox key={permission} label={permission} defaultChecked />)}</div></div>
    </Modal>
  );
}

export function RolesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const modules = ["Dashboard", "Check-in", "Clientes", "Planos", "Vendas", "Produtos", "Aulas", "Treinos", "Funcionários", "Relatórios", "Finanças", "Configurações"];
  return (
    <Modal open={open} title="Funções e permissões" size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Função criada com sucesso"); onClose(); }}>Criar função</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]"><div className="space-y-2">{["Administrador", "Gerente", "Recepção", "Instrutor"].map((role) => <button key={role} className="block w-full rounded-md border border-white/10 p-3 text-left">{role}</button>)}</div><div className="grid grid-cols-3 gap-2">{modules.map((module) => <FormCheckbox key={module} label={module} defaultChecked />)}</div></div>
    </Modal>
  );
}

export function FinanceEntryModal({ open, kind, onClose }: { open: boolean; kind: "Receita" | "Despesa"; onClose: () => void }) {
  const addRevenue = useFinanceStore((state) => state.addRevenue);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const save = () => { kind === "Receita" ? addRevenue({ value: 35000 }) : addExpense({ value: 25000 }); toastSuccess(`${kind} criada com sucesso`); onClose(); };
  return (
    <Modal open={open} title={kind === "Receita" ? "Adicionar receita" : "Adicionar despesa"} size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="grid grid-cols-2 gap-3"><FormSelect label="Categoria" options={kind === "Receita" ? ["Mensalidades", "Vendas POS", "Aulas avulsas"] : ["Salários", "Aluguel", "Marketing", "Manutenção"]} /><FormInput label="Valor" defaultValue="35000" /><FormSelect label={kind === "Receita" ? "Método de pagamento" : "Fornecedor"} options={kind === "Receita" ? ["Dinheiro", "Cartão", "Transferência"] : ["Fornecedor local", "Equipe", "Prestador"]} /><FormInput label="Data" defaultValue="08/05/2026" />{kind === "Receita" ? <FormSelect label="Cliente relacionado" options={["Carlos Alberto Silva", "Consumidor final"]} /> : <FormSelect label="Status" options={["Pendente", "Pago"]} />}<FormTextarea className="col-span-2" label="Observação" /></div>
    </Modal>
  );
}

export function BankAccountsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Contas bancárias" size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Conta salva com sucesso"); onClose(); }}>Salvar conta</Button></>}>
      <div className="space-y-3"><FormInput label="Nome da conta" defaultValue="Conta BAI" /><FormInput label="Banco" defaultValue="BAI" /><FormInput label="IBAN" defaultValue="AO06 0040 0000 0000 0000 0000 0" /><FormInput label="Saldo inicial" defaultValue="53500" /></div>
    </Modal>
  );
}

export function DebtorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useClientsStore((state) => state.clients);
  return (
    <Modal open={open} title="Inadimplência" size="md" onClose={onClose}>
      <div className="space-y-2">{clients.slice(0, 5).map((client, index) => <div key={client.id} className="flex items-center gap-3 rounded-md border border-white/10 p-3"><Avatar label={client.avatar ?? "CL"} /><div className="flex-1"><p>{client.name}</p><p className="text-sm text-red-300">Pagamento em atraso há {index + 3} dias</p></div><Button onClick={() => toastSuccess("Lembrete enviado", client.name)}>Enviar lembrete</Button></div>)}</div>
    </Modal>
  );
}

export function SettingsModal({ open, title, onClose }: { open: boolean; title: string; onClose: () => void }) {
  return (
    <Modal open={open} title={title} description="Configure os parâmetros desta área." size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Configurações salvas com sucesso"); onClose(); }}>Salvar configurações</Button></>}>
      <div className="grid grid-cols-2 gap-3"><FormInput label="Nome da academia" defaultValue="Noogym Fitness Center" /><FormInput label="NIF" defaultValue="5001234567" /><FormSelect label="Moeda" options={["Kwanza (Kz)", "Dólar", "Euro"]} /><FormSelect label="Região" options={["Angola / Luanda"]} /><FormSwitch label="Backup automático" checked={true} onChange={() => undefined} /><FormSwitch label="Notificações automáticas" checked={true} onChange={() => undefined} /><FormTextarea className="col-span-2" label="Observações e regras" defaultValue="Regras preparadas para operação local-first e futura integração SQLite." /></div>
    </Modal>
  );
}

export function ReportExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Exportar relatório" size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { toastSuccess("Relatório exportado com sucesso"); onClose(); }}>Exportar</Button></>}>
      <div className="grid grid-cols-2 gap-3"><FormSelect label="Tipo de relatório" options={["Visão geral", "Financeiro", "Clientes", "Check-ins", "Planos", "Aulas", "Treinos", "Vendas POS", "Produtos", "Funcionários"]} /><FormSelect label="Formato" options={["PDF", "Excel", "CSV", "JSON"]} /><FormInput label="Período" defaultValue="01/05/2026 - 08/05/2026" /><FormSelect label="Unidade" options={["Unidade Central"]} /><FormCheckbox label="Incluir gráficos" defaultChecked /><FormCheckbox label="Incluir detalhes" defaultChecked /></div>
    </Modal>
  );
}
