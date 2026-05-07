export const money = (value: number) => `${value.toLocaleString("pt-AO")} Kz`;

export const clients = [
  { id: "CLI-001", name: "Ana Luísa Santos", phone: "+244 923 456 789", email: "ana.santos@email.com", plan: "Premium Mensal", planTone: "gray", status: "Ativo", lastCheckin: "Hoje, 09:41", expires: "12/06/2024", birthday: "15 Mai", avatar: "AL" },
  { id: "CLI-002", name: "Carlos Mendes", phone: "+244 923 111 222", email: "carlos.mendes@email.com", plan: "Musculação", planTone: "lime", status: "Ativo", lastCheckin: "Hoje, 08:15", expires: "10/06/2024", birthday: "18 Mai", avatar: "CM" },
  { id: "CLI-003", name: "Mariana Costa", phone: "+244 923 333 444", email: "mariana.costa@email.com", plan: "Premium Mensal", planTone: "gray", status: "Ativo", lastCheckin: "Ontem, 18:30", expires: "08/06/2024", birthday: "22 Mai", avatar: "MC" },
  { id: "CLI-004", name: "João Paulo", phone: "+244 923 555 666", email: "joao.paulo@email.com", plan: "Musculação", planTone: "lime", status: "Ativo", lastCheckin: "Ontem, 17:45", expires: "08/06/2024", birthday: "25 Mai", avatar: "JP" },
  { id: "CLI-005", name: "Lucas Ferreira", phone: "+244 923 777 888", email: "lucas.ferreira@email.com", plan: "Funcional", planTone: "orange", status: "Ativo", lastCheckin: "Ontem, 16:20", expires: "07/06/2024", birthday: "28 Mai", avatar: "LF" },
  { id: "CLI-006", name: "Beatriz Oliveira", phone: "+244 923 999 000", email: "beatriz.oliveira@email.com", plan: "Musculação", planTone: "lime", status: "Ativo", lastCheckin: "Ontem, 15:10", expires: "07/06/2024", birthday: "30 Mai", avatar: "BO" },
  { id: "CLI-007", name: "Rafael Almeida", phone: "+244 923 121 314", email: "rafael.almeida@email.com", plan: "Premium Trimestral", planTone: "purple", status: "Ativo", lastCheckin: "13/05/2024", expires: "13/08/2024", birthday: "04 Jun", avatar: "RA" },
  { id: "CLI-008", name: "Fernanda Lima", phone: "+244 923 151 617", email: "fernanda.lima@email.com", plan: "Yoga", planTone: "purple", status: "Ativo", lastCheckin: "13/05/2024", expires: "13/08/2024", birthday: "08 Jun", avatar: "FL" }
] as const;

export const plans = [
  { name: "Plano Basic", description: "Acesso à musculação", category: "Musculação", price: "4.500 Kz/mês", duration: "Mensal", type: "Recorrente", clients: 320 },
  { name: "Plano Premium", description: "Musculação + Aulas coletivas", category: "Premium", price: "6.500 Kz/mês", duration: "Mensal", type: "Recorrente", clients: 420 },
  { name: "Plano VIP", description: "Tudo do Premium + Personal trainer", category: "Personal", price: "9.000 Kz/mês", duration: "Mensal", type: "Recorrente", clients: 180 },
  { name: "Plano Trimestral", description: "Acesso completo", category: "Geral", price: "60.000 Kz/3 meses", duration: "Trimestral", type: "Recorrente", clients: 75 },
  { name: "Plano Anual", description: "Acesso completo", category: "Geral", price: "200.000 Kz/ano", duration: "Anual", type: "Recorrente", clients: 40 },
  { name: "Day Pass", description: "Acesso por 1 dia", category: "Avulso", price: "2.000 Kz/dia", duration: "1 dia", type: "Avulso", clients: 0 },
  { name: "Aula Avulsa", description: "Aulas coletivas avulsas", category: "Aulas", price: "3.000 Kz/aula", duration: "-", type: "Avulso", clients: 0 }
];

export const products = [
  { id: "PRD-0001", name: "Whey Protein 900g", category: "Suplementos", stock: 24, price: 12500, cost: 7500, emoji: "WHEY" },
  { id: "PRD-0002", name: "Creatina 300g", category: "Suplementos", stock: 18, price: 7500, cost: 4200, emoji: "CRE" },
  { id: "PRD-0003", name: "Shaker Noogym", category: "Acessórios", stock: 32, price: 3500, cost: 1800, emoji: "SHA" },
  { id: "PRD-0004", name: "Camiseta Noogym (M)", category: "Vestuário", stock: 15, price: 8500, cost: 5000, emoji: "TEE" },
  { id: "PRD-0005", name: "Água 500ml", category: "Bebidas", stock: 60, price: 500, cost: 180, emoji: "H2O" },
  { id: "PRD-0006", name: "Protein Bar (Unid.)", category: "Alimentação", stock: 45, price: 1800, cost: 900, emoji: "BAR" },
  { id: "PRD-0007", name: "Pré-Treino 300g", category: "Suplementos", stock: 16, price: 9500, cost: 5500, emoji: "PRE" },
  { id: "PRD-0008", name: "Toalha Noogym", category: "Acessórios", stock: 20, price: 2500, cost: 1200, emoji: "TWL" },
  { id: "PRD-0009", name: "Munhequeira", category: "Acessórios", stock: 25, price: 2000, cost: 900, emoji: "WR" },
  { id: "PRD-0010", name: "Corda de Pular", category: "Acessórios", stock: 22, price: 2500, cost: 1100, emoji: "JMP" },
  { id: "PRD-0011", name: "Multivitamínico", category: "Suplementos", stock: 20, price: 6000, cost: 3500, emoji: "VIT" },
  { id: "PRD-0012", name: "Amêndoas 100g", category: "Alimentação", stock: 30, price: 1500, cost: 800, emoji: "NUT" },
  { id: "PRD-0013", name: "Banana (Unid.)", category: "Alimentação", stock: 100, price: 300, cost: 120, emoji: "BAN" },
  { id: "PRD-0014", name: "Energético 250ml", category: "Bebidas", stock: 40, price: 1000, cost: 520, emoji: "NRG" },
  { id: "PRD-0015", name: "Calção Noogym", category: "Vestuário", stock: 12, price: 6500, cost: 3500, emoji: "SHR" }
];

export const classes = [
  { name: "Spinning", room: "Sala 1", category: "Cardio", instructor: "Lucas Ferreira", time: "Hoje, 07:00", duration: "60 min", seats: 20, participants: 18, status: "Em andamento" },
  { name: "Musculação Funcional", room: "Sala 2", category: "Funcional", instructor: "João Paulo", time: "Hoje, 08:00", duration: "60 min", seats: 20, participants: 15, status: "Em andamento" },
  { name: "Yoga", room: "Sala 3", category: "Corpo e Mente", instructor: "Fernanda Lima", time: "Hoje, 09:00", duration: "60 min", seats: 15, participants: 12, status: "Em andamento" },
  { name: "HIIT", room: "Sala 1", category: "HIIT", instructor: "Rafael Almeida", time: "Hoje, 10:00", duration: "45 min", seats: 20, participants: 0, status: "Agendada" },
  { name: "Zumba", room: "Sala 2", category: "Dança", instructor: "Mariana Costa", time: "Hoje, 18:00", duration: "60 min", seats: 30, participants: 22, status: "Agendada" },
  { name: "Abdómen Definido", room: "Sala 3", category: "Musculação", instructor: "Carlos Mendes", time: "Amanhã, 07:00", duration: "45 min", seats: 20, participants: 8, status: "Agendada" },
  { name: "Pilates", room: "Sala 2", category: "Corpo e Mente", instructor: "Beatriz Oliveira", time: "Amanhã, 08:00", duration: "60 min", seats: 15, participants: 10, status: "Agendada" },
  { name: "Step", room: "Sala 1", category: "Cardio", instructor: "Lucas Ferreira", time: "Amanhã, 09:00", duration: "45 min", seats: 20, participants: 5, status: "Agendada" }
];

export const workouts = [
  { name: "Hipertrofia - Iniciante A", client: "Ana Luísa Santos", goal: "Hipertrofia", author: "Lucas Ferreira", updated: "Hoje, 09:15", status: "Ativo", exercises: 5 },
  { name: "Emagrecimento - Intermediário", client: "Carlos Mendes", goal: "Emagrecimento", author: "João Paulo", updated: "Ontem, 18:30", status: "Ativo", exercises: 6 },
  { name: "Força - Avançado", client: "Mariana Costa", goal: "Força", author: "Rafael Almeida", updated: "13/05/2024", status: "Ativo", exercises: 7 },
  { name: "Condicionamento geral", client: "Lucas Ferreira", goal: "Condicionamento", author: "Lucas Ferreira", updated: "12/05/2024", status: "Ativo", exercises: 8 },
  { name: "Definição muscular", client: "Beatriz Oliveira", goal: "Definição", author: "João Paulo", updated: "10/05/2024", status: "Ativo", exercises: 6 },
  { name: "Treino funcional - Full body", client: "João Paulo", goal: "Condicionamento", author: "Fernando Lima", updated: "09/05/2024", status: "Inativo", exercises: 9 },
  { name: "Reabilitação - Ombro", client: "Fernanda Lima", goal: "Reabilitação", author: "Lucas Ferreira", updated: "08/05/2024", status: "Rascunho", exercises: 4 }
];

export const employees = [
  { id: "FUNC-001", name: "Lucas Ferreira", role: "Personal Trainer", email: "lucas.ferreira@noogym.com", phone: "+244 923 777 888", status: "Ativo", salary: "450.000 Kz" },
  { id: "FUNC-002", name: "Ana Luísa Santos", role: "Recepcionista", email: "ana.santos@noogym.com", phone: "+244 923 111 222", status: "Ativo", salary: "280.000 Kz" },
  { id: "FUNC-003", name: "Carlos Mendes", role: "Personal Trainer", email: "carlos.mendes@noogym.com", phone: "+244 923 333 444", status: "Ativo", salary: "430.000 Kz" },
  { id: "FUNC-004", name: "Mariana Costa", role: "Instrutor de Aulas", email: "mariana.costa@noogym.com", phone: "+244 923 555 666", status: "Ativo", salary: "360.000 Kz" },
  { id: "FUNC-005", name: "João Paulo", role: "Gerente", email: "joao.paulo@noogym.com", phone: "+244 923 777 999", status: "Ativo", salary: "650.000 Kz" },
  { id: "FUNC-006", name: "Fernanda Lima", role: "Recepcionista", email: "fernanda.lima@noogym.com", phone: "+244 923 888 000", status: "Inativo", salary: "280.000 Kz" },
  { id: "FUNC-007", name: "Rafael Almeida", role: "Personal Trainer", email: "rafael.almeida@noogym.com", phone: "+244 923 222 111", status: "Ativo", salary: "420.000 Kz" },
  { id: "FUNC-008", name: "Beatriz Oliveira", role: "Instrutor de Aulas", email: "beatriz.oliveira@noogym.com", phone: "+244 923 444 555", status: "Ativo", salary: "340.000 Kz" }
];

export const recentActivities = [
  { title: "Check-in realizado", subject: "Ana Luísa Santos", time: "Hoje, 10:23", amount: "" },
  { title: "Nova venda", subject: "Plano Premium Mensal", time: "Hoje, 09:58", amount: "35.000 Kz" },
  { title: "Check-in realizado", subject: "Carlos Mendes", time: "Hoje, 09:41", amount: "" },
  { title: "Venda de produto", subject: "Whey Protein (900g)", time: "Hoje, 09:15", amount: "12.500 Kz" },
  { title: "Novo cliente cadastrado", subject: "João Paulo", time: "Hoje, 08:50", amount: "" }
];

export const chart7 = [128, 132, 218, 172, 240, 186, 365];
export const chart15 = [14, 20, 24, 28, 42, 36, 40, 37, 45, 49, 44, 50, 52, 52, 61];
