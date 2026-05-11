export type FinanceTone = "lime" | "red" | "yellow" | "blue" | "purple" | "cyan" | "green" | "gray";

export interface FinanceKpi {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  tone?: FinanceTone;
}

export interface FinanceSeries {
  name: string;
  values: number[];
  color: string;
}

export interface FinanceSlice {
  label: string;
  value: number;
  amount?: string;
  color: string;
}

export const financePeriod = "01/05/2024 - 15/05/2024";
export const financeDays = ["01/05", "02/05", "03/05", "04/05", "05/05", "06/05", "07/05", "08/05", "09/05", "10/05", "11/05", "12/05", "13/05", "14/05", "15/05"];
export const financeWeekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const financeColors = {
  lime: "#B6FF00",
  lime2: "#8FCB00",
  red: "#FF2D20",
  orange: "#FFB000",
  yellow: "#FACC15",
  blue: "#2F91FF",
  purple: "#8B5CF6",
  cyan: "#00D7FF",
  green: "#22C55E",
  gray: "#64748B"
};

export const revenuesMock = {
  kpis: [
    { title: "Receita total", value: "245.000 Kz", change: "+ 22% vs período anterior", tone: "lime" },
    { title: "Receita recebida", value: "210.450 Kz", change: "+ 18% vs período anterior", tone: "lime" },
    { title: "Receita a receber", value: "34.550 Kz", change: "- 12% vs período anterior", tone: "yellow" },
    { title: "Média diária", value: "16.333 Kz", change: "+ 19% vs período anterior", tone: "lime" },
    { title: "Maior receita diária", value: "28.600 Kz", subtitle: "14/05/2024", change: "+ 14/05/2024", tone: "lime" }
  ] satisfies FinanceKpi[],
  evolution: [
    { name: "Receita total", values: [10, 22, 20, 30, 42, 31, 22, 32, 41, 36, 47, 43, 53, 49, 45], color: financeColors.lime },
    { name: "Média móvel (7 dias)", values: [7, 12, 16, 18, 25, 27, 19, 24, 31, 28, 36, 34, 42, 38, 37], color: financeColors.gray }
  ] satisfies FinanceSeries[],
  weekday: [32450, 28300, 30600, 31800, 45200, 41100, 35550],
  byCategory: [
    { label: "Mensalidades", value: 58, amount: "142.000 Kz", color: financeColors.lime },
    { label: "Vendas POS", value: 22, amount: "53.900 Kz", color: financeColors.orange },
    { label: "Aulas avulsas", value: 10, amount: "24.500 Kz", color: "#F59E9E" },
    { label: "Taxas e multas", value: 5, amount: "12.300 Kz", color: financeColors.blue },
    { label: "Outros", value: 5, amount: "12.300 Kz", color: financeColors.purple }
  ] satisfies FinanceSlice[],
  byPlan: [
    { label: "Unlimited", value: 46, amount: "65.320 Kz", color: financeColors.lime },
    { label: "Pro", value: 28, amount: "39.760 Kz", color: financeColors.orange },
    { label: "Basic", value: 18, amount: "25.560 Kz", color: "#C084FC" },
    { label: "Day Pass", value: 8, amount: "11.360 Kz", color: "#65A30D" }
  ] satisfies FinanceSlice[],
  detailRows: [
    ["Mensalidades", "142.000", "58%", "+ 22%"],
    ["Vendas POS", "53.900", "22%", "+ 18%"],
    ["Aulas avulsas", "24.500", "10%", "+ 10%"],
    ["Taxas e multas", "12.300", "5%", "- 5%"],
    ["Outros", "12.300", "5%", "+ 24%"],
    ["Total", "245.000", "100%", "+ 22%"]
  ],
  methods: [
    ["Cartão", "51% (124.950 Kz)", 82],
    ["Dinheiro", "32% (78.400 Kz)", 62],
    ["Transferência", "12% (29.400 Kz)", 24],
    ["Outros", "5% (12.250 Kz)", 8]
  ],
  topClients: [
    ["Ana Luísa", "35.200 Kz"],
    ["Carlos Mendes", "28.600 Kz"],
    ["Mariana Costa", "22.400 Kz"],
    ["Lucas Ferreira", "18.900 Kz"],
    ["João Silva", "16.300 Kz"]
  ]
};

export const expensesMock = {
  kpis: [
    { title: "Despesas totais", value: "62.300 Kz", change: "+ 9% vs período anterior", tone: "red" },
    { title: "Despesas fixas", value: "38.450 Kz", change: "+ 7% vs período anterior", tone: "yellow" },
    { title: "Despesas variáveis", value: "23.850 Kz", change: "+ 12% vs período anterior", tone: "purple" },
    { title: "Maior despesa diária", value: "8.250 Kz", subtitle: "13/05/2024", tone: "red" },
    { title: "Média diária", value: "4.153 Kz", change: "+ 10% vs período anterior", tone: "blue" },
    { title: "Total de categorias", value: "12", change: "igual vs período anterior", tone: "green" }
  ] satisfies FinanceKpi[],
  evolution: [
    { name: "Despesas totais", values: [2200, 3500, 4200, 3300, 4600, 6800, 5200, 3800, 5300, 6200, 5100, 5900, 6000, 5200, 6700], color: financeColors.red },
    { name: "Média móvel (7 dias)", values: [1400, 1800, 2300, 2600, 3100, 4100, 3800, 3300, 3500, 3900, 3900, 4400, 4200, 6500, 5600], color: financeColors.gray }
  ] satisfies FinanceSeries[],
  weekday: [7450, 8800, 8100, 7650, 11250, 9050, 10000],
  byCategory: [
    { label: "Salários", value: 38.5, amount: "24.000 Kz", color: financeColors.red },
    { label: "Aluguel", value: 19.3, amount: "12.000 Kz", color: financeColors.orange },
    { label: "Manutenção", value: 9.3, amount: "5.800 Kz", color: "#FACC15" },
    { label: "Marketing", value: 7.2, amount: "4.500 Kz", color: "#A855F7" },
    { label: "Serviços", value: 5.1, amount: "3.200 Kz", color: financeColors.blue },
    { label: "Outros", value: 20.6, amount: "12.800 Kz", color: "#818CF8" }
  ] satisfies FinanceSlice[],
  byType: [
    { label: "Fixas", value: 61.7, amount: "38.450 Kz", color: financeColors.red },
    { label: "Variáveis", value: 38.3, amount: "23.850 Kz", color: "#60A5FA" }
  ] satisfies FinanceSlice[],
  detailRows: [
    ["Salários", "24.000", "38,5%", "+ 8%"],
    ["Aluguel", "12.000", "19,3%", "0%"],
    ["Manutenção", "5.800", "9,3%", "+ 15%"],
    ["Marketing", "4.500", "7,2%", "+ 10%"],
    ["Serviços", "3.200", "5,1%", "- 5%"],
    ["Outros", "12.800", "20,6%", "+ 7%"],
    ["Total", "62.300", "100%", "+ 9%"]
  ],
  biggest: [
    ["Salários", "24.000 Kz", 92],
    ["Aluguel", "12.000 Kz", 54],
    ["Manutenção", "5.800 Kz", 32],
    ["Marketing", "4.500 Kz", 25],
    ["Serviços", "3.200 Kz", 18]
  ]
};

export const accountsMock = {
  cards: [
    ["Conta BCI", "105.450 Kz", "285.600 Kz", "180.150 Kz", "Principal", financeColors.blue],
    ["Conta BAI", "53.500 Kz", "125.300 Kz", "71.800 Kz", "", financeColors.orange],
    ["Conta BFA", "27.850 Kz", "82.450 Kz", "54.600 Kz", "", financeColors.purple],
    ["Conta Millennium", "12.150 Kz", "31.200 Kz", "19.050 Kz", "", financeColors.cyan]
  ],
  table: [
    ["Conta BCI", "Banco BCI", "Corrente", "105.450 Kz", "105.450 Kz", "285.600 Kz", "180.150 Kz", "Ativa"],
    ["Conta BAI", "Banco BAI", "Corrente", "53.500 Kz", "53.500 Kz", "125.300 Kz", "71.800 Kz", "Ativa"],
    ["Conta BFA", "Banco BFA", "Corrente", "27.850 Kz", "27.850 Kz", "82.450 Kz", "54.600 Kz", "Ativa"],
    ["Conta Millennium", "Banco Millennium", "Corrente", "12.150 Kz", "12.150 Kz", "31.200 Kz", "19.050 Kz", "Ativa"],
    ["Conta Reserva", "Caixa Interno", "Poupança", "5.000 Kz", "5.000 Kz", "8.500 Kz", "3.500 Kz", "Ativa"]
  ],
  distribution: [
    { label: "Conta BCI", value: 51.8, amount: "105.450 Kz", color: financeColors.blue },
    { label: "Conta BAI", value: 26.2, amount: "53.500 Kz", color: financeColors.orange },
    { label: "Conta BFA", value: 13.6, amount: "27.850 Kz", color: financeColors.purple },
    { label: "Conta Millennium", value: 6, amount: "12.150 Kz", color: financeColors.cyan },
    { label: "Conta Reserva", value: 2.5, amount: "5.000 Kz", color: financeColors.green }
  ] satisfies FinanceSlice[],
  transactions: [
    ["15/05/2024 10:34", "Conta BCI", "Recebimento - Ana Luísa Santos", "Entrada", "Mensalidade", "+35.000 Kz", "105.450 Kz"],
    ["15/05/2024 09:15", "Banco BAI", "Pagamento - Salários", "Saída", "Salários", "-24.000 Kz", "53.500 Kz"],
    ["15/05/2024 08:45", "Conta BFA", "Transferência recebida", "Entrada", "Transferência", "+12.000 Kz", "27.850 Kz"],
    ["15/05/2024 07:32", "Conta Millennium", "Pagamento - Aluguel", "Saída", "Aluguel", "-12.000 Kz", "12.150 Kz"],
    ["14/05/2024 18:20", "Conta BCI", "Recebimento - Plano Trimestral", "Entrada", "Mensalidade", "+60.000 Kz", "70.450 Kz"]
  ],
  cashByAccount: [
    { name: "Entradas", values: [30, 40, 38, 35, 37, 39, 20, 18, 29, 14, 34, 44, 35, 26, 31], color: financeColors.lime },
    { name: "Saídas", values: [12, 21, 15, 10, 18, 9, 20, 14, 30, 11, 16, 9, 18, 10, 20], color: financeColors.red },
    { name: "Saldo líquido", values: [18, 27, 24, 20, 26, 22, 15, 17, 12, 18, 23, 31, 25, 19, 21], color: financeColors.gray }
  ] satisfies FinanceSeries[]
};

export const paymentMethodsMock = {
  kpis: [
    { title: "Receita total", value: "245.000 Kz", change: "+ 22% vs período anterior", tone: "lime" },
    { title: "Transações", value: "1.248", change: "+ 18% vs período anterior", tone: "blue" },
    { title: "Ticket médio", value: "196 Kz", change: "+ 4% vs período anterior", tone: "purple" },
    { title: "Reembolso total", value: "4.250 Kz", change: "- 8% vs período anterior", tone: "yellow" },
    { title: "Chargeback", value: "1.250 Kz", change: "- 12% vs período anterior", tone: "cyan" }
  ] satisfies FinanceKpi[],
  evolution: [
    { name: "Cartão", values: [23, 29, 28, 29, 33, 40, 36, 37, 44, 39, 42, 50, 48, 48, 58], color: financeColors.lime },
    { name: "Dinheiro", values: [10, 12, 13, 13, 21, 28, 24, 27, 29, 27, 31, 36, 34, 35, 42], color: financeColors.orange },
    { name: "Transferência", values: [3, 5, 5, 6, 7, 11, 8, 9, 12, 10, 13, 18, 16, 17, 22], color: financeColors.blue },
    { name: "Outros", values: [1, 2, 3, 2, 3, 5, 3, 4, 3, 3, 4, 5, 4, 6, 7], color: financeColors.purple }
  ] satisfies FinanceSeries[],
  distribution: [
    { label: "Cartão", value: 51, amount: "124.950 Kz", color: financeColors.lime },
    { label: "Dinheiro", value: 32, amount: "78.400 Kz", color: financeColors.orange },
    { label: "Transferência", value: 12, amount: "29.400 Kz", color: financeColors.blue },
    { label: "Outros", value: 5, amount: "12.250 Kz", color: financeColors.purple }
  ],
  transactions: [636, 398, 149, 65],
  performanceRows: [
    ["Cartão", "124.950", "51%", "636", "196", "+ 22%"],
    ["Dinheiro", "78.400", "32%", "398", "197", "+ 18%"],
    ["Transferência", "29.400", "12%", "149", "197", "+ 15%"],
    ["Outros", "12.250", "5%", "65", "189", "- 5%"],
    ["Total", "245.000", "100%", "1.248", "196", "+ 22%"]
  ],
  cardForms: [
    { label: "Crédito", value: 68, amount: "84.950 Kz", color: financeColors.lime },
    { label: "Débito", value: 25, amount: "31.250 Kz", color: financeColors.orange },
    { label: "Pré-pago", value: 7, amount: "8.750 Kz", color: financeColors.purple }
  ]
};

export const overdueMock = {
  kpis: [
    { title: "Total em atraso", value: "89.500 Kz", change: "- 8% vs período anterior", tone: "red" },
    { title: "Clientes inadimplentes", value: "35", change: "- 6% vs período anterior", tone: "yellow" },
    { title: "Contas em atraso", value: "42", change: "- 10% vs período anterior", tone: "purple" },
    { title: "Atraso médio", value: "32 dias", change: "- 4 dias vs período anterior", tone: "yellow" },
    { title: "Taxa de inadimplência", value: "4,2%", change: "- 0,4pp vs período anterior", tone: "green" }
  ] satisfies FinanceKpi[],
  evolution: [
    { name: "Valor em atraso", values: [38, 50, 55, 72, 58, 72, 75, 74, 82, 92, 82, 87, 81, 93, 103], color: financeColors.red },
    { name: "Número de clientes", values: [18, 31, 37, 45, 38, 48, 53, 49, 57, 61, 55, 59, 55, 61, 69], color: financeColors.gray }
  ] satisfies FinanceSeries[],
  delayRanges: [15200, 20800, 24900, 16300, 12300],
  origin: [
    { label: "Mensalidades", value: 58.4, amount: "52.300 Kz", color: financeColors.red },
    { label: "Planos", value: 24.7, amount: "22.100 Kz", color: financeColors.orange },
    { label: "Taxas e multas", value: 9.8, amount: "8.800 Kz", color: financeColors.yellow },
    { label: "Aulas avulsas", value: 4.1, amount: "3.700 Kz", color: financeColors.green },
    { label: "Outros", value: 3, amount: "2.600 Kz", color: financeColors.purple }
  ],
  clients: [
    ["Carlos Mendes", "Unlimited", "68", "14.800 Kz", "07/03/2024"],
    ["Ana Luísa", "Pro", "54", "12.500 Kz", "21/03/2024"],
    ["Mariana Costa", "Basic", "45", "9.900 Kz", "30/03/2024"],
    ["Lucas Ferreira", "Pro", "38", "8.700 Kz", "06/04/2024"],
    ["João Silva", "Unlimited", "37", "15.600 Kz", "07/04/2024"],
    ["Patrícia Gomes", "Basic", "32", "6.200 Kz", "12/04/2024"],
    ["Rafael Lima", "Pro", "29", "8.900 Kz", "15/04/2024"],
    ["Beatriz Alves", "Day Pass", "25", "4.500 Kz", "19/04/2024"],
    ["Miguel Santos", "Unlimited", "23", "13.400 Kz", "21/04/2024"],
    ["Juliana Pereira", "Basic", "21", "5.500 Kz", "23/04/2024"]
  ],
  byPlan: [
    { label: "Unlimited", value: 47.3, amount: "42.300 Kz", color: financeColors.red },
    { label: "Pro", value: 31.7, amount: "28.400 Kz", color: financeColors.orange },
    { label: "Basic", value: 13.6, amount: "12.200 Kz", color: "#FACC15" },
    { label: "Day Pass", value: 5.1, amount: "4.600 Kz", color: financeColors.green },
    { label: "Outros", value: 2.3, amount: "2.000 Kz", color: financeColors.purple }
  ],
  actions: [
    ["Enviar lembretes de pagamento", "Contas com atraso entre 1 e 15 dias", "12 contas", "6.800 Kz", "Enviar"],
    ["Ligar para clientes", "Contas com atraso entre 16 e 30 dias", "8 contas", "9.200 Kz", "Ligar"],
    ["Negociar acordos", "Contas com atraso entre 31 e 60 dias", "10 contas", "13.700 Kz", "Negociar"],
    ["Enviar aviso de cobrança", "Contas com atraso acima de 60 dias", "12 contas", "27.800 Kz", "Enviar"]
  ]
};

export const cashFlowMock = {
  kpis: [
    { title: "Saldo inicial", value: "158.950 Kz", subtitle: "(01/05/2024)", tone: "lime" },
    { title: "Entradas totais", value: "533.050 Kz", change: "+ 22% vs período anterior", tone: "lime" },
    { title: "Saídas totais", value: "328.100 Kz", change: "+ 9% vs período anterior", tone: "red" },
    { title: "Saldo atual", value: "203.950 Kz", change: "+ 28,3% vs período anterior", tone: "blue" },
    { title: "Fluxo líquido", value: "+204.950 Kz", tone: "yellow" }
  ] satisfies FinanceKpi[],
  evolution: [
    { name: "Entradas", values: [15, 28, 27, 35, 57, 43, 58, 52, 63, 60, 67, 70, 80], color: financeColors.lime },
    { name: "Saídas", values: [0, 2, 4, 5, 17, 10, 17, 13, 18, 16, 22, 21, 27], color: financeColors.red },
    { name: "Saldo", values: [2, 12, 13, 14, 35, 21, 36, 29, 38, 35, 43, 49, 60], color: financeColors.blue }
  ] satisfies FinanceSeries[],
  weekdayEntries: [72300, 68450, 75600, 70800, 92100, 81250, 72550],
  weekdayExits: [48200, 44800, 47250, 45600, 58900, 55300, 44700],
  dailyRows: [
    ["15/05/2024 (Hoje)", "65.450", "30.500", "+34.950", "203.950"],
    ["14/05/2024", "58.900", "28.300", "+30.600", "169.000"],
    ["13/05/2024", "48.700", "32.200", "+16.500", "138.400"],
    ["12/05/2024", "42.900", "27.100", "+15.800", "121.900"],
    ["11/05/2024", "36.200", "22.800", "+13.400", "106.100"],
    ["10/05/2024", "54.300", "31.500", "+22.800", "92.700"]
  ],
  origins: [
    { label: "Mensalidades", value: 59.6, amount: "317.850 Kz", color: financeColors.lime },
    { label: "Vendas POS", value: 22.7, amount: "120.950 Kz", color: financeColors.orange },
    { label: "Aulas avulsas", value: 9.4, amount: "49.950 Kz", color: financeColors.purple },
    { label: "Taxas e multas", value: 4.6, amount: "24.300 Kz", color: financeColors.blue },
    { label: "Outros", value: 3.7, amount: "19.950 Kz", color: "#67E8F9" }
  ],
  exits: [
    { label: "Salários", value: 31, amount: "101.650 Kz", color: financeColors.red },
    { label: "Aluguel", value: 19.5, amount: "63.950 Kz", color: financeColors.orange },
    { label: "Manutenção", value: 14.6, amount: "47.850 Kz", color: "#FACC15" },
    { label: "Marketing", value: 10.9, amount: "35.750 Kz", color: "#C084FC" },
    { label: "Serviços", value: 7.3, amount: "24.000 Kz", color: financeColors.blue },
    { label: "Outros", value: 16.7, amount: "54.900 Kz", color: "#5EEAD4" }
  ]
};
