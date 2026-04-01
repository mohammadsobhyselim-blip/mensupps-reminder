import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type TimingCategory =
  | 'MORNING' | 'WITH_MEALS' | 'PRE_WORKOUT'
  | 'POST_WORKOUT' | 'BEFORE_SLEEP' | 'ANYTIME';

const KEYWORD_MAP: Record<string, TimingCategory> = {
  'creatine':     'ANYTIME',
  'omega':        'WITH_MEALS',
  'fish oil':     'WITH_MEALS',
  'magnesium':    'BEFORE_SLEEP',
  'zma':          'BEFORE_SLEEP',
  'melatonin':    'BEFORE_SLEEP',
  'casein':       'BEFORE_SLEEP',
  'multivitamin': 'MORNING',
  'vitamin d':    'MORNING',
  'vitamin c':    'MORNING',
  'zinc':         'MORNING',
  'pre-workout':  'PRE_WORKOUT',
  'pre workout':  'PRE_WORKOUT',
  'caffeine':     'PRE_WORKOUT',
  'beta-alanine': 'PRE_WORKOUT',
  'whey':         'POST_WORKOUT',
  'protein':      'POST_WORKOUT',
  'bcaa':         'POST_WORKOUT',
  'eaa':          'POST_WORKOUT',
  'glutamine':    'POST_WORKOUT',
};

function ruleBasedClassify(title: string, tags: string[]): TimingCategory | null {
  const text = `${title} ${tags.join(' ')}`.toLowerCase();
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(keyword)) return category;
  }
  return null;
}

async function aiClassify(title: string, description: string): Promise<TimingCategory> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: `Classify this supplement. Reply with ONLY one word: MORNING, WITH_MEALS, PRE_WORKOUT, POST_WORKOUT, BEFORE_SLEEP, or ANYTIME\n\nProduct: ${title}\n${description.slice(0, 200)}`
      }]
    });
    const result = (msg.content[0] as any).text.trim().toUpperCase();
    const valid: TimingCategory[] = ['MORNING','WITH_MEALS','PRE_WORKOUT','POST_WORKOUT','BEFORE_SLEEP','ANYTIME'];
    return valid.includes(result as TimingCategory) ? result as TimingCategory : 'ANYTIME';
  } catch {
    return 'ANYTIME';
  }
}

export async function classifyProduct(product: {
  title: string;
  description: string;
  tags: string[];
}): Promise<{ category: TimingCategory; isCreatine: boolean; method: string }> {
  const isCreatine = product.title.toLowerCase().includes('creatine');
  const ruleResult = ruleBasedClassify(product.title, product.tags);
  if (ruleResult) return { category: ruleResult, isCreatine, method: 'rules' };
  const aiResult = await aiClassify(product.title, product.description);
  return { category: aiResult, isCreatine, method: 'ai' };
}
