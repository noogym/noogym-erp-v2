import {
  GymClassStatus,
  PaymentMethod,
  PrismaClient,
  SaleStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Noogym@123', 10);

  const platformOrganization = await prisma.organization.upsert({
    where: { slug: 'noogym-platform' },
    update: {},
    create: {
      name: 'Noogym Platform',
      slug: 'noogym-platform',
      email: 'suporte@noogym.com',
      phone: '+244 900 000 001',
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@noogym.com' },
    update: {
      organizationId: platformOrganization.id,
      name: 'Super Admin Noogym',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
    create: {
      organizationId: platformOrganization.id,
      name: 'Super Admin Noogym',
      email: 'super@noogym.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: 'noogym-demo' },
    update: {},
    create: {
      name: 'Noogym Demo',
      slug: 'noogym-demo',
      email: 'demo@noogym.com',
      phone: '+244 900 000 000',
    },
  });

  const testGyms = [
    {
      id: 'demo-gym-main',
      name: 'Noogym Central',
      slug: 'central',
      city: 'Luanda',
      province: 'Luanda',
      address: 'Rua Demo, Luanda',
      phone: '+244 923 000 100',
      email: 'central@noogym.com',
    },
    {
      id: 'demo-gym-talatona',
      name: 'Noogym Talatona',
      slug: 'talatona',
      city: 'Talatona',
      province: 'Luanda',
      address: 'Avenida Samora Machel, Talatona',
      phone: '+244 923 000 200',
      email: 'talatona@noogym.com',
    },
    {
      id: 'demo-gym-benfica',
      name: 'Noogym Benfica',
      slug: 'benfica',
      city: 'Benfica',
      province: 'Luanda',
      address: 'Estrada de Benfica, Luanda',
      phone: '+244 923 000 300',
      email: 'benfica@noogym.com',
    },
  ];

  const gyms = await Promise.all(
    testGyms.map((item) =>
      prisma.gym.upsert({
        where: { id: item.id },
        update: {
          organizationId: organization.id,
          name: item.name,
          slug: item.slug,
          city: item.city,
          province: item.province,
          address: item.address,
          phone: item.phone,
          email: item.email,
          country: 'Angola',
          isActive: true,
        },
        create: {
          ...item,
          organizationId: organization.id,
          country: 'Angola',
          isActive: true,
        },
      }),
    ),
  );
  const [gym, talatonaGym, benficaGym] = gyms;

  const admin = await prisma.user.upsert({
    where: { email: 'admin@noogym.com' },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Admin Noogym',
      email: 'admin@noogym.com',
      passwordHash,
      role: UserRole.ADMIN,
      gyms: {
        create: { gymId: gym.id },
      },
    },
  });

  for (const unit of gyms) {
    await prisma.userGym.upsert({
      where: { userId_gymId: { userId: admin.id, gymId: unit.id } },
      update: {},
      create: { userId: admin.id, gymId: unit.id },
    });
  }

  const testUsers = [
    {
      name: 'Administrador Teste',
      email: 'admin.teste@noogym.com',
      role: UserRole.ADMIN,
      employeeRole: 'Administrador',
      department: 'Administrativo',
      phone: '+244 923 100 001',
      salary: 650000,
      gymIds: gyms.map((unit) => unit.id),
    },
    {
      name: 'Gerente Teste',
      email: 'gerente.teste@noogym.com',
      role: UserRole.MANAGER,
      employeeRole: 'Gerente',
      department: 'Gestao',
      phone: '+244 923 100 002',
      salary: 520000,
      gymIds: gyms.map((unit) => unit.id),
    },
    {
      name: 'Recepcionista Teste',
      email: 'recepcao.teste@noogym.com',
      role: UserRole.RECEPTIONIST,
      employeeRole: 'Recepcionista',
      department: 'Atendimento',
      phone: '+244 923 100 003',
      salary: 220000,
      gymIds: [gym.id],
    },
    {
      name: 'Personal Trainer Teste',
      email: 'personal.teste@noogym.com',
      role: UserRole.TRAINER,
      employeeRole: 'Personal Trainer',
      department: 'Tecnico',
      phone: '+244 923 100 004',
      salary: 350000,
      gymIds: [gym.id, talatonaGym.id],
    },
    {
      name: 'Instrutor de Aulas Teste',
      email: 'instrutor.aulas.teste@noogym.com',
      role: UserRole.TRAINER,
      employeeRole: 'Instrutor de Aulas',
      department: 'Aulas',
      phone: '+244 923 100 005',
      salary: 300000,
      gymIds: [talatonaGym.id, benficaGym.id],
    },
  ];

  for (const testUser of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      update: {
        organizationId: organization.id,
        name: testUser.name,
        phone: testUser.phone,
        passwordHash,
        role: testUser.role,
      },
      create: {
        organizationId: organization.id,
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        passwordHash,
        role: testUser.role,
      },
    });

    for (const gymId of testUser.gymIds) {
      await prisma.userGym.upsert({
        where: { userId_gymId: { userId: user.id, gymId } },
        update: {},
        create: { userId: user.id, gymId },
      });
    }

    await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        organizationId: organization.id,
        gymId: testUser.gymIds[0],
        name: testUser.name,
        role: testUser.employeeRole,
        department: testUser.department,
        email: testUser.email,
        phone: testUser.phone,
        salary: testUser.salary,
      },
      create: {
        organizationId: organization.id,
        gymId: testUser.gymIds[0],
        userId: user.id,
        name: testUser.name,
        role: testUser.employeeRole,
        department: testUser.department,
        email: testUser.email,
        phone: testUser.phone,
        salary: testUser.salary,
        hireDate: new Date(),
      },
    });
  }

  const receptionEmployee = await prisma.employee.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      organizationId: organization.id,
      gymId: gym.id,
      userId: admin.id,
      name: 'Admin Noogym',
      role: 'Gerente',
      department: 'Administrativo',
      email: admin.email,
      phone: '+244 900 000 000',
      salary: 650000,
      hireDate: new Date(),
    },
  });

  const room = await prisma.room.create({
    data: {
      gymId: gym.id,
      name: 'Sala 1',
      capacity: 25,
    },
  });

  const monthlyPlan = await prisma.plan.create({
    data: {
      organizationId: organization.id,
      name: 'Mensal',
      description: 'Acesso livre por 30 dias',
      price: 15000,
      durationDays: 30,
      includesClasses: true,
      includesWorkouts: true,
      isPopular: true,
    },
  });

  await prisma.plan.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Trimestral',
        description: 'Acesso livre por 90 dias',
        price: 40000,
        durationDays: 90,
        includesClasses: true,
        includesWorkouts: true,
      },
      {
        organizationId: organization.id,
        name: 'Personal',
        description: 'Plano com acompanhamento personalizado',
        price: 75000,
        durationDays: 30,
        includesClasses: true,
        includesWorkouts: true,
      },
    ],
  });

  const demoIdentity = await prisma.noogymIdentity.upsert({
    where: { noogymId: 'NG-DEMO-001' },
    update: {
      name: 'Ana Costa',
      email: 'ana.costa@example.com',
      phone: '+244 923 111 111',
      qrToken: 'qr-demo-ana-costa',
      qrTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      noogymId: 'NG-DEMO-001',
      name: 'Ana Costa',
      email: 'ana.costa@example.com',
      phone: '+244 923 111 111',
      qrToken: 'qr-demo-ana-costa',
      qrTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await Promise.all(
    [
      {
        type: 'NOOGYM_ID' as const,
        value: 'NG-DEMO-001',
        label: 'Noogym ID principal',
      },
      {
        type: 'QR_TOKEN' as const,
        value: 'qr-demo-ana-costa',
        label: 'QR do app',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        type: 'BARCODE' as const,
        value: '930000000001',
        label: 'Codigo de barras do cartao',
      },
      {
        type: 'CARD' as const,
        value: 'CARD-ANA-001',
        label: 'Cartao fisico recepcao',
      },
    ].map((alias) =>
      prisma.noogymIdentityAlias.upsert({
        where: {
          type_value: {
            type: alias.type,
            value: alias.value,
          },
        },
        update: {
          identityId: demoIdentity.id,
          label: alias.label,
          isActive: true,
          expiresAt: alias.expiresAt,
        },
        create: {
          identityId: demoIdentity.id,
          type: alias.type,
          value: alias.value,
          label: alias.label,
          expiresAt: alias.expiresAt,
        },
      }),
    ),
  );

  const members = await Promise.all(
    [
      {
        name: 'Ana Costa',
        email: 'ana.costa@example.com',
        phone: '+244 923 111 111',
        noogymIdentityId: demoIdentity.id,
      },
      {
        name: 'Bruno Manuel',
        email: 'bruno.manuel@example.com',
        phone: '+244 923 222 222',
      },
      {
        name: 'Carla João',
        email: 'carla.joao@example.com',
        phone: '+244 923 333 333',
      },
    ].map((member) =>
      prisma.member.upsert({
        where: {
          organizationId_email: {
            organizationId: organization.id,
            email: member.email,
          },
        },
        update: {
          ...member,
          gymId: gym.id,
          accessCode:
            member.email === 'ana.costa@example.com'
              ? '930000000001'
              : undefined,
        },
        create: {
          ...member,
          organizationId: organization.id,
          gymId: gym.id,
          accessCode:
            member.email === 'ana.costa@example.com'
              ? '930000000001'
              : undefined,
        },
      }),
    ),
  );

  const products = await Promise.all(
    [
      {
        name: 'Whey Protein 900g',
        category: 'Suplementos',
        sku: 'PRD-WHEY-900',
        barcode: '7891234567890',
        price: 12500,
        cost: 7500,
        stock: 24,
        minStock: 8,
        label: 'WHEY',
      },
      {
        name: 'Shaker Noogym',
        category: 'Acessorios',
        sku: 'PRD-SHAKER',
        barcode: '7891234567891',
        price: 3500,
        cost: 1800,
        stock: 32,
        minStock: 10,
        label: 'SHA',
      },
      {
        name: 'Agua 500ml',
        category: 'Bebidas',
        sku: 'PRD-AGUA-500',
        barcode: '7891234567892',
        price: 500,
        cost: 180,
        stock: 60,
        minStock: 20,
        label: 'H2O',
      },
    ].map((product) =>
      prisma.product.upsert({
        where: {
          organizationId_sku: {
            organizationId: organization.id,
            sku: product.sku,
          },
        },
        update: {},
        create: {
          ...product,
          organizationId: organization.id,
          gymId: gym.id,
        },
      }),
    ),
  );

  await prisma.gymClass.create({
    data: {
      organizationId: organization.id,
      gymId: gym.id,
      roomId: room.id,
      instructorId: receptionEmployee.id,
      name: 'Spinning',
      category: 'Cardio',
      description: 'Aula coletiva de cardio para todos os niveis',
      equipment: 'Bike spinning, toalha e garrafa de agua',
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      durationMinutes: 60,
      capacity: 20,
      status: GymClassStatus.SCHEDULED,
      enrollments: {
        create: {
          memberId: members[0].id,
        },
      },
    },
  });

  await prisma.sale.create({
    data: {
      organizationId: organization.id,
      gymId: gym.id,
      memberId: members[0].id,
      sellerId: admin.id,
      customerName: members[0].name,
      sellerName: admin.name,
      status: SaleStatus.COMPLETED,
      subtotal: 16000,
      total: 16000,
      paymentMethod: PaymentMethod.CASH,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            sku: products[0].sku,
            quantity: 1,
            unitPrice: products[0].price,
            unitCost: products[0].cost,
            total: products[0].price,
          },
          {
            productId: products[1].id,
            productName: products[1].name,
            sku: products[1].sku,
            quantity: 1,
            unitPrice: products[1].price,
            unitCost: products[1].cost,
            total: products[1].price,
          },
        ],
      },
      payments: {
        create: {
          organizationId: organization.id,
          memberId: members[0].id,
          amount: 16000,
          method: PaymentMethod.CASH,
          status: 'PAID',
          paidAt: new Date(),
        },
      },
    },
  });

  const muscleGroup = await prisma.muscleGroup.upsert({
    where: { name: 'Corpo inteiro' },
    update: {},
    create: { name: 'Corpo inteiro' },
  });

  const exercises = await Promise.all(
    ['Agachamento', 'Supino', 'Remada', 'Prancha'].map((name) =>
      prisma.exercise.create({
        data: {
          organizationId: organization.id,
          muscleGroupId: muscleGroup.id,
          name,
          equipment: name === 'Prancha' ? 'Peso corporal' : 'Ginásio',
        },
      }),
    ),
  );

  const workout = await prisma.workout.create({
    data: {
      organizationId: organization.id,
      createdById: admin.id,
      name: 'Full Body Inicial',
      goal: 'Condicionamento geral',
      level: 'BEGINNER',
      status: 'ACTIVE',
      durationMinutes: 45,
      exercises: {
        create: exercises.map((exercise, index) => ({
          exerciseId: exercise.id,
          order: index + 1,
          sets: 3,
          reps: exercise.name === 'Prancha' ? '30s' : '12',
          restSeconds: 60,
        })),
      },
      assignments: {
        create: {
          memberId: members[0].id,
        },
      },
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      memberId: members[0].id,
      planId: monthlyPlan.id,
      startDate: new Date(),
      endDate: new Date(
        Date.now() + monthlyPlan.durationDays * 24 * 60 * 60 * 1000,
      ),
      payments: {
        create: {
          organizationId: organization.id,
          memberId: members[0].id,
          amount: monthlyPlan.price,
          method: 'CASH',
          status: 'PAID',
          paidAt: new Date(),
        },
      },
    },
  });

  console.log({
    superAdmin: superAdmin.email,
    organization: organization.slug,
    gym: gym.slug,
    admin: admin.email,
    password: 'Noogym@123',
    workout: workout.name,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
