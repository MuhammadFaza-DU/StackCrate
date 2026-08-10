import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  console.log('🔗 Testing Supabase connection...');
  console.log('  URL:', supabaseUrl);

  const client = createClient(supabaseUrl, anonKey);

  try {
    const { data, error } = await client.from('categories').select('id, slug, name').limit(3);
    if (error) throw error;
    console.log('  ✅ Connected! Categories:', (data as { name: string }[]).map((c) => c.name).join(', '));
  } catch (e) {
    console.error('  ❌ Supabase error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { error } = await serviceClient.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('  ✅ Service role key works');
  } catch (e) {
    console.log('  ✅ Service role key works (no profiles yet):', e instanceof Error ? e.message : String(e));
  }

  console.log('\n☁️  Testing R2 connection...');
  console.log('  Account ID:', accountId);
  console.log('  Bucket:', bucketName);

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  try {
    const { Buckets } = await r2.send(new ListBucketsCommand({}));
    const bucket = Buckets?.find((b) => b.Name === bucketName);
    if (bucket) {
      console.log('  ✅ R2 bucket', bucketName, 'found!');
    } else {
      console.log('  ⚠️  Bucket not found — may need to create it in R2 dashboard');
    }
  } catch (e) {
    console.error('  ⚠️  R2 test:', e instanceof Error ? e.message : String(e));
  }

  console.log('\n✅ Env check complete!');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});