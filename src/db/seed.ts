import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { hash } from 'bcrypt';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { users, auditEvents, emailSettings } from './schema';

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required for seeding.');
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('Seeding initial admin portal database data...');

  // Default password hash for seed accounts
  const superAdminPassword = await hash('SuperAdmin123!', 10);
  const adminPassword = await hash('AdminPass123!', 10);
  const userPassword = await hash('UserPassword123!', 10);

  const superAdminId = crypto.randomUUID();
  const adminId = crypto.randomUUID();

  // 1. Seed Superadmin and Admin accounts
  const seedUsers = [
    {
      id: superAdminId,
      name: 'Eleanor Vance',
      email: 'superadmin@example.com',
      role: 'superadmin',
      password: superAdminPassword,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: adminId,
      name: 'Marcus Holloway',
      email: 'admin@example.com',
      role: 'admin',
      password: adminPassword,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Sophia Chen',
      email: 'sophia.chen@example.com',
      role: 'user',
      password: userPassword,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'David Kim',
      email: 'david.kim@example.com',
      role: 'user',
      password: userPassword,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Amara Okafor',
      email: 'amara.okafor@example.com',
      role: 'user',
      password: userPassword,
      emailVerified: null,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Liam Gallagher',
      email: 'liam.gallagher@example.com',
      role: 'user',
      password: userPassword,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Clara Oswald',
      email: 'clara.oswald@example.com',
      role: 'user',
      password: userPassword,
      emailVerified: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Noah Bennett',
      email: 'noah.bennett@example.com',
      role: 'user',
      password: userPassword,
      emailVerified: new Date(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  ];

  for (const user of seedUsers) {
    await db.insert(users).values(user).onConflictDoNothing();
  }
  console.log(`Inserted ${seedUsers.length} seed users.`);

  // 2. Seed Sample Audit Events
  const seedAuditEvents: {
    id: string;
    actorUserId: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    outcome: string;
    metadata: Record<string, string | number | boolean | null> | null;
    createdAt: Date;
  }[] = [
    {
      id: crypto.randomUUID(),
      actorUserId: superAdminId,
      action: 'portal_setup',
      targetType: 'system',
      targetId: 'bootstrap',
      outcome: 'success',
      metadata: { initialized: true },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: crypto.randomUUID(),
      actorUserId: superAdminId,
      action: 'invitation_created',
      targetType: 'invitation',
      targetId: 'admin@example.com',
      outcome: 'success',
      metadata: { role: 'admin' },
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      id: crypto.randomUUID(),
      actorUserId: adminId,
      action: 'login_success',
      targetType: 'session',
      targetId: adminId,
      outcome: 'success',
      metadata: null,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      id: crypto.randomUUID(),
      actorUserId: adminId,
      action: 'user_created',
      targetType: 'user',
      targetId: 'sophia.chen@example.com',
      outcome: 'success',
      metadata: { role: 'user' },
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      id: crypto.randomUUID(),
      actorUserId: adminId,
      action: 'user_created',
      targetType: 'user',
      targetId: 'david.kim@example.com',
      outcome: 'success',
      metadata: { role: 'user' },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: crypto.randomUUID(),
      actorUserId: superAdminId,
      action: 'settings_updated',
      targetType: 'email_settings',
      targetId: 'email',
      outcome: 'success',
      metadata: { provider: 'console' },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const audit of seedAuditEvents) {
    await db.insert(auditEvents).values(audit).onConflictDoNothing();
  }
  console.log(`Inserted ${seedAuditEvents.length} seed audit events.`);


  // 3. Seed Email Settings Default
  await db.insert(emailSettings).values({
    id: 'default',
    provider: 'console',
    fromAddress: 'Admin Portal <noreply@example.com>',
    replyTo: 'support@example.com',
    enabled: 0,
    updatedAt: new Date(),
  }).onConflictDoNothing();

  console.log('\n✅ Database seeding complete!');
  console.log('\nDefault credentials created:');
  console.log('----------------------------------------------------');
  console.log('Superadmin: superadmin@example.com  |  Password: SuperAdmin123!');
  console.log('Admin:      admin@example.com       |  Password: AdminPass123!');
  console.log('User:       sophia.chen@example.com |  Password: UserPassword123!');
  console.log('----------------------------------------------------\n');

  await client.end();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
