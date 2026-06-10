import { Barcode, Copy, Download, Eye, Plus, ReceiptText, RefreshCcw, ShoppingCart, Trash2, WalletCards, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { BarcodeModal, FinalizeSaleModal } from "../components/modals/OperationalModals";
import { ProductVisual } from "../components/ui/ProductVisual";
import { StatusDot } from "../components/ui/StatusDot";
import { ListPagination, ListToolbar, paginateRows } from "../components/tables/ListControls";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { Input } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { Table } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { formatKz as money } from "@noogym/core";
import { useClassesStore } from "../store/classesStore";
import { usePlansStore } from "../store/plansStore";
import { useProductsStore } from "../store/productsStore";
import { useSalesStore } from "../store/salesStore";
import { toastInfo, toastSuccess } from "../store/toastStore";
import type { ProductRecord, SaleItemRecord, SaleRecord } from "@noogym/types";

type CatalogKind = "product" | "plan" | "service" | "class";
type MainTab = "Nova venda" | "Vendas" | "Orcamentos" | "Caixa do dia";

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  detail: string;
  emoji: string;
  kind: CatalogKind;
  stock?: number;
  sku?: string;
};

type CartItem = CatalogItem & { qty: number };

const mainTabs: MainTab[] = ["Nova venda", "Vendas", "Orcamentos", "Caixa do dia"];
const catalogTabs = ["Produtos", "Planos", "Aulas", "Servicos"];
const serviceItems: CatalogItem[] = [
  { id: "SVC-001", name: "Avaliacao fisica", category: "Servicos", price: 8000, detail: "Sessao individual", emoji: "AVL", kind: "service" },
  { id: "SVC-002", name: "Personal trainer", category: "Servicos", price: 12000, detail: "Treino acompanhado", emoji: "PT", kind: "service" },
  { id: "SVC-003", name: "Plano alimentar", category: "Servicos", price: 10000, detail: "Consulta nutricional", emoji: "NUT", kind: "service" },
  { id: "SVC-004", name: "Massagem desportiva", category: "Servicos", price: 15000, detail: "Recuperacao muscular", emoji: "MAS", kind: "service" }
];

const priceFromPlan = (price: string) => {
  const numeric = Number(price.split(" ")[0]?.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const productToCatalogItem = (product: ProductRecord): CatalogItem => ({
  id: product.id,
  name: product.name,
  category: product.category,
  price: product.price,
  detail: `Estoque: ${product.stock} un`,
  emoji: product.emoji,
  kind: "product",
  stock: product.stock,
  sku: product.sku
});

const saleStatusTone = (status?: string) => status === "Cancelada" ? "red" : status === "Orcamento" ? "orange" : "lime";
const isTodaySale = (sale: SaleRecord) => {
  if (!sale.soldAtIso) return sale.dateTime.startsWith("Hoje");
  const date = new Date(sale.soldAtIso);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
};
const saleItemsLabel = (sale: SaleRecord) => sale.items?.length
  ? sale.items.slice(0, 2).map((item) => `${item.quantity}x ${item.name}`).join(", ")
  : sale.type;

function receiptText(sale: SaleRecord) {
  const rows = sale.items?.map((item) => `${item.quantity}x ${item.name} - ${money(item.unitPrice * item.quantity)}`).join("\n") ?? sale.type;
  return [
    "Noogym Fitness Center",
    "Recibo POS",
    "",
    `Codigo: ${sale.id}`,
    `Data: ${sale.dateTime}`,
    `Cliente: ${sale.customer ?? "Consumidor final"}`,
    `Vendedor: ${sale.seller}`,
    `Pagamento: ${sale.paymentMethod}`,
    "",
    rows,
    "",
    `Subtotal: ${money(sale.subtotal ?? sale.total)}`,
    `Desconto: ${money(sale.discountAmount ?? 0)}`,
    `Taxa: ${money(sale.taxAmount ?? 0)}`,
    `Total: ${money(sale.total)}`,
    `Status: ${sale.status ?? "Concluida"}`
  ].join("\n");
}

function downloadReceipt(sale: SaleRecord) {
  const blob = new Blob([receiptText(sale)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `recibo-${sale.id}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function VendasPOS() {
  const [mainTab, setMainTab] = useState<MainTab>("Nova venda");
  const [catalogTab, setCatalogTab] = useState("Produtos");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas as categorias");
  const [saleQuery, setSaleQuery] = useState("");
  const [quoteQuery, setQuoteQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [paymentFilter, setPaymentFilter] = useState("Todos");
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(25);
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesPageSize, setQuotesPageSize] = useState(25);
  const [modal, setModal] = useState<"finalize" | "quote" | "clear" | "barcode" | "cancelSale" | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const products = useProductsStore((state) => state.products);
  const reduceStock = useProductsStore((state) => state.reduceStock);
  const plans = usePlansStore((state) => state.plans);
  const classes = useClassesStore((state) => state.classes);
  const sales = useSalesStore((state) => state.sales);
  const cancelSale = useSalesStore((state) => state.cancelSale);
  const [cart, setCart] = useState<CartItem[]>([]);

  const catalogItems = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const items = catalogTab === "Planos"
      ? plans.filter((plan) => plan.status !== "Inativo").map((plan) => ({ id: plan.id, name: plan.name, category: plan.category, price: priceFromPlan(plan.price), detail: plan.duration, emoji: "PLN", kind: "plan" as const }))
      : catalogTab === "Servicos"
        ? serviceItems
        : catalogTab === "Aulas"
          ? classes.map((lesson) => ({ id: lesson.id, name: lesson.name, category: lesson.category, price: 3000, detail: `${lesson.time} - ${lesson.instructor}`, emoji: "AUL", kind: "class" as const }))
          : products.filter((product) => product.status !== "Inativo").map(productToCatalogItem);

    return items.filter((item) => {
      const matchesQuery = `${item.name} ${item.category} ${item.detail}`.toLowerCase().includes(normalizedQuery);
      const matchesCategory = categoryFilter === "Todas as categorias" || item.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [catalogTab, categoryFilter, classes, plans, products, query]);

  const categories = useMemo(() => ["Todas as categorias", ...Array.from(new Set(catalogItems.map((item) => item.category)))], [catalogItems]);
  const paymentMethods = useMemo(() => ["Todos", ...Array.from(new Set(sales.map((sale) => sale.paymentMethod)))], [sales]);
  const completedSales = useMemo(() => sales.filter((sale) => sale.status !== "Orcamento"), [sales]);
  const quotes = useMemo(() => sales.filter((sale) => sale.status === "Orcamento"), [sales]);
  const filteredSales = useMemo(() => completedSales.filter((sale) => {
    const text = `${sale.customer ?? ""} ${sale.seller} ${sale.paymentMethod} ${saleItemsLabel(sale)} ${sale.id}`.toLowerCase();
    const matchesQuery = text.includes(saleQuery.toLowerCase());
    const matchesStatus = statusFilter === "Todos" || (sale.status ?? "Concluida") === statusFilter;
    const matchesPayment = paymentFilter === "Todos" || sale.paymentMethod === paymentFilter;
    return matchesQuery && matchesStatus && matchesPayment;
  }), [completedSales, paymentFilter, saleQuery, statusFilter]);
  const filteredQuotes = useMemo(() => quotes.filter((sale) => `${sale.customer ?? ""} ${sale.seller} ${sale.paymentMethod} ${saleItemsLabel(sale)} ${sale.id}`.toLowerCase().includes(quoteQuery.toLowerCase())), [quoteQuery, quotes]);
  const salesPageData = useMemo(() => paginateRows(filteredSales, salesPage, salesPageSize), [filteredSales, salesPage, salesPageSize]);
  const quotesPageData = useMemo(() => paginateRows(filteredQuotes, quotesPage, quotesPageSize), [filteredQuotes, quotesPage, quotesPageSize]);
  useEffect(() => setSalesPage(1), [paymentFilter, saleQuery, salesPageSize, statusFilter]);
  useEffect(() => setQuotesPage(1), [quoteQuery, quotesPageSize]);
  const todaySales = useMemo(() => completedSales.filter((sale) => isTodaySale(sale)), [completedSales]);
  const cashSummary = useMemo(() => {
    const active = todaySales.filter((sale) => sale.status !== "Cancelada");
    const byMethod = active.reduce<Record<string, number>>((acc, sale) => ({ ...acc, [sale.paymentMethod]: (acc[sale.paymentMethod] ?? 0) + sale.total }), {});
    return {
      gross: active.reduce((sum, sale) => sum + (sale.subtotal ?? sale.total), 0),
      discount: active.reduce((sum, sale) => sum + (sale.discountAmount ?? 0), 0),
      tax: active.reduce((sum, sale) => sum + (sale.taxAmount ?? 0), 0),
      net: active.reduce((sum, sale) => sum + sale.total, 0),
      canceled: todaySales.filter((sale) => sale.status === "Cancelada").reduce((sum, sale) => sum + sale.total, 0),
      byMethod
    };
  }, [todaySales]);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const saleItems: SaleItemRecord[] = useMemo(() => cart.map((item) => ({
    id: `${item.kind}-${item.id}`,
    productId: item.kind === "product" ? item.id : undefined,
    name: item.name,
    sku: item.sku,
    quantity: item.qty,
    unitPrice: item.price,
    kind: item.kind
  })), [cart]);

  const addToCart = (item: CatalogItem) => setCart((items) => {
    const existing = items.find((entry) => entry.id === item.id && entry.kind === item.kind);
    return existing ? items.map((entry) => entry.id === item.id && entry.kind === item.kind ? { ...entry, qty: entry.qty + 1 } : entry) : [...items, { ...item, qty: 1 }];
  });
  const fillCartFromSale = (sale: SaleRecord) => {
    const items = sale.items?.map((item) => ({
      id: item.productId ?? item.id,
      name: item.name,
      category: item.kind ?? "POS",
      price: item.unitPrice,
      detail: sale.dateTime,
      emoji: item.kind === "product" ? "PRD" : item.kind === "plan" ? "PLN" : item.kind === "class" ? "AUL" : "SVC",
      kind: (item.kind as CatalogKind | undefined) ?? "service",
      sku: item.sku,
      qty: item.quantity
    })) ?? [];
    setCart(items);
    setMainTab("Nova venda");
    toastSuccess("Carrinho preenchido", "Os itens da venda foram adicionados para uma nova operacao.");
  };
  const finishCart = (saleType: string) => {
    if (saleType !== "Orcamento") {
      reduceStock(cart.filter((item) => item.kind === "product").map((item) => ({ id: item.id, qty: item.qty })), { sync: false });
    }
    setCart([]);
  };
  const handleCancel = () => {
    if (!selectedSale) return;
    cancelSale(selectedSale.id);
    toastSuccess("Venda cancelada", selectedSale.id);
    setSelectedSale(null);
    setModal(null);
  };

  return (
    <div className={mainTab === "Nova venda" ? "pos-layout grid gap-3" : "space-y-3"}>
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Vendas (POS)</h1>
            <p className="mt-2 text-sm text-zinc-300">Venda produtos, planos, aulas e servicos com controlo de caixa.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Card className="px-4 py-3 shadow-none"><p className="text-zinc-400">Hoje</p><p className="font-semibold text-noogym-lime">{money(cashSummary.net)}</p></Card>
            <Card className="px-4 py-3 shadow-none"><p className="text-zinc-400">Vendas</p><p className="font-semibold">{todaySales.length}</p></Card>
            <Card className="px-4 py-3 shadow-none"><p className="text-zinc-400">Orcamentos</p><p className="font-semibold">{quotes.length}</p></Card>
            <Card className="px-4 py-3 shadow-none"><p className="text-zinc-400">Canceladas</p><p className="font-semibold text-red-300">{money(cashSummary.canceled)}</p></Card>
          </div>
        </div>
        <div className="mt-5">
          <Tabs tabs={mainTabs} active={mainTab} onChange={(tab) => setMainTab(tab as MainTab)} />
        </div>

        {mainTab === "Nova venda" ? (
          <>
            <Tabs tabs={catalogTabs} active={catalogTab} onChange={(tab) => { setCatalogTab(tab); setCategoryFilter("Todas as categorias"); }} />
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${catalogTab.toLowerCase()}...`} />
              <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</Select>
              <Button icon={<Barcode className="h-4 w-4" />} onClick={() => setModal("barcode")}>Codigo de barras</Button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[190px_1fr]">
              <Card className="p-3">
                {categories.map((cat, index) => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm ${categoryFilter === cat || (index === 0 && categoryFilter === "Todas as categorias") ? "bg-noogym-lime/10 text-noogym-lime" : "text-zinc-200"}`}>
                    <ShoppingCart className="h-4 w-4" /> {cat === "Todas as categorias" ? "Todos" : cat}
                  </button>
                ))}
              </Card>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {catalogItems.slice(0, 20).map((item) => (
                  <Card key={`${item.kind}-${item.id}`} className="p-3">
                    <ProductVisual label={item.emoji} className="mx-auto h-24 w-full" />
                    <p className="mt-3 text-sm">{item.name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{item.detail}</p>
                    <p className="mt-1 text-sm font-semibold text-noogym-lime">{money(item.price)}</p>
                    <Button className="mt-3 h-8 w-full" icon={<Plus className="h-4 w-4" />} onClick={() => addToCart(item)}>Adicionar</Button>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {mainTab === "Vendas" ? (
          <>
            <div className="mt-5">
              <ListToolbar query={saleQuery} onQueryChange={setSaleQuery} queryPlaceholder="Buscar por cliente, item, vendedor ou codigo..." pageSize={salesPageSize} onPageSizeChange={setSalesPageSize} onClear={() => { setSaleQuery(""); setStatusFilter("Todos"); setPaymentFilter("Todos"); }}>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option><option>Concluida</option><option>Cancelada</option><option>Reembolsada</option></Select>
              <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</Select>
              </ListToolbar>
            </div>
            <SalesTable sales={salesPageData.pageRows} onView={setSelectedSale} onReceipt={downloadReceipt} onDuplicate={fillCartFromSale} onCancel={(sale) => { setSelectedSale(sale); setModal("cancelSale"); }} />
            <ListPagination page={salesPageData.page} totalPages={salesPageData.totalPages} totalItems={filteredSales.length} start={salesPageData.start} end={salesPageData.end} label="vendas" onPageChange={setSalesPage} />
            {selectedSale ? <SaleDetails sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
          </>
        ) : null}

        {mainTab === "Orcamentos" ? (
          <>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Orcamentos salvos</h2>
                <p className="text-sm text-zinc-400">Converta propostas em vendas ou reutilize os itens no carrinho.</p>
              </div>
              <span className="text-sm text-zinc-400">{filteredQuotes.length} registos</span>
            </div>
            <div className="mt-4">
              <ListToolbar query={quoteQuery} onQueryChange={setQuoteQuery} queryPlaceholder="Buscar por cliente, item, vendedor ou codigo..." pageSize={quotesPageSize} onPageSizeChange={setQuotesPageSize} onClear={() => setQuoteQuery("")} />
            </div>
            <SalesTable sales={quotesPageData.pageRows} onView={setSelectedSale} onReceipt={downloadReceipt} onDuplicate={fillCartFromSale} onConvert={fillCartFromSale} />
            <ListPagination page={quotesPageData.page} totalPages={quotesPageData.totalPages} totalItems={filteredQuotes.length} start={quotesPageData.start} end={quotesPageData.end} label="orcamentos" onPageChange={setQuotesPage} />
            {selectedSale ? <SaleDetails sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
          </>
        ) : null}

        {mainTab === "Caixa do dia" ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="p-5">
              <h2 className="font-semibold">Resumo financeiro</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between text-zinc-300">Bruto <span className="text-white">{money(cashSummary.gross)}</span></p>
                <p className="flex justify-between text-zinc-300">Descontos <span className="text-red-300">{money(cashSummary.discount)}</span></p>
                <p className="flex justify-between text-zinc-300">Taxas <span className="text-sky-300">{money(cashSummary.tax)}</span></p>
                <p className="flex justify-between border-t border-white/10 pt-4 text-xl font-semibold">Saldo <span className="text-noogym-lime">{money(cashSummary.net)}</span></p>
              </div>
              <Button className="mt-5 w-full" variant="primary" icon={<WalletCards className="h-4 w-4" />} onClick={() => toastSuccess("Caixa conferido", "Resumo do dia pronto para exportacao.")}>Conferir caixa</Button>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Por forma de pagamento</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(cashSummary.byMethod).length ? Object.entries(cashSummary.byMethod).map(([method, value]) => (
                  <p key={method} className="flex justify-between border-b border-white/[0.07] pb-3 text-sm"><span>{method}</span><span className="font-semibold text-noogym-lime">{money(value)}</span></p>
                )) : <p className="text-sm text-zinc-400">Nenhuma venda concluida hoje.</p>}
              </div>
            </Card>
            <div className="xl:col-span-2">
              <SalesTable sales={todaySales} compact onView={setSelectedSale} onReceipt={downloadReceipt} onDuplicate={fillCartFromSale} />
            </div>
          </div>
        ) : null}
      </div>

      {mainTab === "Nova venda" ? (
        <aside className="panel p-4">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Carrinho</h2><span className="text-xs text-zinc-400">{cart.length} itens</span><button onClick={() => setModal("clear")}><Trash2 className="h-4 w-4" /></button></div>
          <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
            {cart.length ? cart.map((item) => <div key={`${item.kind}-${item.id}`} className="soft-card flex gap-3 p-3"><ProductVisual label={item.emoji} className="h-14 w-14" /><div className="flex-1"><div className="flex justify-between gap-2"><p className="text-sm">{item.name}</p><button onClick={() => setCart((items) => items.filter((entry) => !(entry.id === item.id && entry.kind === item.kind)))}><X className="h-4 w-4 text-zinc-500" /></button></div><p className="text-xs text-zinc-400">{money(item.price)}</p><div className="mt-2 flex items-center gap-2 text-xs"><button className="rounded border border-white/10 px-2" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id && entry.kind === item.kind ? { ...entry, qty: Math.max(1, entry.qty - 1) } : entry))}>-</button><span>{item.qty}</span><button className="rounded border border-white/10 px-2" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id && entry.kind === item.kind ? { ...entry, qty: entry.qty + 1 } : entry))}>+</button></div></div><p className="self-center text-sm font-semibold">{money(item.price * item.qty)}</p></div>) : <p className="rounded-lg border border-white/10 p-4 text-center text-sm text-zinc-400">Carrinho vazio.</p>}
          </div>
          <Card className="mt-3 p-4 shadow-none"><p className="flex justify-between text-sm text-zinc-300">Subtotal <span>{money(total)}</span></p><p className="mt-3 flex justify-between text-sm text-zinc-300">Desconto <button className="text-noogym-lime" disabled={!cart.length} onClick={() => setModal("finalize")}>Adicionar desconto</button></p><p className="mt-5 flex justify-between border-t border-white/10 pt-5 text-xl font-semibold">Total <span className="text-noogym-lime">{money(total)}</span></p></Card>
          <Button className="mt-4 w-full" variant="primary" icon={<ShoppingCart className="h-5 w-5" />} disabled={!cart.length} onClick={() => setModal("finalize")}>Finalizar venda</Button>
          <div className="mt-3 grid grid-cols-2 gap-2"><Button disabled={!cart.length} onClick={() => setModal("quote")}>Salvar orcamento</Button><Button onClick={() => setModal("clear")}>Limpar carrinho</Button></div>
        </aside>
      ) : null}

      <FinalizeSaleModal open={modal === "finalize" || modal === "quote"} total={total} items={saleItems} initialSaleType={modal === "quote" ? "Orcamento" : "Venda normal"} onClose={() => setModal(null)} onConfirmed={finishCart} />
      <BarcodeModal open={modal === "barcode"} onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "clear"} title="Limpar carrinho" message="Tem certeza que deseja remover todos os itens do carrinho?" confirmLabel="Limpar carrinho" danger onClose={() => setModal(null)} onConfirm={() => { setCart([]); toastSuccess("Carrinho limpo com sucesso"); setModal(null); }} />
      <ConfirmModal open={modal === "cancelSale"} title="Cancelar venda" message="A venda sera marcada como cancelada e deixara de contar no caixa." confirmLabel="Cancelar venda" danger onClose={() => { setSelectedSale(null); setModal(null); }} onConfirm={handleCancel} />
    </div>
  );
}

function SalesTable({ sales, compact, onView, onReceipt, onDuplicate, onCancel, onConvert }: { sales: SaleRecord[]; compact?: boolean; onView: (sale: SaleRecord) => void; onReceipt: (sale: SaleRecord) => void; onDuplicate: (sale: SaleRecord) => void; onCancel?: (sale: SaleRecord) => void; onConvert?: (sale: SaleRecord) => void }) {
  return (
    <div className="mt-4">
      <Table columns={compact ? ["Data", "Cliente", "Pagamento", "Total", "Status", "Acoes"] : ["Data", "Cliente", "Itens", "Pagamento", "Total", "Status", "Acoes"]} containerClassName="max-h-[430px]">
        {sales.length ? sales.map((sale) => (
          <tr key={sale.id} className="table-row">
            <td className="px-4 py-3">{sale.dateTime}</td>
            <td className="px-4 py-3">{sale.customer ?? "Consumidor final"}</td>
            {!compact ? <td className="px-4 py-3"><p className="max-w-[300px] truncate">{saleItemsLabel(sale)}</p></td> : null}
            <td className="px-4 py-3">{sale.paymentMethod}</td>
            <td className="px-4 py-3 font-semibold text-noogym-lime">{money(sale.total)}</td>
            <td className="px-4 py-3"><StatusDot label={sale.status ?? "Concluida"} tone={saleStatusTone(sale.status)} /></td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <button title="Ver detalhes" onClick={() => onView(sale)}><Eye className="h-4 w-4" /></button>
                <button title="Baixar recibo" onClick={() => onReceipt(sale)}><Download className="h-4 w-4" /></button>
                <button title="Duplicar para carrinho" onClick={() => onDuplicate(sale)}><Copy className="h-4 w-4" /></button>
                {onConvert ? <button className="text-noogym-lime" title="Converter em venda" onClick={() => onConvert(sale)}><RefreshCcw className="h-4 w-4" /></button> : null}
                {onCancel && sale.status !== "Cancelada" ? <button className="text-red-300" title="Cancelar venda" onClick={() => onCancel(sale)}><XCircle className="h-4 w-4" /></button> : null}
              </div>
            </td>
          </tr>
        )) : <tr className="table-row"><td className="px-4 py-6 text-center text-zinc-400" colSpan={compact ? 6 : 7}>Nenhum registo encontrado.</td></tr>}
      </Table>
    </div>
  );
}

function SaleDetails({ sale, onClose }: { sale: SaleRecord; onClose: () => void }) {
  return (
    <Card className="mt-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><ReceiptText className="h-4 w-4 text-noogym-lime" />Detalhes da venda</h2>
          <p className="text-sm text-zinc-400">{sale.id}</p>
        </div>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
        <p><span className="block text-zinc-400">Cliente</span>{sale.customer ?? "Consumidor final"}</p>
        <p><span className="block text-zinc-400">Vendedor</span>{sale.seller}</p>
        <p><span className="block text-zinc-400">Pagamento</span>{sale.paymentMethod}</p>
        <p><span className="block text-zinc-400">Status</span>{sale.status ?? "Concluida"}</p>
      </div>
      <div className="mt-4 space-y-2">
        {(sale.items ?? []).map((item) => <p key={item.id} className="flex justify-between rounded border border-white/10 px-3 py-2 text-sm"><span>{item.quantity}x {item.name}</span><span>{money(item.quantity * item.unitPrice)}</span></p>)}
      </div>
      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm md:grid-cols-4">
        <p className="flex justify-between md:block"><span className="text-zinc-400">Subtotal</span> <span>{money(sale.subtotal ?? sale.total)}</span></p>
        <p className="flex justify-between md:block"><span className="text-zinc-400">Desconto</span> <span>{money(sale.discountAmount ?? 0)}</span></p>
        <p className="flex justify-between md:block"><span className="text-zinc-400">Taxa</span> <span>{money(sale.taxAmount ?? 0)}</span></p>
        <p className="flex justify-between text-lg font-semibold text-noogym-lime md:block"><span>Total</span> <span>{money(sale.total)}</span></p>
      </div>
    </Card>
  );
}
