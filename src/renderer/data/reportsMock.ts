export type ReportTabKey =
  | "financial"
  | "clients"
  | "checkins"
  | "plans"
  | "classes"
  | "workouts"
  | "sales"
  | "products"
  | "employees";

export type ReportTone = "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "green";

export interface ReportKpi {
  title: string;
  value: string;
  detail?: string;
  change?: string;
  tone: ReportTone;
  icon: string;
}

export interface ReportSeries {
  labels: string[];
  values: number[];
  compare?: number[];
  unit?: string;
}

export interface DonutItem {
  label: string;
  value: number;
  detail?: string;
  color: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface ReportTableData {
  columns: TableColumn[];
  rows: Array<Record<string, string>>;
  actionLabel?: string;
}

export type ReportSection =
  | {
      type: "line" | "bar";
      title: string;
      span?: "wide" | "normal";
      control?: string;
      series: ReportSeries;
    }
  | {
      type: "horizontal";
      title: string;
      span?: "wide" | "normal";
      control?: string;
      labels: string[];
      values: number[];
      suffix?: string;
    }
  | {
      type: "donut";
      title: string;
      span?: "wide" | "normal";
      center: string;
      items: DonutItem[];
    }
  | {
      type: "heatmap";
      title: string;
      span?: "wide" | "normal";
      control?: string;
      rows: string[];
      columns: string[];
      values: number[][];
      lowLabel: string;
      highLabel: string;
    }
  | {
      type: "table";
      title: string;
      span?: "wide" | "normal";
      table: ReportTableData;
    }
  | {
      type: "summary";
      title: string;
      span?: "wide" | "normal";
      items: Array<{ label: string; value: string; trend?: string; tone?: ReportTone }>;
    }
  | {
      type: "funnel";
      title: string;
      span?: "wide" | "normal";
      items: Array<{ label: string; value: string; percent: number }>;
      footer?: { label: string; value: string; trend: string };
    };

export interface ReportConfig {
  key: ReportTabKey;
  label: string;
  subtitle: string;
  kpis: ReportKpi[];
  sections: ReportSection[];
}

export const reportPeriods = ["01/05/2024 - 15/05/2024", "01/04/2024 - 15/04/2024", "01/05/2024 - 31/05/2024"];
export const comparePeriods = ["16/04/2024 - 30/04/2024", "Sem comparação", "01/04/2024 - 15/04/2024"];
export const reportUnits = ["Noogym Fitness Center - Unidade Central", "Unidade Talatona", "Unidade Maianga"];

const labels15 = ["01/05", "03/05", "05/05", "07/05", "09/05", "11/05", "13/05", "15/05"];
const week = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const donutColors = ["#B6FF00", "#FACC15", "#F59E0B", "#A78BFA", "#60A5FA", "#EF4444"];
const names = ["João Paulo", "Ana Luísa", "Carlos Mendes", "Mariana Costa", "Lucas Ferreira"];

const peopleRows = names.map((name, index) => ({
  cliente: name,
  plano: ["Unlimited", "Pro", "Basic", "Pro", "Unlimited"][index],
  checkins: ["48", "42", "36", "35", "33"][index],
  ultimo: ["15/05/2024", "15/05/2024", "14/05/2024", "14/05/2024", "14/05/2024"][index]
}));

export const reportsMock: Record<ReportTabKey, ReportConfig> = {
  financial: {
    key: "financial",
    label: "Financeiro",
    subtitle: "Acompanhe os principais indicadores e desempenho do seu ginásio.",
    kpis: [
      { title: "Receita total", value: "2.245.000 Kz", change: "+18% vs período anterior", icon: "circle-dollar-sign", tone: "lime" },
      { title: "Receita de planos", value: "1.624.500 Kz", change: "+22% vs período anterior", icon: "route", tone: "lime" },
      { title: "Receita de aulas", value: "283.500 Kz", change: "+12% vs período anterior", icon: "network", tone: "orange" },
      { title: "Receita de vendas (POS)", value: "337.000 Kz", change: "+15% vs período anterior", icon: "shopping-bag", tone: "purple" },
      { title: "Inadimplência", value: "89.500 Kz", change: "-8% vs período anterior", icon: "circle-x", tone: "red" }
    ],
    sections: [
      { type: "line", title: "Receita ao longo do tempo", span: "wide", control: "Diário", series: { labels: labels15, values: [880, 1420, 1740, 1240, 1900, 1880, 2210, 2440], compare: [480, 820, 1020, 740, 980, 1190, 1040, 1410], unit: "K" } },
      { type: "donut", title: "Receita por categoria", center: "2.245.000 Kz", items: [{ label: "Planos", value: 72.3, detail: "1.624.500 Kz", color: donutColors[0] }, { label: "Aulas", value: 12.6, detail: "283.500 Kz", color: donutColors[1] }, { label: "Vendas (POS)", value: 15.1, detail: "337.000 Kz", color: donutColors[3] }] },
      { type: "donut", title: "Receita por forma de pagamento", center: "2.245.000 Kz", items: [{ label: "Cartão", value: 55.5, detail: "1.246.000 Kz", color: donutColors[0] }, { label: "Transferência", value: 29.9, detail: "672.000 Kz", color: donutColors[1] }, { label: "Dinheiro", value: 14.6, detail: "327.000 Kz", color: donutColors[3] }] },
      { type: "summary", title: "Recebimentos e inadimplência", items: [{ label: "Total recebido", value: "2.155.500 Kz", trend: "+18%", tone: "lime" }, { label: "Pendente de recebimento", value: "89.500 Kz", trend: "-8%", tone: "red" }, { label: "Taxa de inadimplência", value: "4,0%", trend: "-0,6pp", tone: "lime" }] },
      { type: "table", title: "Receita por plano", table: { columns: [{ key: "plano", label: "Plano" }, { key: "receita", label: "Receita", align: "right" }, { key: "percentual", label: "% da receita", align: "right" }], rows: [{ plano: "Unlimited", receita: "1.051.000 Kz", percentual: "46,8%" }, { plano: "Pro", receita: "416.000 Kz", percentual: "18,5%" }, { plano: "Basic", receita: "126.000 Kz", percentual: "5,6%" }, { plano: "Day Pass", receita: "31.500 Kz", percentual: "1,4%" }, { plano: "Total", receita: "1.624.500 Kz", percentual: "72,3%" }] } },
      { type: "summary", title: "Resumo financeiro", items: [{ label: "Receita total", value: "2.245.000 Kz" }, { label: "(-) Descontos e cancelamentos", value: "-65.000 Kz", tone: "red" }, { label: "Receita líquida", value: "2.180.000 Kz", tone: "lime" }, { label: "(-) Taxas e tarifas", value: "-24.500 Kz", tone: "red" }, { label: "Receita final", value: "2.155.500 Kz", tone: "lime" }] }
    ]
  },
  clients: {
    key: "clients",
    label: "Clientes",
    subtitle: "Acompanhe o crescimento, retenção e perfil dos clientes.",
    kpis: [
      { title: "Total de clientes", value: "1.248", change: "+12% vs período anterior", icon: "users", tone: "lime" },
      { title: "Novos clientes", value: "56", change: "+12% vs período anterior", icon: "user-plus", tone: "yellow" },
      { title: "Clientes ativos", value: "1.070", change: "+8% vs período anterior", icon: "user-check", tone: "blue" },
      { title: "Clientes inativos", value: "128", change: "-6% vs período anterior", icon: "user-x", tone: "purple" },
      { title: "Taxa de retenção", value: "85,7%", change: "+6,3pp vs período anterior", icon: "refresh-cw", tone: "green" }
    ],
    sections: [
      { type: "line", title: "Evolução de clientes ativos", span: "wide", control: "Diário", series: { labels: labels15, values: [700, 860, 930, 900, 1010, 990, 1080, 1150], compare: [470, 640, 720, 690, 790, 810, 900, 950] } },
      { type: "donut", title: "Distribuição por status", center: "1.248", items: [{ label: "Ativos (1070)", value: 85.7, color: donutColors[0] }, { label: "Inativos (128)", value: 10.3, color: donutColors[1] }, { label: "Cancelados (50)", value: 4, color: "#EF4444" }] },
      { type: "donut", title: "Distribuição por género", center: "1.248", items: [{ label: "Masculino (742)", value: 59.5, color: donutColors[0] }, { label: "Feminino (486)", value: 38.9, color: donutColors[1] }, { label: "Outro (20)", value: 1.6, color: donutColors[3] }] },
      { type: "bar", title: "Novos clientes", control: "Diário", series: { labels: labels15, values: [12, 18, 25, 22, 28, 24, 30, 34] } },
      { type: "table", title: "Top canais de aquisição", table: { columns: [{ key: "canal", label: "Canal" }, { key: "clientes", label: "Clientes", align: "right" }, { key: "total", label: "% do total", align: "right" }], rows: [{ canal: "Indicação", clientes: "298", total: "23,9%" }, { canal: "Instagram", clientes: "276", total: "22,1%" }, { canal: "Google", clientes: "210", total: "16,8%" }, { canal: "Facebook", clientes: "158", total: "12,7%" }, { canal: "Site / Orgânico", clientes: "120", total: "9,6%" }, { canal: "Total", clientes: "1.248", total: "100%" }] } },
      { type: "table", title: "Top clientes", table: { columns: [{ key: "cliente", label: "Cliente" }, { key: "plano", label: "Plano" }, { key: "checkins", label: "Check-ins", align: "right" }, { key: "ultimo", label: "Último check-in", align: "right" }], rows: peopleRows, actionLabel: "Ver todos os clientes" } }
    ]
  },
  checkins: {
    key: "checkins",
    label: "Check-ins",
    subtitle: "Acompanhe frequência, horários de pico e uso da unidade.",
    kpis: [
      { title: "Total de check-ins", value: "1.340", change: "+15% vs período anterior", icon: "circle-check", tone: "lime" },
      { title: "Check-ins únicos", value: "1.070", change: "+12% vs período anterior", icon: "user-check", tone: "blue" },
      { title: "Média diária", value: "89", change: "+10% vs período anterior", icon: "clock", tone: "yellow" },
      { title: "Melhor dia", value: "Sexta-feira", detail: "280 check-ins", icon: "calendar-days", tone: "purple" },
      { title: "Taxa de frequência", value: "78,5%", change: "+5,2pp vs período anterior", icon: "refresh-cw", tone: "green" }
    ],
    sections: [
      { type: "line", title: "Check-ins ao longo do tempo", span: "wide", control: "Diário", series: { labels: labels15, values: [105, 180, 168, 190, 240, 232, 248, 280], compare: [50, 102, 80, 94, 128, 145, 112, 180] } },
      { type: "bar", title: "Check-ins por dia da semana", span: "wide", control: "Total", series: { labels: week, values: [185, 210, 245, 230, 280, 120, 70] } },
      { type: "heatmap", title: "Horários de pico", control: "Por hora", rows: ["05h", "08h", "11h", "14h", "17h", "20h", "23h"], columns: week, lowLabel: "Baixo", highLabel: "Alto", values: [[20, 28, 35, 42, 38, 22, 18], [36, 45, 52, 60, 58, 42, 30], [48, 58, 66, 70, 78, 62, 44], [62, 72, 80, 86, 92, 75, 58], [78, 84, 90, 96, 100, 84, 68], [52, 62, 74, 80, 78, 66, 50], [25, 31, 34, 39, 42, 35, 28]] },
      { type: "donut", title: "Check-ins por tipo de plano", center: "1.340", items: [{ label: "Unlimited (820)", value: 61.2, color: donutColors[0] }, { label: "Pro (340)", value: 25.4, color: donutColors[1] }, { label: "Basic (160)", value: 11.9, color: donutColors[3] }, { label: "Day Pass (20)", value: 1.5, color: "#EF4444" }] },
      { type: "table", title: "Últimos check-ins", table: { columns: [{ key: "cliente", label: "Aluno" }, { key: "plano", label: "Plano" }, { key: "data", label: "Data e hora" }, { key: "entrada", label: "Entrada" }], rows: names.map((name, index) => ({ cliente: name, plano: ["Unlimited", "Pro", "Basic", "Pro", "Unlimited"][index], data: ["15/05/2024 10:28", "15/05/2024 10:22", "15/05/2024 10:18", "15/05/2024 10:15", "15/05/2024 10:12"][index], entrada: index === 2 ? "Entrada lateral" : "Entrada principal" })), actionLabel: "Ver todos" } }
    ]
  },
  plans: {
    key: "plans",
    label: "Planos",
    subtitle: "Acompanhe assinaturas, renovações, cancelamentos e conversão.",
    kpis: [
      { title: "Receita de planos", value: "1.624.500 Kz", change: "+22% vs período anterior", icon: "clipboard-list", tone: "lime" },
      { title: "Novas assinaturas", value: "86", change: "+18% vs período anterior", icon: "file-plus-2", tone: "yellow" },
      { title: "Renovações", value: "148", change: "+16% vs período anterior", icon: "refresh-cw", tone: "blue" },
      { title: "Cancelamentos", value: "50", change: "-8% vs período anterior", icon: "circle-x", tone: "purple" },
      { title: "Taxa de conversão", value: "28,6%", change: "+4,3pp vs período anterior", icon: "users", tone: "green" }
    ],
    sections: [
      { type: "line", title: "Receita de planos ao longo do tempo", span: "wide", control: "Diário", series: { labels: labels15, values: [980, 1540, 1380, 1500, 2080, 1760, 2010, 2280], compare: [460, 860, 670, 820, 1140, 900, 1240, 1400], unit: "K" } },
      { type: "donut", title: "Receita por plano", center: "1.624.500 Kz", items: [{ label: "Unlimited", value: 50.5, detail: "820.000 Kz", color: donutColors[0] }, { label: "Pro", value: 32, detail: "520.000 Kz", color: donutColors[1] }, { label: "Basic", value: 14.2, detail: "231.000 Kz", color: donutColors[4] }, { label: "Day Pass", value: 3.3, detail: "53.500 Kz", color: donutColors[3] }] },
      { type: "summary", title: "Status dos planos", items: [{ label: "Ativos", value: "1.070", tone: "lime" }, { label: "Inativos", value: "128", tone: "yellow" }, { label: "Pausados", value: "42", tone: "orange" }, { label: "Cancelados", value: "50", tone: "red" }, { label: "Total", value: "1.290" }] },
      { type: "line", title: "Novas assinaturas por plano", control: "Diário", series: { labels: labels15, values: [46, 68, 82, 66, 72, 78, 73, 88], compare: [30, 42, 38, 45, 48, 52, 49, 56] } },
      { type: "funnel", title: "Conversão de planos", items: [{ label: "Visitas à página de planos", value: "3.450", percent: 100 }, { label: "Cliques em planos", value: "1.248", percent: 72 }, { label: "Iniciaram contratação", value: "432", percent: 55 }, { label: "Pagamento concluído", value: "124", percent: 42 }], footer: { label: "Taxa de conversão geral", value: "28,6%", trend: "+4,3pp vs período anterior" } },
      { type: "table", title: "Top planos", table: { columns: [{ key: "plano", label: "Plano" }, { key: "assinaturas", label: "Assinaturas", align: "right" }, { key: "receita", label: "Receita", align: "right" }, { key: "percentual", label: "% da receita", align: "right" }], rows: [{ plano: "Unlimited", assinaturas: "43", receita: "820.000 Kz", percentual: "50,5%" }, { plano: "Pro", assinaturas: "27", receita: "520.000 Kz", percentual: "32,0%" }, { plano: "Basic", assinaturas: "12", receita: "231.000 Kz", percentual: "14,2%" }, { plano: "Day Pass", assinaturas: "4", receita: "53.500 Kz", percentual: "3,3%" }, { plano: "Total", assinaturas: "86", receita: "1.624.500 Kz", percentual: "100%" }] } }
    ]
  },
  classes: {
    key: "classes",
    label: "Aulas",
    subtitle: "Acompanhe o desempenho das aulas e a participação dos alunos.",
    kpis: [
      { title: "Aulas realizadas", value: "248", change: "+8% vs período anterior", icon: "calendar-days", tone: "purple" },
      { title: "Participantes totais", value: "3.240", change: "+12% vs período anterior", icon: "users", tone: "orange" },
      { title: "Participação média", value: "13,1 alunos", change: "+10% vs período anterior", icon: "user", tone: "blue" },
      { title: "Taxa de ocupação média", value: "72,4%", change: "+6,5pp vs período anterior", icon: "star", tone: "yellow" },
      { title: "Horas de aulas", value: "156h 30m", change: "+15% vs período anterior", icon: "clock", tone: "green" }
    ],
    sections: [
      { type: "line", title: "Evolução de aulas realizadas", control: "Diário", series: { labels: labels15, values: [17, 24, 26, 22, 32, 31, 30, 36], compare: [9, 12, 17, 13, 18, 14, 19, 22] } },
      { type: "bar", title: "Participantes por dia da semana", control: "Total", series: { labels: week, values: [520, 680, 720, 610, 910, 580, 220] } },
      { type: "heatmap", title: "Taxa de ocupação por horário", control: "Por hora", rows: ["06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"], columns: week, lowLabel: "Baixa ocupação", highLabel: "Alta ocupação", values: [[18, 22, 30, 36, 40, 28, 20], [42, 48, 58, 65, 62, 52, 38], [55, 62, 70, 75, 76, 68, 52], [48, 54, 62, 69, 72, 60, 45], [54, 66, 74, 88, 100, 74, 56], [50, 62, 72, 86, 94, 70, 55], [46, 58, 68, 78, 82, 66, 52], [32, 42, 48, 54, 58, 50, 40], [18, 24, 29, 34, 38, 32, 24]] },
      { type: "table", title: "Aulas mais populares", table: { columns: [{ key: "aula", label: "Aula" }, { key: "modalidade", label: "Modalidade" }, { key: "participantes", label: "Participantes", align: "right" }, { key: "ocupacao", label: "Taxa ocupação", align: "right" }], rows: [{ aula: "Spinning", modalidade: "Cardio", participantes: "680", ocupacao: "85%" }, { aula: "Funcional", modalidade: "Condicionamento", participantes: "520", ocupacao: "78%" }, { aula: "Yoga", modalidade: "Corpo e Mente", participantes: "420", ocupacao: "70%" }, { aula: "Zumba", modalidade: "Dança", participantes: "380", ocupacao: "63%" }, { aula: "HIIT", modalidade: "Alta Intensidade", participantes: "340", ocupacao: "68%" }], actionLabel: "Ver todas as aulas" } },
      { type: "donut", title: "Participação por modalidade", center: "3.240", items: [{ label: "Cardio", value: 34.6, detail: "1.120", color: donutColors[0] }, { label: "Condicionamento", value: 24.1, detail: "780", color: donutColors[1] }, { label: "Corpo e Mente", value: 16, detail: "520", color: donutColors[2] }, { label: "Dança", value: 13.3, detail: "430", color: donutColors[3] }, { label: "Alta Intensidade", value: 12, detail: "390", color: donutColors[4] }] },
      { type: "table", title: "Próximas aulas", table: { columns: [{ key: "aula", label: "Aula" }, { key: "instrutor", label: "Instrutor" }, { key: "horario", label: "Horário" }, { key: "status", label: "Status", align: "right" }], rows: [{ aula: "Spinning", instrutor: "Ana Luísa", horario: "Hoje, 18:30", status: "Inscrito" }, { aula: "Funcional", instrutor: "Ricardo", horario: "Amanhã, 07:00", status: "Inscrito" }, { aula: "Yoga", instrutor: "Mariana", horario: "Qua, 08:00", status: "Vagas" }, { aula: "HIIT", instrutor: "Carlos", horario: "Qui, 19:00", status: "Vagas" }, { aula: "Zumba", instrutor: "Juliana", horario: "Sex, 18:00", status: "Inscrito" }], actionLabel: "Ver todas" } }
    ]
  },
  workouts: {
    key: "workouts",
    label: "Treinos",
    subtitle: "Acompanhe o desempenho dos treinos e a evolução dos seus alunos.",
    kpis: [
      { title: "Treinos realizados", value: "1.540", change: "+18% vs período anterior", icon: "dumbbell", tone: "purple" },
      { title: "Participantes únicos", value: "1.070", change: "+14% vs período anterior", icon: "user", tone: "yellow" },
      { title: "Calorias totais", value: "125.430 kcal", change: "+16% vs período anterior", icon: "flame", tone: "orange" },
      { title: "Duração total", value: "1.248h 30m", change: "+12% vs período anterior", icon: "timer", tone: "blue" },
      { title: "Média por treino", value: "81,5%", change: "+6,2pp vs período anterior", icon: "trophy", tone: "yellow" }
    ],
    sections: [
      { type: "line", title: "Evolução de treinos realizados", control: "Diário", series: { labels: labels15, values: [380, 580, 700, 610, 820, 790, 850, 960], compare: [210, 340, 420, 350, 540, 510, 650, 700] } },
      { type: "bar", title: "Treinos por dia da semana", control: "Total", series: { labels: week, values: [170, 210, 250, 230, 260, 180, 80] } },
      { type: "donut", title: "Distribuição por grupo muscular", center: "1.540", items: [{ label: "Membros superiores", value: 29.9, color: donutColors[0] }, { label: "Membros inferiores", value: 28.4, color: "#84CC16" }, { label: "Core", value: 15.6, color: donutColors[2] }, { label: "Cardio", value: 13.2, color: "#6366F1" }, { label: "Outros", value: 12.9, color: donutColors[3] }] },
      { type: "table", title: "Top exercícios", table: { columns: [{ key: "exercicio", label: "Exercício" }, { key: "grupo", label: "Grupo muscular" }, { key: "execucoes", label: "Execuções", align: "right" }, { key: "uso", label: "% de uso", align: "right" }], rows: [{ exercicio: "Supino reto", grupo: "Peito", execucoes: "2.450", uso: "15,9%" }, { exercicio: "Agachamento livre", grupo: "Pernas", execucoes: "2.210", uso: "14,3%" }, { exercicio: "Puxada frontal", grupo: "Costas", execucoes: "1.980", uso: "12,8%" }, { exercicio: "Desenvolvimento", grupo: "Ombros", execucoes: "1.560", uso: "10,1%" }, { exercicio: "Rosca direta", grupo: "Bíceps", execucoes: "1.320", uso: "8,6%" }], actionLabel: "Ver todos" } },
      { type: "donut", title: "Adesão aos treinos", center: "72,4%", items: [{ label: "Alunos ativos", value: 52, detail: "1.070", color: donutColors[0] }, { label: "Alunos com treino", value: 36, detail: "748", color: donutColors[4] }, { label: "Alunos sem treino", value: 12, detail: "322", color: donutColors[2] }] },
      { type: "table", title: "Últimos treinos registrados", table: { columns: [{ key: "aluno", label: "Aluno" }, { key: "treino", label: "Treino" }, { key: "data", label: "Data e hora" }, { key: "duracao", label: "Duração" }, { key: "calorias", label: "Calorias", align: "right" }], rows: [{ aluno: "Ana Luísa", treino: "Treino A - Superior", data: "15/05/2024 09:12", duracao: "01:05:30", calorias: "620 kcal" }, { aluno: "Carlos Mendes", treino: "Treino B - Inferior", data: "15/05/2024 08:45", duracao: "01:12:10", calorias: "780 kcal" }, { aluno: "Mariana Costa", treino: "Treino C - Full Body", data: "15/05/2024 08:21", duracao: "00:58:40", calorias: "540 kcal" }, { aluno: "Lucas Ferreira", treino: "Treino A - Superior", data: "15/05/2024 07:50", duracao: "01:08:15", calorias: "680 kcal" }, { aluno: "João Silva", treino: "Treino B - Inferior", data: "15/05/2024 07:32", duracao: "01:15:20", calorias: "810 kcal" }], actionLabel: "Ver todos" } }
    ]
  },
  sales: {
    key: "sales",
    label: "Vendas (POS)",
    subtitle: "Acompanhe o desempenho das vendas (POS) e suas principais métricas.",
    kpis: [
      { title: "Receita total POS", value: "337.000 Kz", change: "+22% vs período anterior", icon: "banknote", tone: "lime" },
      { title: "Transações", value: "1.248", change: "+18% vs período anterior", icon: "shopping-cart", tone: "yellow" },
      { title: "Ticket médio", value: "270 Kz", change: "+4% vs período anterior", icon: "wallet-cards", tone: "blue" },
      { title: "Itens vendidos", value: "2.156", change: "+16% vs período anterior", icon: "shopping-bag", tone: "purple" },
      { title: "Descontos concedidos", value: "18.450 Kz", change: "-8% vs período anterior", icon: "tag", tone: "red" },
      { title: "Clientes atendidos", value: "842", change: "+15% vs período anterior", icon: "users", tone: "green" }
    ],
    sections: [
      { type: "line", title: "Receita POS ao longo do tempo", span: "wide", control: "Diário", series: { labels: labels15, values: [32, 48, 44, 52, 66, 58, 72, 78], compare: [14, 30, 24, 34, 42, 36, 48, 56], unit: "K" } },
      { type: "donut", title: "Receita por categoria", center: "337.000 Kz", items: [{ label: "Suplementos", value: 39.2, color: donutColors[0] }, { label: "Bebidas", value: 22.1, color: "#A3E635" }, { label: "Acessórios", value: 15.8, color: donutColors[2] }, { label: "Vestuário", value: 12.4, color: donutColors[3] }, { label: "Outros", value: 10.5, color: donutColors[4] }] },
      { type: "donut", title: "Receita por forma de pagamento", center: "337.000 Kz", items: [{ label: "Dinheiro", value: 48.3, color: donutColors[0] }, { label: "Cartão", value: 32.1, color: "#84CC16" }, { label: "Transferência", value: 14.2, color: donutColors[2] }, { label: "Outros", value: 4.8, color: donutColors[3] }] },
      { type: "heatmap", title: "Receita por horário", control: "Por hora", rows: ["06h", "08h", "10h", "12h", "14h", "16h", "20h", "22h"], columns: week, lowLabel: "Baixa receita", highLabel: "Alta receita", values: [[18, 24, 32, 38, 35, 24, 18], [30, 42, 48, 52, 50, 38, 26], [42, 55, 62, 68, 72, 56, 40], [56, 66, 74, 80, 84, 70, 52], [64, 78, 86, 94, 100, 82, 60], [58, 70, 82, 92, 96, 76, 58], [38, 50, 58, 64, 62, 54, 42], [24, 32, 38, 44, 40, 34, 28]] },
      { type: "table", title: "Produtos mais vendidos", table: { columns: [{ key: "produto", label: "Produto" }, { key: "categoria", label: "Categoria" }, { key: "itens", label: "Itens", align: "right" }, { key: "receita", label: "Receita", align: "right" }], rows: [{ produto: "Whey Protein 900g", categoria: "Suplementos", itens: "320", receita: "64.000 Kz" }, { produto: "Creatina 300g", categoria: "Suplementos", itens: "210", receita: "37.800 Kz" }, { produto: "Pré-Treino 300g", categoria: "Suplementos", itens: "180", receita: "32.400 Kz" }, { produto: "Garrafa Térmica", categoria: "Acessórios", itens: "150", receita: "24.000 Kz" }, { produto: "Camiseta Dry Fit", categoria: "Vestuário", itens: "120", receita: "18.600 Kz" }], actionLabel: "Ver todos os produtos" } },
      { type: "table", title: "Últimas transações", table: { columns: [{ key: "hora", label: "Hora" }, { key: "produto", label: "Produto" }, { key: "cliente", label: "Cliente" }, { key: "pagamento", label: "Forma de pagamento" }, { key: "valor", label: "Valor", align: "right" }], rows: [{ hora: "Hoje, 10:34", produto: "Whey Protein 900g", cliente: "Ana Luísa", pagamento: "Cartão", valor: "58.000 Kz" }, { hora: "Hoje, 10:21", produto: "Creatina 300g", cliente: "Carlos Mendes", pagamento: "Dinheiro", valor: "18.000 Kz" }, { hora: "Hoje, 10:15", produto: "Garrafa Térmica", cliente: "Mariana Costa", pagamento: "Transferência", valor: "12.000 Kz" }, { hora: "Hoje, 09:57", produto: "Pré-Treino 300g", cliente: "Lucas Ferreira", pagamento: "Cartão", valor: "16.000 Kz" }, { hora: "Hoje, 09:41", produto: "Camiseta Dry Fit", cliente: "João Silva", pagamento: "Dinheiro", valor: "12.000 Kz" }], actionLabel: "Ver todas" } }
    ]
  },
  products: {
    key: "products",
    label: "Produtos",
    subtitle: "Acompanhe o desempenho dos produtos e do estoque.",
    kpis: [
      { title: "Receita com produtos", value: "124.800 Kz", change: "+19% vs período anterior", icon: "package", tone: "lime" },
      { title: "Itens vendidos", value: "1.856", change: "+16% vs período anterior", icon: "shopping-bag", tone: "yellow" },
      { title: "Ticket médio", value: "67 Kz", change: "+3% vs período anterior", icon: "shopping-cart", tone: "blue" },
      { title: "Descontos concedidos", value: "5.840 Kz", change: "-7% vs período anterior", icon: "tag", tone: "purple" },
      { title: "Clientes que compraram", value: "624", change: "+14% vs período anterior", icon: "users", tone: "green" },
      { title: "Produtos cadastrados", value: "86", detail: "12 categorias", icon: "layers", tone: "orange" }
    ],
    sections: [
      { type: "line", title: "Receita com produtos ao longo do tempo", span: "wide", control: "Diário", series: { labels: labels15, values: [17, 24, 28, 24, 31, 28, 38, 37], compare: [8, 12, 16, 15, 19, 18, 22, 26], unit: "K" } },
      { type: "bar", title: "Itens vendidos por dia da semana", control: "Total", series: { labels: week, values: [240, 280, 310, 290, 360, 240, 136] } },
      { type: "donut", title: "Receita por categoria", center: "124.800 Kz", items: [{ label: "Suplementos", value: 38.5, color: donutColors[0] }, { label: "Bebidas", value: 21.7, color: "#84CC16" }, { label: "Acessórios", value: 16.2, color: donutColors[2] }, { label: "Vestuário", value: 12.3, color: donutColors[3] }, { label: "Outros", value: 11.3, color: donutColors[4] }] },
      { type: "table", title: "Produtos mais vendidos", table: { columns: [{ key: "produto", label: "Produto" }, { key: "categoria", label: "Categoria" }, { key: "itens", label: "Itens vendidos", align: "right" }, { key: "receita", label: "Receita", align: "right" }], rows: [{ produto: "Whey Protein 900g", categoria: "Suplementos", itens: "320", receita: "64.000 Kz" }, { produto: "Creatina 300g", categoria: "Suplementos", itens: "210", receita: "37.800 Kz" }, { produto: "Pré-Treino 300g", categoria: "Suplementos", itens: "180", receita: "32.400 Kz" }, { produto: "Garrafa Térmica", categoria: "Acessórios", itens: "150", receita: "24.000 Kz" }, { produto: "Camiseta Dry Fit", categoria: "Vestuário", itens: "120", receita: "18.600 Kz" }], actionLabel: "Ver todos os produtos" } },
      { type: "donut", title: "Estoque por situação", center: "86", items: [{ label: "Em estoque", value: 67.4, detail: "58", color: donutColors[0] }, { label: "Estoque baixo", value: 20.9, detail: "18", color: donutColors[1] }, { label: "Sem estoque", value: 11.6, detail: "10", color: "#EF4444" }] },
      { type: "table", title: "Estoque baixo", table: { columns: [{ key: "produto", label: "Produto" }, { key: "atual", label: "Estoque atual", align: "right" }, { key: "minimo", label: "Estoque mínimo", align: "right" }, { key: "status", label: "Status", align: "right" }], rows: [{ produto: "Pré-Treino 300g", atual: "5 un.", minimo: "15 un.", status: "Crítico" }, { produto: "Creatina 300g", atual: "7 un.", minimo: "20 un.", status: "Baixo" }, { produto: "BCAA 2400 120 caps", atual: "8 un.", minimo: "20 un.", status: "Baixo" }, { produto: "Whey Protein 900g", atual: "9 un.", minimo: "25 un.", status: "Baixo" }, { produto: "Garrafa Térmica", atual: "10 un.", minimo: "20 un.", status: "Baixo" }], actionLabel: "Ver todos" } }
    ]
  },
  employees: {
    key: "employees",
    label: "Funcionários",
    subtitle: "Acompanhe o desempenho da sua equipe e a produtividade dos funcionários.",
    kpis: [
      { title: "Funcionários ativos", value: "28", change: "+8% vs período anterior", icon: "users", tone: "purple" },
      { title: "Presenças", value: "412", change: "+11% vs período anterior", icon: "user-check", tone: "lime" },
      { title: "Faltas", value: "18", change: "-14% vs período anterior", icon: "calendar-x", tone: "orange" },
      { title: "Horas trabalhadas", value: "1.248h 30m", change: "+10% vs período anterior", icon: "clock", tone: "blue" },
      { title: "Avaliação média", value: "4,6 / 5", change: "+5% vs período anterior", icon: "star", tone: "yellow" },
      { title: "Treinamentos concluídos", value: "32", change: "+18% vs período anterior", icon: "presentation", tone: "green" }
    ],
    sections: [
      { type: "line", title: "Horas trabalhadas ao longo do tempo", span: "wide", control: "Diário", series: { labels: labels15, values: [70, 104, 126, 106, 140, 134, 160, 180], compare: [30, 54, 60, 50, 80, 72, 112, 126], unit: "h" } },
      { type: "donut", title: "Distribuição por função", center: "28", items: [{ label: "Instrutores", value: 42.9, detail: "12", color: donutColors[0] }, { label: "Recepcionistas", value: 21.4, detail: "6", color: donutColors[1] }, { label: "Gerentes", value: 14.3, detail: "4", color: donutColors[2] }, { label: "Administrativo", value: 10.7, detail: "3", color: donutColors[3] }, { label: "Outros", value: 10.7, detail: "3", color: donutColors[4] }] },
      { type: "horizontal", title: "Horas trabalhadas por departamento", control: "Total", labels: ["Sala de Musculação", "Aulas Coletivas", "Recepção", "Administrativo", "Vendas (POS)"], values: [520, 320, 210, 130, 68], suffix: "h" },
      { type: "table", title: "Desempenho da equipe", table: { columns: [{ key: "funcionario", label: "Funcionário" }, { key: "funcao", label: "Função" }, { key: "checkins", label: "Check-ins", align: "right" }, { key: "avaliacao", label: "Avaliação média", align: "right" }, { key: "metas", label: "Metas atingidas", align: "right" }, { key: "status", label: "Status", align: "right" }], rows: [{ funcionario: "Ana Luísa", funcao: "Instrutora", checkins: "248", avaliacao: "4,8", metas: "120%", status: "Excelente" }, { funcionario: "Carlos Mendes", funcao: "Instrutor", checkins: "214", avaliacao: "4,6", metas: "110%", status: "Excelente" }, { funcionario: "Mariana Costa", funcao: "Recepcionista", checkins: "196", avaliacao: "4,5", metas: "105%", status: "Muito bom" }, { funcionario: "Lucas Ferreira", funcao: "Instrutor", checkins: "184", avaliacao: "4,3", metas: "98%", status: "Muito bom" }, { funcionario: "João Silva", funcao: "Gerente", checkins: "172", avaliacao: "4,2", metas: "95%", status: "Bom" }], actionLabel: "Ver todos os funcionários" } },
      { type: "bar", title: "Presenças por dia da semana", control: "Total", series: { labels: week, values: [82, 78, 85, 88, 79, 54, 46] } },
      { type: "table", title: "Treinamentos e certificações", table: { columns: [{ key: "treinamento", label: "Treinamento" }, { key: "concluidos", label: "Concluídos", align: "right" }, { key: "andamento", label: "Em andamento", align: "right" }, { key: "naoIniciado", label: "Não iniciado", align: "right" }], rows: [{ treinamento: "Atendimento ao cliente", concluidos: "18", andamento: "4", naoIniciado: "6" }, { treinamento: "Primeiros socorros", concluidos: "16", andamento: "6", naoIniciado: "6" }, { treinamento: "Treinamento funcional", concluidos: "12", andamento: "8", naoIniciado: "8" }, { treinamento: "Vendas e negociação", concluidos: "10", andamento: "6", naoIniciado: "12" }, { treinamento: "LGPD - Proteção de dados", concluidos: "8", andamento: "4", naoIniciado: "16" }], actionLabel: "Ver todos os treinamentos" } }
    ]
  }
};
