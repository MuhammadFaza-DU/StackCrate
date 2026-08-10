import { config } from 'dotenv';
config({ path: '.env.local' });

import { S3Client, ListBucketsCommand, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function main() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucketName = process.env.R2_BUCKET_NAME!;

  console.log('🔑 Token info:');
  console.log('  Account ID:', accountId);
  console.log('  Access Key ID:', accessKeyId);
  console.log('  Secret Access Key:', secretAccessKey.slice(0, 8) + '...');
  console.log('  Bucket:', bucketName);

  // Test 1: List buckets (needs Manage R2 Data permission)
  console.log('\n📦 Test 1: ListBuckets...');
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });

  try {
    const { Buckets } = await r2.send(new ListBucketsCommand({}));
    console.log('  ✅ ListBuckets OK! Buckets:', Buckets?.map((b) => b.Name));
  } catch (e) {
    console.log('  ❌ ListBuckets:', e instanceof Error ? e.message : String(e));
  }

  // Test 2: HeadBucket (needs Read R2 Data permission)
  console.log('\n📦 Test 2: HeadBucket...');
  try {
    await r2.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log('  ✅ HeadBucket OK — bucket', bucketName, 'exists!');
  } catch (e) {
    console.log('  ❌ HeadBucket:', e instanceof Error ? e.message : String(e));
  }

  // Test 3: List objects in bucket
  console.log('\n📦 Test 3: ListObjectsV2...');
  try {
    const { Contents } = await r2.send(new ListObjectsV2Command({ Bucket: bucketName }));
    console.log('  ✅ ListObjects OK —', Contents?.length ?? 0, 'objects');
  } catch (e) {
    console.log('  ❌ ListObjects:', e instanceof Error ? e.message : String(e));
  }

  console.log('\n✅ R2 tests complete!');
}

main().catch(console.error);