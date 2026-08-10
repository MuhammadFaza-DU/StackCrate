import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * Diagnostic + fix for category icons.
 *
 * Usage:
 *   node scripts/fix-category-icons.ts          -> diagnose only (prints code points)
 *   node scripts/fix-category-icons.ts --fix    -> update icons to correct emoji
 *
 * Emoji are written as Unicode escapes (not literal chars) so file
 * encoding can never corrupt them — that is how the bug happened.
 */

// Correct icons per slug, expressed as pure Unicode escapes so file
// encoding can never corrupt them — that is how the bug happened.
const CORRECT_ICONS: Record<string, string> = {
  intro: '\u{1F3AC}',           // 🎬
  outro: '\u{1F39E}\u{FE0F}',   // 🎞️
  transition: String.fromCodePoint(0x2728),
  overlay: '\u{1F31F}',         // 🌟
  'sound-effect': '\u{1F50A}',  // 🔊
  music: '\u{1F3B5}',           // 🎵
  ambient: '\u{1F33F}',         // 🌿
  'stock-video': '\u{1F4F9}',   // 📹
};

function toCodePoints(s: string): string {
  return Array.from(s)
    .map((c) => 'U+' + (c.codePointAt(0) ?? 0).toString(16).toUpperCase())
    .join(' ');
}

async function main() {
  const fix = process.argv.includes('--fix');
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await client
    .from('categories')
    .select('slug, name, icon')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  console.log(fix ? '🔧 FIX MODE' : '🔍 DIAGNOSE MODE');
  console.log('slug           | name        | icon code points');
  console.log('---------------+-------------+-------------------------');

  let corrupted = 0;
  for (const row of data ?? []) {
    const expected = CORRECT_ICONS[row.slug];
    const isCorrupt = expected !== undefined && row.icon !== expected;
    if (isCorrupt) corrupted++;
    console.log(
      `${row.slug.padEnd(14)} | ${String(row.name).padEnd(11)} | ${toCodePoints(row.icon ?? '')}${isCorrupt ? '  <-- CORRUPT' : ''}`
    );
  }

  if (!fix) {
    console.log(corrupted > 0 ? `\n${corrupted} corrupt icon(s). Run with --fix to repair.` : '\nAll icons OK.');
    return;
  }

  for (const [slug, icon] of Object.entries(CORRECT_ICONS)) {
    const { error: upErr } = await client
      .from('categories')
      .update({ icon })
      .eq('slug', slug);
    if (upErr) throw upErr;
    console.log(`✅ updated ${slug} -> ${toCodePoints(icon)}`);
  }
  console.log('Done. Re-run without --fix to verify.');
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
