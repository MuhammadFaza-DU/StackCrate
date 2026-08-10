import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * Read-only diagnostic: after a failed signup, did the auth user / profile
 * actually get created? Distinguishes "trigger failed -> rollback" vs
 * "account exists but something else failed".
 */

const IDS = [
  '972ebc4c-4666-4039-b9c9-1f771bdf7f8b',
  '3febaf22-2e05-40b1-949c-afae9076341d',
];

async function main() {
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // 1) auth.users — via admin API
  const { data: usersData, error: usersErr } = await client.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  console.log(`auth.users total: ${usersData.users.length}`);
  for (const id of IDS) {
    const u = usersData.users.find((x) => x.id === id);
    console.log(`  ${id}: ${u ? `EXISTS (${u.email}, confirmed: ${!!u.email_confirmed_at})` : 'NOT FOUND'}`);
  }

  // 2) profiles — direct table read
  const { data: profiles, error: profErr } = await client
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });
  if (profErr) throw profErr;
  console.log(`profiles total: ${profiles?.length ?? 0}`);
  for (const p of profiles ?? []) {
    console.log(`  ${p.id} | ${p.email} | role=${p.role} | ${p.created_at}${IDS.includes(p.id) ? '  <-- failed-signup id' : ''}`);
  }
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
