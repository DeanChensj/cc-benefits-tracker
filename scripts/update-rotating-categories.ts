import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CategoryUpdate {
  description: string;
  subCategories: string[];
  activeCoreCategories: string[];
  matchedDomains: string[];
}

interface RotatingUpdatePayload {
  'chase-freedom-flex'?: CategoryUpdate;
  'discover-it-cashback'?: CategoryUpdate;
}

async function fetchQuarterlyCategories(apiKey: string): Promise<RotatingUpdatePayload | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const systemInstruction = `You are an elite rewards database AI maintainer. Your job is to search the live internet for the official 5% rotating categories for the current active calendar quarter for Chase Freedom Flex and Discover it Cash Back.
Use your Google Search tool to verify the exact categories and active dates for the current quarter.

For each card, identify:
1. description: The exact summary text (e.g., "Q2 2026 (Apr-Jun): Amazon.com and Chase Travel (5% cash back on up to $1,500 spend)").
2. subCategories: An array of pill labels (e.g., ["Amazon.com", "Chase Travel"]).
3. activeCoreCategories: An array of core categories where this perk overlaps. Choose only from: ["dining", "travel", "shopping", "entertainment", "other"].
4. matchedDomains: An array of relevant merchant web domains for browser alert matching.`;

  const responseSchema = {
    type: "OBJECT",
    properties: {
      "chase-freedom-flex": {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          subCategories: { type: "ARRAY", items: { type: "STRING" } },
          activeCoreCategories: { type: "ARRAY", items: { type: "STRING" } },
          matchedDomains: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["description", "subCategories", "activeCoreCategories", "matchedDomains"]
      },
      "discover-it-cashback": {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          subCategories: { type: "ARRAY", items: { type: "STRING" } },
          activeCoreCategories: { type: "ARRAY", items: { type: "STRING" } },
          matchedDomains: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["description", "subCategories", "activeCoreCategories", "matchedDomains"]
      }
    },
    required: ["chase-freedom-flex", "discover-it-cashback"]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [
          { role: 'user', parts: [{ text: "Fetch current quarterly 5% rotating categories." }] }
        ],
        tools: [
          {
            googleSearch: {}
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema
        }
      })
    });

    if (!response.ok) {
      console.error(`Gemini API request failed: Status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    const cleanJsonStr = jsonMatch ? jsonMatch[0] : '';
    return JSON.parse(cleanJsonStr);
  } catch (err) {
    console.error('Failed to execute Gemini rotating category fetch:', err);
    return null;
  }
}

// Helper to safely escape single quotes and backslashes
const escapeQuotes = (str: string) => str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function updateCardsDbFile(updateData: RotatingUpdatePayload) {
  const dbPath = path.resolve(__dirname, '../src/data/cards.db.ts');
  try {
    let content = await fs.readFile(dbPath, 'utf-8');

    if (updateData['chase-freedom-flex']) {
      const cff = updateData['chase-freedom-flex'];
      if (Array.isArray(cff.subCategories) && Array.isArray(cff.activeCoreCategories) && Array.isArray(cff.matchedDomains)) {
        const cffRegex = /(id:\s*'cff-rotating'[\s\S]*?description:\s*')[^']+(?:\\[\s\S][^']*)*('[^}]*?subCategories:\s*\[)[^\]]*(\][^}]*?activeCoreCategories:\s*\[)[^\]]*(\][^}]*?matchedDomains:\s*\[)[^\]]*(\])/;
        
        const subCatsStr = cff.subCategories.map((s: string) => `'${escapeQuotes(s)}'`).join(', ');
        const coreCatsStr = cff.activeCoreCategories.map((s: string) => `'${escapeQuotes(s)}'`).join(', ');
        const domainsStr = cff.matchedDomains.map((s: string) => `'${escapeQuotes(s)}'`).join(', ');

        content = content.replace(cffRegex, (match, p1, p2, p3, p4, p5) => 
          `${p1}${escapeQuotes(cff.description)}${p2}${subCatsStr}${p3}${coreCatsStr}${p4}${domainsStr}${p5}`
        );
      }
    }

    if (updateData['discover-it-cashback']) {
      const disc = updateData['discover-it-cashback'];
      if (Array.isArray(disc.subCategories) && Array.isArray(disc.activeCoreCategories)) {
        const discRegex = /(id:\s*'discover-it-rotating'[\s\S]*?description:\s*')[^']+(?:\\[\s\S][^']*)*('[^}]*?subCategories:\s*\[)[^\]]*(\][^}]*?activeCoreCategories:\s*\[)[^\]]*(\])/;

        const subCatsStr = disc.subCategories.map((s: string) => `'${escapeQuotes(s)}'`).join(', ');
        const coreCatsStr = disc.activeCoreCategories.map((s: string) => `'${escapeQuotes(s)}'`).join(', ');

        content = content.replace(discRegex, (match, p1, p2, p3, p4) => 
          `${p1}${escapeQuotes(disc.description)}${p2}${subCatsStr}${p3}${coreCatsStr}${p4}`
        );
      }
    }

    await fs.writeFile(dbPath, content, 'utf-8');
    console.log('🎉 Successfully updated src/data/cards.db.ts with latest quarterly categories!');
  } catch (err) {
    console.error('Failed to update cards.db.ts file:', err);
    process.exit(1);
  }
}

async function run() {
  console.log('🧪 Initiating automated quarterly rotating category fetch...');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing in environment variables. Aborting update.');
    process.exit(1);
  }

  const updateData = await fetchQuarterlyCategories(apiKey);
  if (updateData && updateData['chase-freedom-flex'] && updateData['discover-it-cashback']) {
    console.log('⚙️ Successfully fetched live category data. Updating cards.db.ts...');
    await updateCardsDbFile(updateData);
  } else {
    console.error('❌ Failed to parse valid category update data from Gemini.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error in run loop:', err);
  process.exit(1);
});
