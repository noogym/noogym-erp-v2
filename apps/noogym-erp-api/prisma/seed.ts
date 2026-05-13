import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Noogym@123', 10);

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

  const gym = await prisma.gym.upsert({
    where: { id: 'demo-gym-main' },
    update: {},
    create: {
      id: 'demo-gym-main',
      organizationId: organization.id,
      name: 'Noogym Central',
      slug: 'central',
      city: 'Luanda',
      province: 'Luanda',
      address: 'Rua Demo, Luanda',
    },
  });

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

  const members = await Promise.all(
    [
      { name: 'Ana Costa', email: 'ana.costa@example.com', phone: '+244 923 111 111' },
      { name: 'Bruno Manuel', email: 'bruno.manuel@example.com', phone: '+244 923 222 222' },
      { name: 'Carla João', email: 'carla.joao@example.com', phone: '+244 923 333 333' },
    ].map((member) =>
      prisma.member.create({
        data: {
          ...member,
          organizationId: organization.id,
          gymId: gym.id,
        },
      }),
    ),
  );

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
      endDate: new Date(Date.now() + monthlyPlan.durationDays * 24 * 60 * 60 * 1000),
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
