import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const defaultEmail = 'noogym.startup@gmail.com';
const defaultName = 'Noogym Startup';
const platformSlug = 'noogym-platform';

async function main() {
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL) ?? defaultEmail;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || defaultName;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const shouldRotatePassword =
    process.env.SUPER_ADMIN_ROTATE_PASSWORD === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  if (!email.includes('@')) {
    throw new Error('SUPER_ADMIN_EMAIL must be a valid email address.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!existingUser?.passwordHash && !password) {
    throw new Error(
      isProduction
        ? 'SUPER_ADMIN_PASSWORD is required to create the production super admin.'
        : 'SUPER_ADMIN_PASSWORD is required because this super admin does not exist yet.',
    );
  }

  const platformOrganization = await prisma.organization.upsert({
    where: { slug: platformSlug },
    update: {
      name: 'Noogym Platform',
      email: 'suporte@noogym.com',
    },
    create: {
      name: 'Noogym Platform',
      slug: platformSlug,
      email: 'suporte@noogym.com',
      phone: '+244 900 000 001',
    },
  });

  const passwordHash =
    password && (!existingUser || shouldRotatePassword)
      ? await bcrypt.hash(password, 10)
      : undefined;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      organizationId: platformOrganization.id,
      name,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      ...(passwordHash ? { passwordHash, refreshTokenHash: null } : {}),
    },
    create: {
      organizationId: platformOrganization.id,
      name,
      email,
      passwordHash: passwordHash as string,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: platformOrganization.id,
      userId: user.id,
      action: existingUser ? 'SUPER_ADMIN_BOOTSTRAP_UPDATED' : 'SUPER_ADMIN_BOOTSTRAP_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: {
        email,
        role: UserRole.SUPER_ADMIN,
        passwordChanged: Boolean(passwordHash),
        source: 'bootstrap-super-admin',
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        organization: platformOrganization.slug,
        passwordChanged: Boolean(passwordHash),
      },
      null,
      2,
    ),
  );
}

function normalizeEmail(value?: string) {
  const email = value?.trim().toLowerCase();
  return email || undefined;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
