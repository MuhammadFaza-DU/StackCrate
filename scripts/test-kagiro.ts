import { config } from 'dotenv';
config({ path: '.env.local', override: true });

const baseUrl = process.env.OPENAI_BASE_URL!;
const apiKey = process.env.OPENAI_API_KEY!;
const model = process.env.OPENAI_MODEL!;

console.log('🔗 Testing Adacode GPT-5-3 API...');
console.log('  Base URL:', baseUrl);
console.log('  Model:', model);
console.log('  API Key:', apiKey?.slice(0, 15) + '...');

async function main() {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with just the word "ok".' }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.log('  ❌ ChatCompletion:', res.status, text.slice(0, 400));
      process.exit(1);
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    console.log('  ✅ ChatCompletion OK! Reply:', reply);
    console.log('  ✅ API ready for graphify!');
  } catch (e) {
    console.log('  ❌ ChatCompletion:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main().catch(console.error);