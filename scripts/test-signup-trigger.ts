import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * Isolated reproduction of the signup trigger bug.
 * admin.createUser() inserts into auth.users directly, which fires the
 * on_auth_user_created trigger — exactly like signUp(), but with NO app code
 * in the way. If this fails with 23505 profiles_pkey, the trigger is broken.
 */

const TEST_EMAIL = `debug-${Date.now()}@test.local`;

async function main() {
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  console.log('Creating isolated test user:', TEST_EMAIL);
  const { data, error } = await client.auth.admin.createUser({
    email: TEST_EMAIL,
    password: 'test123456',
    email_confirm: true,
  });

  if (error) {
    console.log('❌ admin.createUser FAILED:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('✅ admin.createUser OK — user created:', data.user.id);

    // Verify profile was created by the trigger
    const { data: profile, error: profErr } = await client
      .from('profiles')
      .select('id, email, role')
      .eq('id', data.user.id)
      .single();
    if (profErr) {
      console.log('⚠️  profile NOT found after trigger:', profErr.message);
    } else {
      console.log('✅ profile created by trigger:', JSON.stringify(profile));
    }

    // Clean up — delete the test user (cascade removes profile)
    const { error: delErr } = await client.auth.admin.deleteUser(data.user.id);
    console.log(delErr ? `⚠️  cleanup delete failed: ${delErr.message}` : '🧹 test user deleted');
  }
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
