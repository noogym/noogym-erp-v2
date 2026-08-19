import { Barcode, Copy, Eye, Pencil, Plus, Printer, ReceiptText, RefreshCcw, ShoppingCart, Trash2, WalletCards, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAppStore } from "../store/appStore";
import { useFinanceStore } from "../store/financeStore";
import { usePlansStore } from "../store/plansStore";
import { useProductsStore } from "../store/productsStore";
import { selectPosCartItemsCount, usePosCartStore, type PosCartItem } from "../store/posCartStore";
import { useSalesStore } from "../store/salesStore";
import { useOperationalSettingsStore } from "../store/operationalSettingsStore";
import { toastInfo, toastSuccess } from "../store/toastStore";
import { buildPrinterConfig, validatePrintingConfig } from "../lib/printerConfig";
import { openCashDrawerViaAgent, printReceiptInBrowser, printReceiptViaAgent } from "../lib/webPrint";
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

type CartItem = PosCartItem;
type CashSession = {
  id: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  countedAmount?: number;
  operator: string;
  note?: string;
};

const mainTabs: MainTab[] = ["Nova venda", "Vendas", "Orcamentos", "Caixa do dia"];
const catalogTabs = ["Produtos", "Planos", "Aulas", "Servicos"];
const serviceItems: CatalogItem[] = [
  { id: "SVC-001", name: "Avaliacao fisica", category: "Servicos", price: 8000, detail: "Sessao individual", emoji: "AVL", kind: "service" },
  { id: "SVC-002", name: "Personal trainer", category: "Servicos", price: 12000, detail: "Treino acompanhado", emoji: "PT", kind: "service" },
  { id: "SVC-003", name: "Plano alimentar", category: "Servicos", price: 10000, detail: "Consulta nutricional", emoji: "NUT", kind: "service" },
  { id: "SVC-004", name: "Massagem desportiva", category: "Servicos", price: 15000, detail: "Recuperacao muscular", emoji: "MAS", kind: "service" }
];
const cashSessionKey = "noogym:pos-cash-session";
const pendingQuickSaleKey = "noogym:pos-pending-item";

const readCashSession = (): CashSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(cashSessionKey) ?? "null") as CashSession | null;
    return parsed?.status === "open" ? parsed : null;
  } catch {
    return null;
  }
};

const writeCashSession = (session: CashSession | null) => {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(cashSessionKey, JSON.stringify(session));
  else window.localStorage.removeItem(cashSessionKey);
};

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
const saleItemToCartId = (sale: SaleRecord, item: SaleItemRecord, index: number) =>
  item.productId ?? item.planId ?? item.classId ?? item.id ?? `${item.kind ?? "service"}-${sale.id}-${index}`;
const cartItemKey = (item: CartItem, index: number) =>
  `${item.kind}-${item.id || `${item.name}-${item.price}`}-${index}`;
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const saleToCartItems = (sale: SaleRecord): CartItem[] => sale.items?.map((item, index) => ({
  id: saleItemToCartId(sale, item, index),
  name: item.name,
  category: item.kind ?? "POS",
  price: item.unitPrice,
  detail: sale.dateTime,
  emoji: item.kind === "product" ? "PRD" : item.kind === "plan" ? "PLN" : item.kind === "class" ? "AUL" : "SVC",
  kind: (item.kind as CatalogKind | undefined) ?? "service",
  sku: item.sku,
  qty: item.quantity
})) ?? [];

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
  const payments = sale.payments?.length
    ? sale.payments.map((payment) => `${payment.method}: ${money(payment.amount)}${payment.reference ? ` (${payment.reference})` : ""}`).join("\n")
    : sale.paymentMethod;
  return [
    "Noogym Fitness Center",
    "Recibo POS",
    "",
    `Recibo: ${sale.receiptNumber ?? sale.id}`,
    `Codigo: ${sale.id}`,
    `Caixa: ${sale.cashSessionId ?? "Sem sessao"}`,
    `Data: ${sale.dateTime}`,
    `Cliente: ${sale.customer ?? "Consumidor final"}`,
    `Vendedor: ${sale.seller}`,
    `Pagamento: ${sale.paymentMethod}`,
    "",
    rows,
    "",
    `Subtotal: ${money(sale.subtotal ?? sale.total)}`,
    `Desconto: ${money(sale.discountAmount ?? 0)}`,
    sale.discountReason ? `Motivo desconto: ${sale.discountReason}` : "",
    `Taxa: ${money(sale.taxAmount ?? 0)}`,
    `Total: ${money(sale.total)}`,
    `Recebido: ${money(sale.amountReceived ?? sale.total)}`,
    `Troco: ${money(sale.changeAmount ?? 0)}`,
    sale.paymentReference ? `Referencia: ${sale.paymentReference}` : "",
    "",
    "Pagamentos:",
    payments,
    `Status: ${sale.status ?? "Concluida"}`
  ].filter((line) => line !== "").join("\n");
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

function saleToThermalReceiptData(sale: SaleRecord, footer: string) {
  return {
    gymName: "Noogym Fitness Center",
    customerName: sale.customer ?? "Consumidor final",
    cashierName: sale.seller,
    items: sale.items?.length
      ? sale.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
          sku: item.sku
        }))
      : [{ name: sale.type, quantity: 1, unitPrice: sale.total, total: sale.total }],
    subtotal: sale.subtotal ?? sale.total,
    discount: sale.discountAmount ?? 0,
    tax: sale.taxAmount ?? 0,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    paidAmount: sale.amountReceived ?? sale.total,
    changeAmount: sale.changeAmount ?? 0,
    date: sale.soldAtIso ?? new Date(),
    message: footer.trim() || "Obrigado pela preferencia.",
    invoiceNumber: sale.receiptNumber ?? sale.id,
    qrCode: {
      label: "Recibo Noogym",
      value: `noogym://receipt/${sale.receiptNumber ?? sale.id}`
    }
  };
}

const hasCashPayment = (sale: SaleRecord) =>
  sale.paymentMethod === "Dinheiro" || Boolean(sale.payments?.some((payment) => payment.method === "Dinheiro" && payment.amount > 0));

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
  const [editingQuote, setEditingQuote] = useState<SaleRecord | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(readCashSession);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [countedAmount, setCountedAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const products = useProductsStore((state) => state.products);
  const reduceStock = useProductsStore((state) => state.reduceStock);
  const plans = usePlansStore((state) => state.plans);
  const classes = useClassesStore((state) => state.classes);
  const sales = useSalesStore((state) => state.sales);
  const cancelSale = useSalesStore((state) => state.cancelSale);
  const cart = usePosCartStore((state) => state.items);
  const addCartItem = usePosCartStore((state) => state.addItem);
  const clearCart = usePosCartStore((state) => state.clear);
  const removeCartItemAt = usePosCartStore((state) => state.removeAt);
  const setCart = usePosCartStore((state) => state.setItems);
  const setCartItemQtyAt = usePosCartStore((state) => state.setItemQtyAt);
  const cartItemsCount = usePosCartStore(selectPosCartItemsCount);
  const printing = useOperationalSettingsStore((state) => state.settings.printing);
  const receiptFooter = useOperationalSettingsStore((state) => state.settings.finance.receiptFooter);

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
  const activeGymId = useAppStore((state) => state.activeGymId);
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const remoteCashSession = useFinanceStore((state) => state.currentCashSession);
  const loadRemoteCashSessions = useFinanceStore((state) => state.loadCashSessions);
  const openRemoteCashSession = useFinanceStore((state) => state.openCashSession);
  const closeRemoteCashSession = useFinanceStore((state) => state.closeCashSession);
  const requiresCustomer = cart.some((item) => item.kind === "plan" || item.kind === "class");
  const isCashOpen = onlineOnly ? remoteCashSession?.status === "OPEN" : cashSession?.status === "open";
  const activeCashSessionId = onlineOnly ? remoteCashSession?.id : cashSession?.id;
  const activeCashOpenedAt = onlineOnly ? remoteCashSession?.openedAt : cashSession?.openedAt;
  const activeCashOpeningAmount = onlineOnly ? remoteCashSession?.openingAmount ?? 0 : cashSession?.openingAmount ?? 0;
  const activeCashExpectedAmount = onlineOnly ? remoteCashSession?.expected.total ?? activeCashOpeningAmount : activeCashOpeningAmount + cashSummary.net;
  const activeCashOperator = onlineOnly ? remoteCashSession?.openedBy?.name ?? "Admin" : cashSession?.operator ?? "Admin";
  const saleItems: SaleItemRecord[] = useMemo(() => cart.map((item, index) => ({
    id: cartItemKey(item, index),
    productId: item.kind === "product" ? item.id || undefined : undefined,
    planId: item.kind === "plan" ? item.id || undefined : undefined,
    classId: item.kind === "class" ? item.id || undefined : undefined,
    name: item.name,
    sku: item.sku,
    quantity: item.qty,
    unitPrice: item.price,
    kind: item.kind
  })), [cart]);

  useEffect(() => {
    if (!onlineOnly) return;
    void loadRemoteCashSessions().catch(() => {
      toastInfo("Caixa remoto indisponivel", "Nao foi possivel carregar a sessao de caixa da API.");
    });
  }, [activeGymId, loadRemoteCashSessions, onlineOnly]);

  const addToCart = useCallback((item: CatalogItem) => {
    addCartItem(item);
    toastSuccess(item.kind === "product" ? "Produto adicionado ao carrinho." : "Item adicionado ao carrinho.", item.name);
  }, [addCartItem]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(pendingQuickSaleKey);
    if (!raw) return;
    window.sessionStorage.removeItem(pendingQuickSaleKey);
    try {
      const item = JSON.parse(raw) as CatalogItem;
      if (!item.id || !item.name || !item.kind) return;
      addToCart(item);
      setMainTab("Nova venda");
    } catch {
      toastInfo("Atalho POS ignorado", "Nao foi possivel carregar o item rapido.");
    }
  }, [addToCart]);
  const printSaleReceipt = useCallback(async (sale: SaleRecord, options?: { silentDisabled?: boolean }) => {
    if (!printing.enabled) {
      if (!options?.silentDisabled) toastInfo("Impressao desativada", "Ative a impressao nas configuracoes operacionais.");
      return;
    }

    const data = saleToThermalReceiptData(sale, receiptFooter);
    const config = buildPrinterConfig(printing);
    const printerBridge = typeof window === "undefined" ? undefined : window.noogym?.printer;
    try {
      if (printerBridge) {
        const validation = validatePrintingConfig(printing);
        if (validation) {
          toastInfo("Configuracao incompleta", validation);
          return;
        }

        const result = await printerBridge.printReceipt(data, config);
        if (!result.success) {
          toastInfo("Impressao falhou", result.error || result.message);
          return;
        }

        toastSuccess("Recibo enviado", result.message);
        if (printing.cashDrawerEnabled && printing.openDrawerOnCashPayment && hasCashPayment(sale)) {
          const drawerResult = await printerBridge.openCashDrawer(config);
          if (!drawerResult.success) {
            toastInfo("Gaveta nao abriu", drawerResult.error || drawerResult.message);
          }
        }
        return;
      }

      const browserValidation = validatePrintingConfig(printing, { requireDevice: false });
      if (browserValidation) {
        toastInfo("Configuracao incompleta", browserValidation);
        return;
      }

      if (printing.webPrintMode === "agent") {
        const result = await printReceiptViaAgent(data, config, printing.printAgentUrl);
        if (result.success) {
          toastSuccess("Recibo enviado", result.message);
          if (printing.cashDrawerEnabled && printing.openDrawerOnCashPayment && hasCashPayment(sale)) {
            const drawerResult = await openCashDrawerViaAgent(config, printing.printAgentUrl);
            if (!drawerResult.success) toastInfo("Gaveta nao abriu", drawerResult.error || drawerResult.message);
          }
          return;
        }
        toastInfo("Print Agent indisponivel", result.error || result.message);
      }

      const result = printReceiptInBrowser(data, {
        paperWidth: printing.paperWidth,
        title: `Recibo ${sale.receiptNumber ?? sale.id}`
      });
      if (!result.success) {
        toastInfo("Impressao falhou", result.error || result.message);
        downloadReceipt(sale);
        return;
      }
      toastSuccess("Impressao do navegador", result.message);
    } catch (error) {
      toastInfo("Impressao falhou", errorMessage(error, "Nao foi possivel enviar o recibo para a impressora."));
      downloadReceipt(sale);
    }
  }, [printing, receiptFooter]);
  const fillCartFromSale = (sale: SaleRecord) => {
    setCart(saleToCartItems(sale));
    setEditingQuote(null);
    setMainTab("Nova venda");
    toastSuccess("Carrinho preenchido", "Os itens da venda foram adicionados para uma nova operacao.");
  };
  const editQuote = (sale: SaleRecord) => {
    setCart(saleToCartItems(sale));
    setEditingQuote(sale);
    setMainTab("Nova venda");
    toastSuccess("Orcamento em edicao", sale.customer ?? sale.id);
  };
  const finishCart = (saleType: string, savedSale?: SaleRecord) => {
    if (saleType !== "Orcamento") {
      reduceStock(cart.filter((item) => item.kind === "product").map((item) => ({ id: item.id, qty: item.qty })), { sync: false });
      if (savedSale && printing.autoPrintReceipt) void printSaleReceipt(savedSale, { silentDisabled: true });
    }
    clearCart();
    setEditingQuote(null);
  };
  const openCashSession = async () => {
    const amount = Number(openingAmount);
    const openingValue = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    if (onlineOnly) {
      try {
        const session = await openRemoteCashSession({
          gymId: activeGymId ?? undefined,
          openingAmount: openingValue,
          notes: cashNote.trim() || undefined
        });
        setCashNote("");
        toastSuccess("Caixa aberto", money(session?.openingAmount ?? openingValue));
      } catch (error) {
        toastInfo("Caixa nao abriu", errorMessage(error, "A API nao confirmou a abertura do caixa."));
      }
      return;
    }
    const nextSession: CashSession = {
      id: `CASH-${Date.now()}`,
      status: "open",
      openedAt: new Date().toISOString(),
      openingAmount: openingValue,
      operator: "Admin",
      note: cashNote.trim() || undefined
    };
    writeCashSession(nextSession);
    setCashSession(nextSession);
    setCashNote("");
    toastSuccess("Caixa aberto", money(nextSession.openingAmount));
  };
  const closeCashSession = async () => {
    const hasCountedAmount = countedAmount.trim() !== "";
    const counted = Number(countedAmount);
    const countedValue = hasCountedAmount && Number.isFinite(counted) ? Math.max(0, counted) : activeCashExpectedAmount;
    if (onlineOnly) {
      if (!remoteCashSession) return;
      try {
        const session = await closeRemoteCashSession(remoteCashSession.id, {
          actualCash: hasCountedAmount ? countedValue : undefined,
          notes: cashNote.trim() || undefined
        });
        setCountedAmount("");
        setCashNote("");
        toastSuccess("Caixa fechado", `Diferenca: ${money(session?.difference ?? 0)}`);
      } catch (error) {
        toastInfo("Caixa nao fechou", errorMessage(error, "A API nao confirmou o fechamento do caixa."));
      }
      return;
    }
    if (!cashSession) return;
    const closedSession = {
      ...cashSession,
      status: "closed" as const,
      closedAt: new Date().toISOString(),
      countedAmount: countedValue,
      note: cashNote.trim() || cashSession.note
    };
    writeCashSession(null);
    setCashSession(null);
    setCountedAmount("");
    setCashNote("");
    toastSuccess("Caixa fechado", `Diferenca: ${money((closedSession.countedAmount ?? 0) - (cashSession.openingAmount + cashSummary.net))}`);
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
            {!isCashOpen ? (
              <div className="mt-4 rounded-md border border-orange-400/30 bg-orange-400/10 p-3 text-sm text-orange-100">
                Caixa fechado. Abra o caixa em "Caixa do dia" para finalizar vendas. Orcamentos podem ser salvos sem caixa aberto.
              </div>
            ) : null}
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
            <SalesTable sales={salesPageData.pageRows} onView={setSelectedSale} onReceipt={printSaleReceipt} onDuplicate={fillCartFromSale} onCancel={(sale) => { setSelectedSale(sale); setModal("cancelSale"); }} />
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
            <SalesTable sales={quotesPageData.pageRows} onView={setSelectedSale} onReceipt={printSaleReceipt} onDuplicate={fillCartFromSale} onEdit={editQuote} onConvert={fillCartFromSale} />
            <ListPagination page={quotesPageData.page} totalPages={quotesPageData.totalPages} totalItems={filteredQuotes.length} start={quotesPageData.start} end={quotesPageData.end} label="orcamentos" onPageChange={setQuotesPage} />
            {selectedSale ? <SaleDetails sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
          </>
        ) : null}

        {mainTab === "Caixa do dia" ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="p-5 xl:col-span-2">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <h2 className="font-semibold">{isCashOpen ? "Caixa aberto" : "Caixa fechado"}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {isCashOpen && activeCashOpenedAt ? `Aberto em ${new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(new Date(activeCashOpenedAt))}` : "Abra o caixa para iniciar vendas do turno."}
                  </p>
                  {isCashOpen ? (
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <p className="rounded-md border border-white/10 bg-white/[0.03] p-3"><span className="block text-zinc-400">Inicial</span>{money(activeCashOpeningAmount)}</p>
                      <p className="rounded-md border border-white/10 bg-white/[0.03] p-3"><span className="block text-zinc-400">Esperado</span>{money(activeCashExpectedAmount)}</p>
                      <p className="rounded-md border border-white/10 bg-white/[0.03] p-3"><span className="block text-zinc-400">Operador</span>{activeCashOperator}</p>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {isCashOpen ? (
                    <>
                      <Input type="number" min="0" value={countedAmount} onChange={(event) => setCountedAmount(event.target.value)} placeholder="Valor contado no fecho" />
                      <Input value={cashNote} onChange={(event) => setCashNote(event.target.value)} placeholder="Observacao do fecho" />
                      <Button className="w-full" variant="primary" icon={<WalletCards className="h-4 w-4" />} onClick={closeCashSession}>Fechar caixa</Button>
                    </>
                  ) : (
                    <>
                      <Input type="number" min="0" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="Valor inicial" />
                      <Input value={cashNote} onChange={(event) => setCashNote(event.target.value)} placeholder="Observacao de abertura" />
                      <Button className="w-full" variant="primary" icon={<WalletCards className="h-4 w-4" />} onClick={openCashSession}>Abrir caixa</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
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
              <SalesTable sales={todaySales} compact onView={setSelectedSale} onReceipt={printSaleReceipt} onDuplicate={fillCartFromSale} />
            </div>
          </div>
        ) : null}
      </div>

      {mainTab === "Nova venda" ? (
        <aside className="panel p-4">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingQuote ? "Editar orcamento" : "Carrinho"}</h2><span className="text-xs text-zinc-400">{cartItemsCount} itens</span><button onClick={() => setModal("clear")}><Trash2 className="h-4 w-4" /></button></div>
          {editingQuote ? (
            <div className="mb-3 rounded-md border border-noogym-lime/30 bg-noogym-lime/10 p-3 text-xs text-noogym-lime">
              Orcamento {editingQuote.receiptNumber ?? editingQuote.id} em edicao.
            </div>
          ) : null}
          <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
            {cart.length ? cart.map((item, index) => (
              <div key={cartItemKey(item, index)} className="soft-card flex gap-3 p-3">
                <ProductVisual label={item.emoji} className="h-14 w-14" />
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm">{item.name}</p>
                    <button onClick={() => removeCartItemAt(index)}><X className="h-4 w-4 text-zinc-500" /></button>
                  </div>
                  <p className="text-xs text-zinc-400">{money(item.price)}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button className="rounded border border-white/10 px-2" onClick={() => setCartItemQtyAt(index, item.qty - 1)}>-</button>
                    <span>{item.qty}</span>
                    <button className="rounded border border-white/10 px-2" onClick={() => setCartItemQtyAt(index, item.qty + 1)}>+</button>
                  </div>
                </div>
                <p className="self-center text-sm font-semibold">{money(item.price * item.qty)}</p>
              </div>
            )) : <p className="rounded-lg border border-white/10 p-4 text-center text-sm text-zinc-400">Carrinho vazio.</p>}
          </div>
          <Card className="mt-3 p-4 shadow-none"><p className="flex justify-between text-sm text-zinc-300">Subtotal <span>{money(total)}</span></p><p className="mt-3 flex justify-between text-sm text-zinc-300">Desconto <button className="text-noogym-lime" disabled={!cart.length} onClick={() => setModal("finalize")}>Adicionar desconto</button></p><p className="mt-5 flex justify-between border-t border-white/10 pt-5 text-xl font-semibold">Total <span className="text-noogym-lime">{money(total)}</span></p></Card>
          <Button className="mt-4 w-full" variant="primary" icon={<ShoppingCart className="h-5 w-5" />} disabled={!cart.length || !isCashOpen} onClick={() => setModal("finalize")}>Finalizar venda</Button>
          <div className="mt-3 grid grid-cols-2 gap-2"><Button disabled={!cart.length} onClick={() => setModal("quote")}>{editingQuote ? "Atualizar orcamento" : "Salvar orcamento"}</Button><Button onClick={() => setModal("clear")}>{editingQuote ? "Cancelar edicao" : "Limpar carrinho"}</Button></div>
        </aside>
      ) : null}

      <FinalizeSaleModal open={modal === "finalize" || modal === "quote"} total={total} items={saleItems} initialSaleType={modal === "quote" ? "Orcamento" : "Venda normal"} editingSale={modal === "quote" ? editingQuote : null} requireCustomer={requiresCustomer} cashSessionId={activeCashSessionId} onClose={() => setModal(null)} onConfirmed={finishCart} />
      <BarcodeModal
        open={modal === "barcode"}
        onClose={() => setModal(null)}
        onFound={(product) => addToCart(productToCatalogItem(product))}
      />
      <ConfirmModal open={modal === "clear"} title={editingQuote ? "Cancelar edicao" : "Limpar carrinho"} message={editingQuote ? "Deseja sair da edicao deste orcamento e limpar o carrinho?" : "Tem certeza que deseja remover todos os itens do carrinho?"} confirmLabel={editingQuote ? "Cancelar edicao" : "Limpar carrinho"} danger onClose={() => setModal(null)} onConfirm={() => { clearCart(); setEditingQuote(null); toastSuccess(editingQuote ? "Edicao cancelada" : "Carrinho limpo com sucesso"); setModal(null); }} />
      <ConfirmModal open={modal === "cancelSale"} title="Cancelar venda" message="A venda sera marcada como cancelada e deixara de contar no caixa." confirmLabel="Cancelar venda" danger onClose={() => { setSelectedSale(null); setModal(null); }} onConfirm={handleCancel} />
    </div>
  );
}

function SalesTable({ sales, compact, onView, onReceipt, onDuplicate, onEdit, onCancel, onConvert }: { sales: SaleRecord[]; compact?: boolean; onView: (sale: SaleRecord) => void; onReceipt: (sale: SaleRecord) => void; onDuplicate: (sale: SaleRecord) => void; onEdit?: (sale: SaleRecord) => void; onCancel?: (sale: SaleRecord) => void; onConvert?: (sale: SaleRecord) => void }) {
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
                <button title="Imprimir recibo" onClick={() => onReceipt(sale)}><Printer className="h-4 w-4" /></button>
                {onEdit ? <button className="text-zinc-200" title="Editar orcamento" onClick={() => onEdit(sale)}><Pencil className="h-4 w-4" /></button> : null}
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
        <p><span className="block text-zinc-400">Recibo</span>{sale.receiptNumber ?? "-"}</p>
        <p><span className="block text-zinc-400">Caixa</span>{sale.cashSessionId ?? "-"}</p>
        <p><span className="block text-zinc-400">Referencia</span>{sale.paymentReference ?? "-"}</p>
        <p><span className="block text-zinc-400">Troco</span>{money(sale.changeAmount ?? 0)}</p>
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
      {sale.payments?.length ? <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{sale.payments.map((payment) => <p key={payment.id} className="flex justify-between rounded border border-white/10 px-3 py-2 text-sm"><span>{payment.method}{payment.reference ? ` - ${payment.reference}` : ""}</span><span>{money(payment.amount)}</span></p>)}</div> : null}
      {sale.discountReason ? <p className="mt-3 rounded border border-white/10 p-3 text-sm text-zinc-300">Motivo do desconto: {sale.discountReason}</p> : null}
    </Card>
  );
}
