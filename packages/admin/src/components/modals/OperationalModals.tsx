import { Barcode, Check, CheckCircle2, Clock, CreditCard, Dumbbell, Info, QrCode, Search, ShieldCheck, Tag, UploadCloud, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
import type { ClassRecord, ClientRecord, EmployeeRecord, PlanRecord, ProductRecord, WorkoutRecord } from "@noogym/types";
import type { PlanCategory, PlanCategoryInput } from "../../store/plansStore";

const today = "Hoje, 10:30";
const planWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const defaultPlanWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex"];

const dateTimeInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const formatDateTimeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today;

  const now = new Date();
  const time = new Intl.DateTimeFormat("pt-AO", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (date.toDateString() === now.toDateString()) return `Hoje, ${time}`;
  return new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

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
    if (!selected) {
      toastInfo("Sem clientes", "Cadastre um cliente antes de realizar check-in.");
      return;
    }
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
            {selected ? <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
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
            </div> : <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">Nenhum cliente encontrado. Cadastre um cliente para liberar o check-in.</div>}
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
            <p className="flex items-center gap-3"><UsersRound className="h-4 w-4 text-zinc-400" /> {selected?.name ?? "Sem cliente selecionado"}</p>
            <p className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-zinc-400" /> {selected?.plan ?? "Sem plano"}</p>
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
    if (!client) {
      toastInfo("Sem clientes", "Cadastre um cliente antes de realizar check-in.");
      return;
    }
    addCheckin({ clientName: client.name, clientId: client.id, type: "QR Code", accessType: "Entrada", dateTime: today });
    toastSuccess("Check-in realizado", "QR Code confirmado com sucesso.");
    setScanned(false);
    onClose();
  };
  return (
    <Modal open={open} title="Escanear QR Code" description="Use a leitura simulada para identificar o aluno." size="md" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed border-noogym-lime/35 bg-black/30">
          {scanned && client ? <div><Avatar label={client.avatar ?? "CL"} className="mx-auto h-16 w-16" /><p className="mt-3 font-semibold">{client.name}</p><p className="text-sm text-zinc-400">{client.plan}</p></div> : <QrCode className="h-24 w-24 text-noogym-lime" />}
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
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateTime, setDateTime] = useState(dateTimeInputValue);
  const [checkinType, setCheckinType] = useState("Presencial");
  const [observation, setObservation] = useState("");
  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return clients.slice(0, 6);

    return clients.filter((client) =>
      `${client.name} ${client.id} ${client.phone} ${client.email} ${client.document ?? ""}`.toLowerCase().includes(normalizedQuery)
    ).slice(0, 6);
  }, [clients, query]);
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? filteredClients[0];

  useEffect(() => {
    if (!open) return;
    setTab("Buscar cliente");
    setQuery("");
    setSelectedClientId("");
    setDateTime(dateTimeInputValue());
    setCheckinType("Presencial");
    setObservation("");
  }, [open]);

  const confirm = () => {
    if (!selectedClient) {
      toastInfo("Sem clientes", "Cadastre um cliente antes de realizar check-in.");
      return;
    }
    const parsedDate = new Date(dateTime);
    if (!dateTime || Number.isNaN(parsedDate.getTime())) {
      toastInfo("Data obrigatoria", "Selecione a data e hora do check-in.");
      return;
    }

    addCheckin({
      clientName: selectedClient.name,
      clientId: selectedClient.id,
      type: tab === "Check-in avulso" ? "Manual" : checkinType,
      accessType: "Entrada",
      dateTime: formatDateTimeLabel(dateTime),
      checkedAtIso: parsedDate.toISOString(),
      observation: observation.trim() || undefined
    });
    toastSuccess("Check-in realizado", "Resumo do dia atualizado.");
    onClose();
  };

  return (
    <Modal open={open} title="Novo check-in" description="Selecione o cliente e registre o check-in na unidade." size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={confirm}>Confirmar check-in</Button></>}>
      <Section title="1. Cliente">
        <div className="flex gap-6 border-b border-white/10 text-sm">
          {["Buscar cliente", "Check-in avulso"].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`py-2 ${tab === item ? "border-b border-noogym-lime text-noogym-lime" : "text-zinc-400"}`}>{item}</button>)}
        </div>
        <FormInput label="Busca por nome, CPF/BI ou codigo" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome ou BI do cliente..." />
        <div className="space-y-2">
          {filteredClients.length ? filteredClients.map((client) => (
            <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${selectedClient?.id === client.id ? "border-noogym-lime bg-noogym-lime/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
              <Avatar label={client.avatar ?? "CL"} className="h-14 w-14" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{client.name}</p><p className="truncate text-sm text-zinc-400">BI: {client.document ?? "-"} - {client.plan}</p></div>
              <Badge>{client.status}</Badge>
            </button>
          )) : <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">Nenhum cliente encontrado com estes dados.</div>}
        </div>
      </Section>
      <Section title="2. Detalhes do check-in">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Data e hora" type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} />
          <FormSelect label="Tipo de check-in" value={checkinType} onChange={(event) => setCheckinType(event.target.value)} options={["Presencial", "QR Code", "App", "Manual"]} />
        </div>
        <FormTextarea label="Observacao opcional" value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Adicione uma observacao, se necessario..." />
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">Este check-in sera contabilizado no plano do cliente conforme as regras de acesso da unidade.</div>
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

export function NewClientModal({ open, client, onClose }: { open: boolean; client?: ClientRecord | null; onClose: () => void }) {
  const addClient = useClientsStore((state) => state.addClient);
  const updateClient = useClientsStore((state) => state.updateClient);
  const plans = usePlansStore((state) => state.plans);
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
  const activePlans = useMemo(() => plans.filter((plan) => plan.status !== "Inativo"), [plans]);
  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId);
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const isEditing = Boolean(client);

  useEffect(() => {
    if (!open) return;
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
    setSelectedPlanId(client?.planId ?? activePlans.find((plan) => plan.name === client?.plan)?.id ?? "");
  }, [activePlans, client, open]);

  const birthdayLabel = birthDate ? new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "short" }).format(new Date(`${birthDate}T00:00:00`)).replace(".", "") : undefined;

  const save = () => {
    if (!name.trim() || !phone.trim()) { toastInfo("Campos obrigatórios", "Informe pelo menos nome e telefone."); return; }
    if (!birthDate) { toastInfo("Campos obrigatórios", "Informe a data de nascimento."); return; }
    const payload: Partial<ClientRecord> = {
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
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
      observations: observations.trim()
    };

    if (client) updateClient(client.id, payload);
    else addClient(payload);
    toastSuccess(client ? "Cliente atualizado com sucesso" : "Cliente criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={isEditing ? "Editar cliente" : "Novo cliente"} description={isEditing ? "Atualize as informações cadastrais do cliente." : "Preencha as informações para cadastrar um novo cliente."} size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{isEditing ? "Salvar alterações" : "Cadastrar cliente"}</Button></>}>
      <div className="space-y-5">
        <Section title="1. Dados pessoais">
          <div className="grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)]">
            <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-center text-sm text-zinc-400">Foto opcional<br />PNG, JPG até 5MB</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <FormInput className="xl:col-span-4" label="Nome completo" requiredMark value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite o nome completo" />
              <FormInput className="xl:col-span-2" label="Data de nascimento" requiredMark type="date" max={maxBirthDate} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
              <FormInput className="xl:col-span-3" label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" />
              <FormInput className="xl:col-span-3" label="Telefone" requiredMark value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+244 9XX XXX XXX" />
              <FormInput className="xl:col-span-3" label="Documento/BI" value={document} onChange={(event) => setDocument(event.target.value)} placeholder="000000000LA000" />
              <FormSelect className="xl:col-span-3" label="Sexo" value={gender} onChange={(event) => setGender(event.target.value)} options={["Selecione", "Feminino", "Masculino", "Outro"]} />
              <FormSelect className="xl:col-span-3" label="Estado civil" value={maritalStatus} onChange={(event) => setMaritalStatus(event.target.value)} options={["Selecione", "Solteiro(a)", "Casado(a)", "Outro"]} />
              <FormSelect className="xl:col-span-3" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} options={["Ativo", "Inativo", "Em atraso", "Bloqueado", "Cancelado"]} />
            </div>
          </div>
        </Section>
        <Section title="2. Endereço">
          <div className="grid gap-3 md:grid-cols-3"><FormInput label="Endereço" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rua, número, bairro" /><FormInput label="Cidade" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Luanda" /><FormSelect label="Província" value={province} onChange={(event) => setProvince(event.target.value)} options={["Luanda", "Benguela", "Huíla", "Huambo", "Cabinda"]} /><FormSelect label="País" value={country} onChange={(event) => setCountry(event.target.value)} options={["Angola"]} /><FormInput label="Código postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="0000-000" /></div>
        </Section>
        <Section title="3. Vinculo com plano">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
            <FormSelect label="Plano existente" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              <option value="">Sem plano</option>
              {activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </FormSelect>
            <FormInput label="Preco" value={selectedPlan?.price ?? "Sem cobranca"} readOnly />
            <FormInput label="Duracao" value={selectedPlan?.duration ?? "-"} readOnly />
          </div>
        </Section>
        <Section title="4. Informações adicionais">
          <div className="grid gap-3 md:grid-cols-3"><FormInput label="Profissão" value={profession} onChange={(event) => setProfession(event.target.value)} /><FormSelect label="Como conheceu a academia?" value={source} onChange={(event) => setSource(event.target.value)} options={["Indicação", "Redes sociais", "Publicidade", "Passou pela unidade"]} /><FormSelect label="Objetivo principal" value={goal} onChange={(event) => setGoal(event.target.value)} options={["Hipertrofia", "Emagrecimento", "Saúde", "Condicionamento"]} /></div>
          <FormTextarea label="Observações" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Adicione observações sobre o cliente..." />
          {!isEditing ? <FormCheckbox label="Enviar boas-vindas por e-mail ou WhatsApp" defaultChecked /> : null}
        </Section>
      </div>
    </Modal>
  );
}

export function ProductFormModal({ open, product, onClose }: { open: boolean; product?: ProductRecord; onClose: () => void }) {
  const addProduct = useProductsStore((state) => state.addProduct);
  const updateProduct = useProductsStore((state) => state.updateProduct);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Suplementos");
  const [barcode, setBarcode] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [controlStock, setControlStock] = useState(true);
  const [minStock, setMinStock] = useState("10");
  const [active, setActive] = useState(product?.status !== "Inativo");

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setCategory(product?.category ?? "Suplementos");
    setBarcode(product?.barcode ?? "");
    setSku(product?.sku ?? product?.id ?? "");
    setDescription("Produto para venda no POS da unidade.");
    setPrice(String(product?.price ?? ""));
    setCost(String(product?.cost ?? ""));
    setStock(String(product?.stock ?? ""));
    setControlStock(true);
    setMinStock("10");
    setActive(product?.status !== "Inativo");
  }, [open, product]);

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
      emoji: product?.emoji ?? name.trim().slice(0, 3).toUpperCase(),
      status: active ? "Ativo" : "Inativo"
    };

    if (product) updateProduct(product.id, payload);
    else addProduct(payload);
    toastSuccess(product ? "Produto atualizado com sucesso" : "Produto criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={product ? "Editar produto" : "Novo produto"} description={product ? "Altere as informações do produto abaixo." : "Preencha as informações para cadastrar um novo produto."} size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{product ? "Salvar alterações" : "Salvar produto"}</Button></>}>
      <div className="space-y-5">
        <Section title="1. Informacoes basicas"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome do produto" requiredMark value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Whey Protein 900g" /><FormSelect label="Categoria" requiredMark options={["Suplementos", "Roupas", "Acessorios", "Bebidas", "Outros"]} value={category} onChange={(event) => setCategory(event.target.value)} /><FormInput label="Codigo de barras" value={barcode} onChange={(event) => setBarcode(event.target.value)} /><FormInput label="SKU" value={sku} onChange={(event) => setSku(event.target.value)} /></div><FormTextarea label="Descricao" placeholder="Descreva o produto..." value={description} onChange={(event) => setDescription(event.target.value)} /></Section>
        <Section title="2. Preco e estoque"><div className="grid grid-cols-4 gap-3"><FormInput label="Preco de venda (Kz)" requiredMark type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /><FormInput label="Preco de custo (Kz)" requiredMark type="number" min="0" value={cost} onChange={(event) => setCost(event.target.value)} /><FormInput label="Estoque atual" requiredMark type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} /><FormSelect label="Unidade" requiredMark options={["Unidade", "Caixa", "Pacote", "Kg", "Litro"]} /></div><div className="grid grid-cols-2 gap-3"><FormSwitch label="Controlar estoque" checked={controlStock} onChange={setControlStock} /><FormInput label="Estoque minimo" type="number" min="0" value={minStock} onChange={(event) => setMinStock(event.target.value)} /></div></Section>
        <Section title="3. Imagem do produto (opcional)"><div className="grid grid-cols-[1fr_130px] gap-3"><FileUpload label="Clique para enviar ou arraste a imagem aqui" /><div className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-zinc-400">Pré-visualização</div></div></Section>
        <Section title="4. Status"><FormSwitch label="Produto ativo" description="Produtos inativos não ficam visíveis nas vendas POS." checked={active} onChange={setActive} /></Section>
      </div>
    </Modal>
  );
}

export function PlanFormModal({ open, plan, onClose }: { open: boolean; plan?: PlanRecord; onClose: () => void }) {
  const addPlan = usePlansStore((state) => state.addPlan);
  const updatePlan = usePlansStore((state) => state.updatePlan);
  const categories = usePlansStore((state) => state.categories);
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
    setAccessDays(plan?.accessDays?.length ? plan.accessDays : defaultPlanWeekDays);
  }, [categories, open, plan]);

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

    const payload = {
      name: name.trim(),
      description,
      category,
      price: formatPlanPrice(parsedPrice, duration),
      duration,
      type,
      status: active ? "Ativo" : "Inativo",
      color,
      accessDays
    };

    if (plan) updatePlan(plan.id, payload);
    else addPlan(payload);
    toastSuccess(plan ? "Plano atualizado com sucesso" : "Plano criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={plan ? "Editar plano" : "Novo plano"} description="Preencha as informações do plano." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{plan ? "Salvar alterações" : "Salvar plano"}</Button></>}>
      <div className="space-y-5">
        <Section title="1. Informacoes basicas"><div className="grid grid-cols-3 gap-3"><FormInput label="Nome do plano" requiredMark value={name} onChange={(event) => setName(event.target.value)} /><FormSelect label="Categoria" requiredMark options={categories.length ? categories : ["Musculação"]} value={category} onChange={(event) => setCategory(event.target.value)} /><FormSelect label="Tipo de plano" requiredMark options={["Recorrente", "Avulso", "Pré-pago", "Corporativo"]} value={type} onChange={(event) => setType(event.target.value)} /></div><FormTextarea label="Descricao" value={description} onChange={(event) => setDescription(event.target.value)} /></Section>
        <Section title="2. Preco e duracao"><div className="grid grid-cols-4 gap-3"><FormInput label="Preco normal (Kz)" requiredMark type="number" min="0" value={normalPrice} onChange={(event) => setNormalPrice(event.target.value)} /><FormInput label="Preco promocional (Kz)" type="number" min="0" /><FormSelect label="Duracao" requiredMark options={["Mensal", "Trimestral", "Semestral", "Anual"]} value={duration} onChange={(event) => setDuration(event.target.value)} /><FormSelect label="Periodo de cobranca" requiredMark options={["Mensal", "Trimestral", "Anual"]} value={duration === "Semestral" ? "Mensal" : duration} onChange={(event) => setDuration(event.target.value)} /><FormInput label="Taxa de matricula (Kz)" defaultValue="0" /><FormSelect label="Dia do vencimento" options={["1", "5", "10", "15", "20", "30"]} /></div></Section>
        <Section title="3. Acesso e limitações"><div className="grid grid-cols-3 gap-3"><FormSelect label="Acesso à academia" options={["Livre", "Limitado", "Não incluso"]} /><FormSelect label="Acesso a aulas" options={["Todas", "Limitadas", "Não incluso"]} /><FormSelect label="Acesso a treinos" options={["Sim", "Não"]} /></div><div className="grid gap-3 lg:grid-cols-[1fr_300px]"><div className="space-y-2"><div className="flex items-center justify-between gap-3"><span className="text-sm text-zinc-200">Dias por semana</span><span className="text-xs text-zinc-400">{accessDays.length ? accessDays.join(", ") : "Nenhum dia selecionado"}</span></div><div className="grid grid-cols-7 gap-2">{planWeekDays.map((day) => { const selected = accessDays.includes(day); return <button key={day} type="button" className={`h-10 rounded-md border text-sm font-medium transition ${selected ? "border-noogym-lime bg-noogym-lime text-black" : "border-white/10 bg-black/20 text-zinc-300 hover:border-noogym-lime/60"}`} onClick={() => setAccessDays((days) => selected ? days.filter((item) => item !== day) : [...days, day])}>{day}</button>; })}</div><div className="flex flex-wrap gap-2"><button type="button" className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200" onClick={() => setAccessDays(defaultPlanWeekDays)}>Dias úteis</button><button type="button" className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200" onClick={() => setAccessDays(planWeekDays)}>Todos os dias</button><button type="button" className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200" onClick={() => setAccessDays([])}>Limpar</button></div></div><FormSelect label="Horário de acesso" options={["Horário livre", "Manhã", "Tarde", "Noite"]} /></div><FormSwitch label="Permitir congelamento do plano" checked={true} onChange={() => undefined} /></Section>
        <Section title="4. Configuracoes adicionais"><div className="grid grid-cols-3 gap-3"><FormSwitch label="Plano ativo" checked={active} onChange={setActive} /><FormSwitch label="Exibir no app do aluno" checked={showInApp} onChange={setShowInApp} /><FormSwitch label="Permitir renovacao automatica" checked={autoRenew} onChange={setAutoRenew} /></div></Section>
        <Section title="5. Imagem e cor do plano"><div className="grid grid-cols-[1fr_260px] gap-3"><FileUpload label="Clique para enviar ou arraste a imagem aqui" /><div className="space-y-3"><div className="flex items-center justify-between gap-3 text-sm"><span>Cor do plano</span><span className="inline-flex items-center gap-2 text-zinc-300"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{color}</span></div><ColorPicker value={color} onChange={setColor} /></div></div></Section>
      </div>
    </Modal>
  );
}

export function CategoryModal({ open, title = "Nova categoria", category, onClose, onSave }: { open: boolean; title?: string; category?: PlanCategory | null; onClose: () => void; onSave?: (category: PlanCategoryInput) => boolean }) {
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
    const created = onSave ? onSave({
      name,
      icon,
      description: description.trim() || undefined,
      color,
      status: active ? "Ativo" : "Inativo",
      order: Number(order) || 1
    }) : true;
    if (!created) {
      toastInfo("Categoria ja existe", "Escolha outro nome para esta categoria.");
      return;
    }
    toastSuccess(category ? "Categoria atualizada com sucesso" : "Categoria criada com sucesso");
    onClose();
  };

  return (
    <Modal open={open} title={title} description="Crie uma nova categoria para organizar os registos." size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{category ? "Salvar categoria" : "Criar categoria"}</Button></>}>
      <div className="space-y-5">
        <Section title="1. Informações da categoria"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome da categoria" requiredMark placeholder="Ex: Musculação" value={name} onChange={(event) => setName(event.target.value)} /><FormSelect label="Ícone da categoria" requiredMark options={["Musculação", "Cardio", "Produto", "Aula", "Plano"]} value={icon} onChange={(event) => setIcon(event.target.value)} /></div><FormTextarea label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} /></Section>
        <Section title="2. Configurações"><div className="grid grid-cols-2 gap-3"><FormSwitch label="Status da categoria" checked={active} onChange={setActive} /><FormInput label="Ordem de exibição" type="number" min="1" value={order} onChange={(event) => setOrder(event.target.value)} /></div><div className="space-y-3"><div className="flex items-center justify-between gap-3 text-sm text-zinc-400"><span>Cor da categoria</span><span className="inline-flex items-center gap-2 text-zinc-200"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{color}</span></div><ColorPicker value={color} onChange={setColor} /></div></Section>
      </div>
    </Modal>
  );
}

export function FinalizeSaleModal({ open, total, onClose, onConfirmed }: { open: boolean; total: number; onClose: () => void; onConfirmed: () => void }) {
  const addSale = useSalesStore((state) => state.addSale);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("Consumidor final");
  const [seller, setSeller] = useState("Admin");
  const [saleType, setSaleType] = useState("Venda normal");
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [dateTime, setDateTime] = useState("08/05/2026 10:30");
  const [note, setNote] = useState("");
  const finalTotal = Math.max(0, total - discount);

  useEffect(() => {
    if (!open) return;
    setDiscount(0);
    setCustomer("Consumidor final");
    setSeller("Admin");
    setSaleType("Venda normal");
    setPaymentMethod("Dinheiro");
    setDateTime("08/05/2026 10:30");
    setNote("");
  }, [open]);

  const confirm = () => {
    addSale({
      total: finalTotal,
      customer: customer === "Consumidor final" ? undefined : customer,
      seller,
      type: saleType,
      paymentMethod,
      dateTime: dateTime || today
    });
    toastSuccess("Venda concluída", "Carrinho limpo e histórico atualizado.");
    onConfirmed();
    onClose();
  };
  return (
    <Modal open={open} title="Finalizar venda" description="Revise os detalhes e escolha a forma de pagamento." size="xl" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={confirm}>Confirmar venda</Button></>}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <Section title="1. Dados da venda"><FormSelect label="Cliente opcional" options={["Consumidor final", "Carlos Alberto Silva", "Ana Luísa Santos"]} value={customer} onChange={(event) => setCustomer(event.target.value)} /><FormSelect label="Vendedor" options={["Admin", "Recepção"]} value={seller} onChange={(event) => setSeller(event.target.value)} /><div className="grid grid-cols-2 gap-3"><FormSelect label="Tipo de venda" options={["Venda normal", "Orçamento"]} value={saleType} onChange={(event) => setSaleType(event.target.value)} /><FormInput label="Data da venda" value={dateTime} onChange={(event) => setDateTime(event.target.value)} /></div><FormTextarea label="Observacao" value={note} onChange={(event) => setNote(event.target.value)} /></Section>
          <Section title="2. Forma de pagamento"><div className="grid grid-cols-4 gap-3">{["Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "PIX/Referência", "Multi pagamento", "Credifit/crédito interno", "Vale presente"].map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`min-h-20 rounded-lg border p-2 text-sm ${paymentMethod === method ? "border-noogym-lime bg-noogym-lime/10 text-noogym-lime" : "border-white/10 bg-white/[0.03]"}`}>{method}</button>)}</div></Section>
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
  const products = useProductsStore((state) => state.products);
  const [barcode, setBarcode] = useState("");
  const normalizedBarcode = barcode.trim().toLowerCase();
  const found = normalizedBarcode
    ? products.find((product) => [product.barcode, product.sku, product.id].some((value) => value?.toLowerCase() === normalizedBarcode))
    : undefined;

  useEffect(() => {
    if (!open) return;
    setBarcode("");
  }, [open]);

  return (
    <Modal open={open} title="Código de barras" size="sm" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!found} onClick={() => { if (!found) return; toastSuccess("Produto encontrado", found.name); onClose(); }}>Adicionar produto</Button></>}>
      <div className="space-y-4 text-center">
        <Barcode className="mx-auto h-16 w-16 text-noogym-lime" />
        <FormInput label="Código de barras" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Digite ou leia o código" />
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          {found ? (
            <>
              <p className="font-semibold">{found.name}</p>
              <p className="text-sm text-zinc-400">Estoque: {found.stock} un</p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Nenhum produto disponivel para leitura.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ClassFormModal({ open, lesson, onClose }: { open: boolean; lesson?: ClassRecord; onClose: () => void }) {
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
      status: active ? (lesson?.status === "Em andamento" ? "Em andamento" : "Agendada") : "Cancelada"
    };
    lesson ? updateClass(lesson.id, payload) : addClass(payload);
    toastSuccess(lesson ? "Aula atualizada com sucesso" : "Aula criada com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={lesson ? "Editar aula" : "Nova aula"} description="Preencha as informações da aula." size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{lesson ? "Salvar alterações" : "Salvar aula"}</Button></>}>
      <div className="space-y-5"><Section title="1. Informacoes basicas"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome da aula" requiredMark value={name} onChange={(event) => setName(event.target.value)} /><FormSelect label="Categoria" requiredMark options={["Cardio", "Funcional", "Corpo e Mente", "Dança", "Luta"]} value={category} onChange={(event) => setCategory(event.target.value)} /></div><FormTextarea label="Descricao" value={description} onChange={(event) => setDescription(event.target.value)} /><div className="grid grid-cols-3 gap-3"><FormInput label="Duracao" requiredMark value={duration} onChange={(event) => setDuration(event.target.value)} /><FormInput label="Capacidade" requiredMark type="number" min="1" value={seats} onChange={(event) => setSeats(event.target.value)} /><FormSelect label="Instrutor" requiredMark options={["João Silva", "Lucas Ferreira", "Mariana Costa"]} value={instructor} onChange={(event) => setInstructor(event.target.value)} /></div></Section><Section title="2. Equipamentos"><FormInput label="Equipamentos necessarios" placeholder="Bike Spinning, Toalha, Garrafa de agua" /></Section><Section title="3. Configuracoes"><div className="grid grid-cols-3 gap-3"><FormSwitch label="Aula ativa" checked={active} onChange={setActive} /><FormSwitch label="Permitir lista de espera" checked={waitingList} onChange={setWaitingList} /><FormSwitch label="Exige check-in" checked={requiresCheckin} onChange={setRequiresCheckin} /></div></Section></div>
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
    toastSuccess(workout ? "Treino atualizado com sucesso" : "Treino criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={workout ? "Editar treino" : "Novo treino"} size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar treino</Button></>}>
      <div className="space-y-5"><Section title="1. Dados do treino"><div className="grid grid-cols-2 gap-3"><FormInput label="Nome do treino" value={name} onChange={(event) => setName(event.target.value)} /><FormSelect label="Cliente" options={["Carlos Alberto Silva", "Ana Luísa Santos"]} value={client} onChange={(event) => setClient(event.target.value)} /><FormSelect label="Objetivo" options={["Hipertrofia", "Emagrecimento", "Força", "Condicionamento"]} value={goal} onChange={(event) => setGoal(event.target.value)} /><FormSelect label="Nivel" options={["Iniciante", "Intermediário", "Avançado"]} value={level} onChange={(event) => setLevel(event.target.value)} /><FormInput label="Duracao media" value={duration} onChange={(event) => setDuration(event.target.value)} /><FormInput label="Criado por" value={author} onChange={(event) => setAuthor(event.target.value)} /></div></Section><Section title="2. Exercicios"><div className="rounded-lg border border-white/10 p-3 text-sm"><p>Supino reto - 4 series - 10 repeticoes - 60s descanso</p><p className="mt-2">Agachamento livre - 4 series - 12 repeticoes - 90s descanso</p><Button className="mt-3" icon={<Dumbbell className="h-4 w-4" />}>Adicionar exercicio</Button></div></Section><FormTextarea label="Observacoes" value={notes} onChange={(event) => setNotes(event.target.value)} /><FormSelect label="Status" options={["Ativo", "Rascunho", "Inativo"]} value={status} onChange={(event) => setStatus(event.target.value)} /></div>
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Recepcionista");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("Ativo");

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? "");
    setEmail(employee?.email ?? "");
    setPhone(employee?.phone ?? "");
    setRole(employee?.role ?? "Recepcionista");
    setSalary(employee?.salary ?? "");
    setStatus(employee?.status ?? "Ativo");
  }, [employee, open]);

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
      salary: salary.trim() || "0 Kz",
      status
    };
    employee ? updateEmployee(employee.id, payload) : addEmployee(payload);
    toastSuccess(employee ? "Funcionário atualizado com sucesso" : "Funcionário criado com sucesso");
    onClose();
  };
  return (
    <Modal open={open} title={employee ? "Editar funcionário" : "Novo funcionário"} size="lg" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar funcionário</Button></>}>
      <div className="grid grid-cols-2 gap-3"><FileUpload label="Foto opcional" /><FormInput label="Nome" value={name} onChange={(event) => setName(event.target.value)} /><FormInput label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /><FormInput label="Telefone" value={phone} onChange={(event) => setPhone(event.target.value)} /><FormSelect label="Funcao" options={["Administrador", "Gerente", "Recepcionista", "Personal Trainer", "Instrutor de Aulas"]} value={role} onChange={(event) => setRole(event.target.value)} /><FormInput label="Data de admissao" defaultValue="08/05/2026" /><FormInput label="Salario mensal" value={salary} onChange={(event) => setSalary(event.target.value)} /><FormSelect label="Status" options={["Ativo", "Inativo"]} value={status} onChange={(event) => setStatus(event.target.value)} /><div className="col-span-2 grid grid-cols-3 gap-2">{["Dashboard", "Check-in", "Clientes", "Vendas", "Produtos", "Financas"].map((permission) => <FormCheckbox key={permission} label={permission} defaultChecked />)}</div></div>
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

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const parseNumericInput = (value: string, fallback = 0) => {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const moneyInputValue = (value?: string | number) => {
  if (typeof value === "number") return String(value);
  if (!value) return "";
  return String(parseNumericInput(value));
};

const formatPlanPrice = (value: number, duration: string) => {
  const suffix = duration === "Anual" ? "ano" : duration === "Trimestral" ? "trimestre" : duration === "Semestral" ? "semestre" : "mes";
  return `${value.toLocaleString("pt-AO")} Kz/${suffix}`;
};

export function FinanceEntryModal({ open, kind, onClose }: { open: boolean; kind: "Receita" | "Despesa"; onClose: () => void }) {
  const addRevenue = useFinanceStore((state) => state.addRevenue);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const financeCategories = useFinanceStore((state) => state.categories);
  const categories = useMemo(() => financeCategories.filter((category) => category.kind === kind).map((category) => category.name), [financeCategories, kind]);
  const [category, setCategory] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [methodOrSupplier, setMethodOrSupplier] = useState("");
  const [date, setDate] = useState(todayInputValue);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setCategory(categories[0] ?? "");
    setValue("");
    setStatus(kind === "Receita" ? "Recebido" : "Pendente");
    setMethodOrSupplier(kind === "Receita" ? "Dinheiro" : "Fornecedor local");
    setDate(todayInputValue());
    setNote("");
  }, [categories, kind, open]);

  const save = () => {
    const parsedValue = Number(value);
    if (!category) {
      toastInfo("Categoria obrigatoria", "Crie ou selecione uma categoria para continuar.");
      return;
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      toastInfo("Valor invalido", "Informe um valor maior que zero.");
      return;
    }

    const record = {
      category,
      value: parsedValue,
      date: date || "Hoje",
      status,
      note: note.trim() || methodOrSupplier
    };

    kind === "Receita" ? addRevenue(record) : addExpense(record);
    toastSuccess(`${kind} criada com sucesso`);
    onClose();
  };
  return (
    <Modal open={open} title={kind === "Receita" ? "Adicionar receita" : "Adicionar despesa"} size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormSelect label="Categoria" requiredMark options={categories.length ? categories : ["Sem categorias"]} value={category} onChange={(event) => setCategory(event.target.value)} />
        <FormInput label="Valor (Kz)" requiredMark type="number" min="1" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ex: 25000" />
        <FormSelect label={kind === "Receita" ? "Metodo de pagamento" : "Fornecedor"} options={kind === "Receita" ? ["Dinheiro", "Cartao", "Transferencia"] : ["Fornecedor local", "Equipe", "Prestador"]} value={methodOrSupplier} onChange={(event) => setMethodOrSupplier(event.target.value)} />
        <FormInput label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <FormSelect label="Status" options={kind === "Receita" ? ["Recebido", "Pendente"] : ["Pendente", "Pago"]} value={status} onChange={(event) => setStatus(event.target.value)} />
        {kind === "Receita" ? <FormSelect label="Cliente relacionado" options={["Consumidor final", "Carlos Alberto Silva", "Ana Luisa Santos"]} /> : null}
        <FormTextarea className="sm:col-span-2" label="Observacao" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
    </Modal>
  );
}

export function FinanceCategoryModal({ open, kind, onClose }: { open: boolean; kind: "Receita" | "Despesa"; onClose: () => void }) {
  const addCategory = useFinanceStore((state) => state.addCategory);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
  }, [open]);

  const save = () => {
    if (!name.trim()) {
      toastInfo("Nome obrigatorio", "Informe o nome da categoria.");
      return;
    }

    const created = addCategory({ kind, name, description: description.trim() || undefined });
    if (!created) {
      toastInfo("Categoria ja existe", "Escolha outro nome para esta categoria.");
      return;
    }

    toastSuccess("Categoria criada com sucesso");
    onClose();
  };

  return (
    <Modal open={open} title={`Nova categoria de ${kind.toLowerCase()}`} description="Organize os lancamentos financeiros por categoria." size="md" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" icon={<Tag className="h-4 w-4" />} onClick={save}>Criar categoria</Button></>}>
      <div className="space-y-3">
        <FormInput label="Nome da categoria" requiredMark value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "Despesa" ? "Ex: Limpeza" : "Ex: Eventos"} />
        <FormTextarea label="Descricao" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
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
