import { CARDS_DB } from '../src/data/cards.db';

// Send a single consolidated database payload to Gemini for parallel auditing
async function runConsolidatedAudit(apiKey: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are an elite rewards database auditor. Your job is to compare the entire credit card database array against current live internet facts.
You are provided with the full database array containing credit card templates.
Use your Google Search tool to check if the annual fee or major statement credits for ANY of these cards have changed compared to the provided static configuration.
If any discrepancies are found, output a consolidated markdown table highlighting the changes (Card Name, Field, Current Value, Live Value, and Notes).
If no changes or discrepancies are detected anywhere in the database, output exactly: NO_CHANGE.

Guidelines:
1. Focus on high-end premium cards first (annual fee >= $250) such as Amex Platinum, Chase Sapphire Reserve, Capital One Venture X.
2. Keep the output clear, concise, and strictly focused on discrepancies. Do not list cards that match perfectly.`;

  // Hydrate templates with officialUrl for the prompt context
  const auditableTemplates = CARDS_DB.filter((c: any) => !!c.officialUrl).map((c: any) => ({
    id: c.id,
    name: c.name,
    bank: c.bank,
    annualFee: c.annualFee,
    officialUrl: c.officialUrl,
    benefits: c.benefits.map((b: any) => ({
      id: b.id,
      name: b.name,
      value: b.value,
      resetPeriod: b.resetPeriod,
      spendingLimit: b.spendingLimit
    }))
  }));

  const userPrompt = `Here is the full credit card templates database array:
${JSON.stringify(auditableTemplates, null, 2)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        tools: [
          {
            googleSearch: {}
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`Gemini API consolidated audit request failed: Status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return reply.trim();
  } catch (err) {
    console.error('Failed to execute consolidated Gemini audit:', err);
    return null;
  }
}

// Create a GitHub Issue using the standard GitHub REST API
async function createGitHubIssue(report: string) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.warn('⚠️ GITHUB_REPOSITORY or GITHUB_TOKEN is missing in environment. Skipping GitHub Issue creation.');
    console.log('\n--- CONSOLIDATED AUDIT REPORT ---');
    console.log(report);
    return;
  }

  const url = `https://api.github.com/repos/${repo}/issues`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'CC-Tracker-Auditor'
      },
      body: JSON.stringify({
        title: `🚨 [Card DB Audit Alert] Discrepancies Detected in Credit Card Perks/Fees`,
        body: `## Automated Credit Cards Database Audit Report

Our weekly automated database auditor has fetched active web facts via **Gemini Search Grounding** and detected discrepancies in your static card templates.

Please review the details below and adjust your static templates inside [cards.db.ts](src/data/cards.db.ts) if necessary.

---

${report}`
      })
    });

    if (response.ok) {
      console.log('🎉 Successfully created GitHub Issue on repository!');
    } else {
      console.error(`Failed to create GitHub Issue: Status ${response.status}`);
      const errText = await response.text();
      console.error(errText);
    }
  } catch (err) {
    console.error('Failed to trigger GitHub Issue REST API:', err);
  }
}

// Main Execution Loop
async function run() {
  console.log('🧪 Initiating automated weekly Card Database Audit...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing in environment variables. Aborting audit.');
    process.exit(1);
  }

  console.log('⚙️ Running consolidated audit via Gemini Search Grounding...');
  const auditOutput = await runConsolidatedAudit(apiKey);
  const cleanOutput = (auditOutput || '').trim();
  const isNoChange = cleanOutput.includes('NO_CHANGE') || cleanOutput.toUpperCase() === 'NO_CHANGE' || cleanOutput === '';

  if (auditOutput && !isNoChange) {
    console.log('⚠️ Discrepancies detected! Creating automated GitHub Issue...');
    await createGitHubIssue(auditOutput);
  } else {
    console.log('🎉 Audit completed cleanly. No discrepancies found in any card templates!');
  }
}

run();
