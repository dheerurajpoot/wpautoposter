// Centralized subscription plans configuration
export const PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    priceINR: 9,
    priceUSDT: 10,
    monthlyQuota: 30,
    features: [
      '30 AI Articles per month',
      'Full SEO & Rank Math Integration',
      'Automated AI Research & Grounding',
      'Featured Thumbnail Generation',
      'Email Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Publisher',
    priceINR: 2499,
    priceUSDT: 25,
    monthlyQuota: 100,
    features: [
      '100 AI Articles per month',
      'Multi-Model AI (Gemini + OpenAI)',
      'Priority Queue Scheduling',
      'Custom Prompt Studio Overrides',
      'Automated Internal Linking',
      'Priority Support',
    ],
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency Scale',
    priceINR: 6999,
    priceUSDT: 70,
    monthlyQuota: 300,
    features: [
      '300 AI Articles per month',
      'Multiple WordPress Sites Connect',
      'High-Speed Batch Ingestion',
      'Full Access to Prompt Studio',
      'Custom AI Fine-tuning assistance',
      'Dedicated 1-on-1 Support',
    ],
  },
];

