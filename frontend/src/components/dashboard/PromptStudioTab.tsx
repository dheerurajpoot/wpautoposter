"use client";

import React, { useEffect, useState, useRef } from "react";
import { apiFetch, UserPromptRecord } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  PenTool,
  Search,
  Sparkles,
  Code2,
  Image as ImageIcon,
  RotateCcw,
  Save,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Copy,
  Wand2,
  BookOpen,
  Info,
  Check,
  Zap,
  Globe,
} from "lucide-react";

interface StageConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  shortDesc: string;
  badge: string;
  simpleExplanation: string;
  variables: Array<{ tag: string; description: string }>;
}

const STAGES: StageConfig[] = [
  {
    id: "stage3_draft",
    name: "Article Writer & Tone",
    icon: PenTool,
    shortDesc: "Main article draft, tone of voice, word count & headings",
    badge: "Most Important",
    simpleExplanation:
      "This is your primary AI author. It writes the entire article from introduction to conclusion, determines paragraph flow, sets headings, and crafts the voice of your brand.",
    variables: [
      { tag: "${keyword}", description: "Target topic keyword" },
      { tag: "${contentType}", description: "Article format (BlogPost, Guide, etc.)" },
      { tag: "${focusKeyword}", description: "Primary SEO focus keyword" },
      { tag: "${siteName}", description: "Site brand name (auto-derived from WordPress URL)" },
      { tag: "${siteUrl}", description: "WordPress base site URL" },
      { tag: "${watermark}", description: "Uppercase watermark text (e.g. YOURSITE.COM)" },
    ],
  },
  {
    id: "stage2_research",
    name: "Deep Research & Accuracy",
    icon: Search,
    shortDesc: "Fact gathering, citations, statistics & definitions",
    badge: "Grounding",
    simpleExplanation:
      "This agent searches for real facts, verified data, and credible references before writing begins. It guarantees your articles are grounded in factual authority and not hallucinations.",
    variables: [
      { tag: "${keyword}", description: "Topic to investigate" },
      { tag: "${contentType}", description: "Content layout requirements" },
      { tag: "${siteName}", description: "Website brand name" },
      { tag: "${siteUrl}", description: "WordPress base site URL" },
    ],
  },
  {
    id: "stage3_final_edit",
    name: "Editor & Readability",
    icon: Sparkles,
    shortDesc: "Final polish, sentence flow, grammar & anti-AI-fluff",
    badge: "Polish Pass",
    simpleExplanation:
      "Acts as a ruthless senior editor. It trims repetitive sentences, removes generic AI fluff words, refines readability, and ensures the target keyword appears naturally in the opening 100 words.",
    variables: [
      { tag: "${draft}", description: "Full draft JSON from Writer" },
    ],
  },
  {
    id: "stage_final_html",
    name: "HTML & Formatting",
    icon: Code2,
    shortDesc: "WordPress markup, heading IDs, FAQ schema & tables",
    badge: "WordPress",
    simpleExplanation:
      "Converts the markdown article into clean semantic HTML ready for WordPress. It injects unique heading anchors for tables of contents and formats FAQs and tables without duplicate title tags.",
    variables: [
      { tag: "${markdown}", description: "Raw markdown article content" },
    ],
  },
  {
    id: "stage4_image",
    name: "Featured Image Generator",
    icon: ImageIcon,
    shortDesc: "Visual prompt styling, photography aesthetics & colors",
    badge: "Visual AI",
    simpleExplanation:
      "Generates the creative visual brief for the AI image engine (e.g. Gemini Imagen or DALL-E 3) to produce high-impact, text-free featured hero images for your WordPress posts.",
    variables: [
      { tag: "${title}", description: "Generated article title" },
      { tag: "${keyword}", description: "Focus keyword" },
      { tag: "${siteName}", description: "Website brand name" },
      { tag: "${watermark}", description: "Uppercase watermark for image banner (e.g. YOURSITE.COM)" },
    ],
  },
];

const TONE_PRESETS = [
  {
    id: "professional",
    name: "Professional & Authoritative",
    icon: "💼",
    desc: "Expert, analytical, credible, and data-backed. Ideal for finance, B2B, tech, and enterprise blogs.",
    promptInstruction:
      "Tone: Professional, authoritative, and credible. Use clean corporate prose with concrete examples, industry terminology, and data-driven explanations. Avoid buzzwords, fluff, or hyperbole.",
  },
  {
    id: "conversational",
    name: "Conversational & Engaging",
    icon: "☕",
    desc: "Friendly, warm, and approachable. Speaks directly to the reader with relatable real-world stories.",
    promptInstruction:
      "Tone: Conversational, friendly, and engaging. Speak directly to the reader using 'you' and 'we'. Use clear relatable analogies, active verbs, and varied sentence rhythms to maintain high curiosity.",
  },
  {
    id: "educational",
    name: "Educational & Step-by-Step",
    icon: "🎓",
    desc: "Clear, instructional, and beginner-friendly. Perfect for how-to guides, tutorials, and explainers.",
    promptInstruction:
      "Tone: Clear, educational, and patient. Break down complex concepts into straightforward steps. Use numbered lists, actionable takeaways, and beginner-accessible explanations without jargon.",
  },
  {
    id: "bold",
    name: "Bold & Persuasive",
    icon: "⚡",
    desc: "High energy, opinionated, and action-oriented. Great for reviews, comparisons, and affiliate posts.",
    promptInstruction:
      "Tone: Confident, bold, and persuasive. Provide strong points of view backed by logical arguments. Use concise impactful sentences, compelling callouts, and decisive verdict summaries.",
  },
];

const LENGTH_PRESETS = [
  {
    id: "standard",
    name: "Standard Article",
    words: "~1,200 – 1,500 words",
    desc: "Fast to read, focused on direct answers and 3–4 key takeaways.",
    promptInstruction:
      "Target article length: approximately 1,200 to 1,500 words. Keep sections tight, punchy, and directly relevant without filler.",
  },
  {
    id: "indepth",
    name: "In-Depth Guide",
    words: "~1,800 – 2,200 words",
    desc: "Comprehensive coverage with practical examples, FAQs, and step-by-step guidance.",
    promptInstruction:
      "Target article length: approximately 1,800 to 2,200 words. Include detailed section breakdowns, practical examples, actionable checklists, and a robust FAQ.",
  },
  {
    id: "pillar",
    name: "Comprehensive Pillar",
    words: "~2,500+ words",
    desc: "Exhaustive deep-dive designed to dominate search rankings for high-competition keywords.",
    promptInstruction:
      "Target article length: 2,500+ words. Provide exhaustive domain coverage, case studies, comparison frameworks, expert strategies, and in-depth FAQ responses.",
  },
];

const IMAGE_STYLE_PRESETS = [
  {
    id: "editorial_3d",
    name: "3D Editorial & Photorealistic",
    icon: "📸",
    desc: "Modern cinematic lighting, photorealistic textures, sleek studio composition.",
    promptInstruction:
      "Style: High-end editorial photography with subtle 3D lighting, vibrant modern color grading, clean studio background, depth of field. Strictly NO letters, words, or text.",
  },
  {
    id: "minimal_vector",
    name: "Modern Flat & Vector Art",
    icon: "🎨",
    desc: "Contemporary geometric shapes, clean corporate illustration, balanced negative space.",
    promptInstruction:
      "Style: Premium modern tech vector illustration, minimal clean lines, smooth gradients, corporate aesthetic. Strictly NO letters, words, or text.",
  },
  {
    id: "cinematic",
    name: "Cinematic Atmosphere",
    icon: "🌆",
    desc: "Dramatic ambient lighting, rich contrast, emotional storytelling visuals.",
    promptInstruction:
      "Style: Cinematic composition, dramatic atmospheric lighting, natural textures, rich colors, premium magazine visual. Strictly NO letters, words, or text.",
  },
  {
    id: "tech_concept",
    name: "Tech & Conceptual Visuals",
    icon: "💡",
    desc: "Abstract conceptual metaphors, smart digital motifs, polished futuristic feel.",
    promptInstruction:
      "Style: Conceptual tech art, abstract symbolic elements representing the topic, polished aesthetic, elegant lighting. Strictly NO letters, words, or text.",
  },
];

export function PromptStudioTab() {
  const { showToast } = useToast();
  const [promptsMap, setPromptsMap] = useState<Record<string, UserPromptRecord>>({});
  const [branding, setBranding] = useState<{
    siteUrl: string;
    domain: string;
    siteName: string;
    watermarkText: string;
  } | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>("stage3_draft");
  const [activeMode, setActiveMode] = useState<"simple" | "advanced">("simple");

  // Editor states
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Quick Preset states
  const [selectedTone, setSelectedTone] = useState("conversational");
  const [selectedLength, setSelectedLength] = useState("indepth");
  const [selectedImageStyle, setSelectedImageStyle] = useState("editorial_3d");
  const [brandGuidelines, setBrandGuidelines] = useState("");

  const systemTextareaRef = useRef<HTMLTextAreaElement>(null);
  const userTextareaRef = useRef<HTMLTextAreaElement>(null);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        prompts: UserPromptRecord[];
        branding?: {
          siteUrl: string;
          domain: string;
          siteName: string;
          watermarkText: string;
        };
      }>("/api/dashboard/prompts");
      if (data.branding) {
        setBranding(data.branding);
      }
      const map: Record<string, UserPromptRecord> = {};
      data.prompts.forEach((p) => {
        map[p.stage_key] = p;
      });
      setPromptsMap(map);

      // Populate current stage
      const current = map[selectedStage] || data.prompts[0];
      if (current) {
        setSelectedStage(current.stage_key);
        setSystemPrompt(current.system_prompt || "");
        setUserPrompt(current.user_prompt || "");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load prompts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleStageSelect = (stageId: string) => {
    setSelectedStage(stageId);
    const item = promptsMap[stageId];
    if (item) {
      setSystemPrompt(item.system_prompt || "");
      setUserPrompt(item.user_prompt || "");
    }
  };

  const handleSavePrompt = async (customSys?: string, customUsr?: string) => {
    setSaving(true);
    const sysToSave = customSys !== undefined ? customSys : systemPrompt;
    const usrToSave = customUsr !== undefined ? customUsr : userPrompt;

    try {
      await apiFetch("/api/dashboard/prompts", {
        method: "POST",
        body: {
          stage_key: selectedStage,
          system_prompt: sysToSave,
          user_prompt: usrToSave,
        } as any,
      });

      showToast("Prompt saved! Future articles will use these instructions.", "success");
      setPromptsMap((prev) => ({
        ...prev,
        [selectedStage]: {
          ...prev[selectedStage],
          system_prompt: sysToSave,
          user_prompt: usrToSave,
          is_customized: true,
        },
      }));
      setSystemPrompt(sysToSave);
      setUserPrompt(usrToSave);
    } catch (err: any) {
      showToast(err.message || "Failed to save prompt", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrompt = async () => {
    const stageObj = STAGES.find((s) => s.id === selectedStage);
    if (
      !confirm(
        `Are you sure you want to revert "${stageObj?.name}" back to the platform default? Any custom instructions for this stage will be replaced.`
      )
    ) {
      return;
    }

    try {
      const res = await apiFetch<{ ok: boolean; prompt: UserPromptRecord }>("/api/dashboard/prompts/reset", {
        method: "POST",
        body: { stage_key: selectedStage } as any,
      });

      showToast("Stage prompt restored to platform default!", "success");
      if (res.prompt) {
        setSystemPrompt(res.prompt.system_prompt || "");
        setUserPrompt(res.prompt.user_prompt || "");
        setPromptsMap((prev) => ({
          ...prev,
          [selectedStage]: res.prompt,
        }));
      }
    } catch (err: any) {
      showToast(err.message || "Reset failed", "error");
    }
  };

  // Quick Preset Applicator
  const handleApplyQuickPresets = () => {
    const currentItem = promptsMap[selectedStage];
    const basePrompt = currentItem?.default_system_prompt || systemPrompt;

    if (selectedStage === "stage3_draft") {
      const toneObj = TONE_PRESETS.find((t) => t.id === selectedTone);
      const lengthObj = LENGTH_PRESETS.find((l) => l.id === selectedLength);

      let customBlock = "\n\n# CUSTOM TONE & BRAND GUIDELINES (USER PRESETS)\n";
      if (toneObj) customBlock += `- ${toneObj.promptInstruction}\n`;
      if (lengthObj) customBlock += `- ${lengthObj.promptInstruction}\n`;
      if (brandGuidelines.trim()) {
        customBlock += `- Special Brand Rules: ${brandGuidelines.trim()}\n`;
      }

      // Clean existing custom block if present, then append
      const cleanedBase = basePrompt.replace(/\n\n# CUSTOM TONE & BRAND GUIDELINES[\s\S]*$/, "");
      const newPrompt = cleanedBase + customBlock;

      handleSavePrompt(newPrompt, userPrompt);
    } else if (selectedStage === "stage4_image") {
      const styleObj = IMAGE_STYLE_PRESETS.find((s) => s.id === selectedImageStyle);
      let customBlock = "\n\n# CUSTOM IMAGE STYLE (USER PRESETS)\n";
      if (styleObj) customBlock += `- ${styleObj.promptInstruction}\n`;
      if (brandGuidelines.trim()) {
        customBlock += `- Visual Notes: ${brandGuidelines.trim()}\n`;
      }

      const cleanedBase = basePrompt.replace(/\n\n# CUSTOM IMAGE STYLE[\s\S]*$/, "");
      const newPrompt = cleanedBase + customBlock;

      handleSavePrompt(newPrompt, userPrompt);
    } else {
      // General guidelines append
      if (!brandGuidelines.trim()) {
        showToast("Please enter custom instructions in the box below first.", "info");
        return;
      }
      const customBlock = `\n\n# CUSTOM STAGE RULES\n- ${brandGuidelines.trim()}\n`;
      const cleanedBase = basePrompt.replace(/\n\n# CUSTOM STAGE RULES[\s\S]*$/, "");
      handleSavePrompt(cleanedBase + customBlock, userPrompt);
    }
  };

  const handleInsertToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    showToast(`Copied ${token} to clipboard! Paste it wherever needed.`, "info");
  };

  const currentStage = STAGES.find((s) => s.id === selectedStage) || STAGES[0];
  const currentRecord = promptsMap[selectedStage];
  const isCustomized = Boolean(currentRecord?.is_customized);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading prompt studio configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Prompt Studio
                </h1>
                <p className="text-xs text-indigo-200">
                  Tailor AI writing tone, research depth, article length, and visual styles to your exact needs.
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge & Global Actions */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${isCustomized ? "bg-purple-400 animate-pulse" : "bg-emerald-400"}`} />
              <span className="text-slate-300 font-medium">
                {isCustomized ? "Using Custom Prompt" : "Using System Defaults"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPrompt}
              className="bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Stage</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleSavePrompt()}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Prompt"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Dynamic Site Branding Sync Banner ── */}
      {branding && (
        <div className="bg-white border border-indigo-100 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/50">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Dynamic WordPress Site Sync Active</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Live Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Prompts automatically inject your site name <strong className="text-indigo-900">{branding.siteName}</strong> and thumbnail watermark <strong className="text-indigo-900">{branding.watermarkText}</strong> from your connected WordPress URL (<span className="font-mono text-slate-700">{branding.domain}</span>).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <Badge variant="outline" className="text-[11px] font-mono bg-white text-indigo-700 border-indigo-200">
              {`\${siteName}`} = {branding.siteName}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-mono bg-white text-indigo-700 border-indigo-200">
              {`\${watermark}`} = {branding.watermarkText}
            </Badge>
          </div>
        </div>
      )}

      {/* ── 5 Stage Step Cards (Interactive Tab Navigation) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = selectedStage === stage.id;
          const stageRecord = promptsMap[stage.id];
          const hasCustom = Boolean(stageRecord?.is_customized);

          return (
            <button
              key={stage.id}
              onClick={() => handleStageSelect(stage.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between relative group ${
                isSelected
                  ? "bg-indigo-50/70 border-indigo-600 shadow-sm ring-2 ring-indigo-600/20"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      hasCustom
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {hasCustom ? "Custom" : `Stage ${idx + 1}`}
                  </span>
                </div>
                <div>
                  <h3
                    className={`text-xs font-bold ${
                      isSelected ? "text-indigo-950" : "text-slate-800"
                    }`}
                  >
                    {stage.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {stage.shortDesc}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="w-full h-1 bg-indigo-600 rounded-full mt-3" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active Stage Summary & Mode Switcher ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                {currentStage.name}
              </h2>
              <Badge variant="outline" className="text-xs bg-white text-slate-600">
                {currentStage.badge}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              {currentStage.simpleExplanation}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl self-start md:self-center">
            <button
              onClick={() => setActiveMode("simple")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeMode === "simple"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Quick Presets & Rules</span>
            </button>
            <button
              onClick={() => setActiveMode("advanced")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeMode === "advanced"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Advanced Prompt Editor</span>
            </button>
          </div>
        </div>

        {/* ── Mode 1: Quick Presets & Rules (User-Friendly Simple Mode) ── */}
        {activeMode === "simple" && (
          <div className="p-6 space-y-8">
            {/* Stage 3 Writer Options: Tone & Length */}
            {selectedStage === "stage3_draft" && (
              <>
                {/* 1. Tone of Voice */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>1. Choose Writing Tone</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400">Sets the voice and reading rhythm</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {TONE_PRESETS.map((t) => {
                      const isChecked = selectedTone === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTone(t.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/15"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{t.icon}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isChecked
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {isChecked && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mb-1">{t.name}</h4>
                          <p className="text-[11px] text-slate-500 leading-normal">{t.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Target Length & Depth */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>2. Target Article Length</span>
                    </label>
                    <span className="text-xs text-slate-400">Adjusts word count & section depth</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {LENGTH_PRESETS.map((l) => {
                      const isChecked = selectedLength === l.id;
                      return (
                        <div
                          key={l.id}
                          onClick={() => setSelectedLength(l.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/15"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-xs font-bold text-slate-900">{l.name}</h4>
                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {l.words}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">{l.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Stage 4 Image Options: Visual Style */}
            {selectedStage === "stage4_image" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Choose Featured Image Visual Style</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400">Controls AI image generation prompt aesthetics</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {IMAGE_STYLE_PRESETS.map((s) => {
                    const isChecked = selectedImageStyle === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedImageStyle(s.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/15"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{s.icon}</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isChecked
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300"
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">{s.name}</h4>
                        <p className="text-[11px] text-slate-500 leading-normal">{s.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Brand Guidelines / Special Instructions Box */}
            <div className="space-y-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>Brand Rules & Special Instructions (Optional)</span>
              </label>
              <p className="text-xs text-slate-500">
                Add rules specific to your website, blog, or region. For example:{" "}
                <span className="text-slate-700 italic font-medium">
                  &quot;Always use ₹ Indian Rupees for currency&quot;
                </span>
                ,{" "}
                <span className="text-slate-700 italic font-medium">
                  &quot;Write from the perspective of our brand IndianScope&quot;
                </span>
                , or{" "}
                <span className="text-slate-700 italic font-medium">
                  &quot;Never use cliché words like delve, tapestry, or pivotal&quot;
                </span>
                .
              </p>
              <Textarea
                rows={3}
                placeholder="e.g. Include practical Indian business examples. Always suggest mutual funds over savings accounts. Keep introductions short and to the point."
                value={brandGuidelines}
                onChange={(e) => setBrandGuidelines(e.target.value)}
                className="bg-white text-xs border-slate-200 focus:border-indigo-500"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  Preset changes are safe: they preserve required WordPress and SEO tags automatically.
                </span>
              </div>
              <Button
                onClick={handleApplyQuickPresets}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2 flex items-center gap-2 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{saving ? "Applying & Saving..." : "Apply & Save to Prompt"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── Mode 2: Advanced Prompt Editor ── */}
        {activeMode === "advanced" && (
          <div className="p-6 space-y-6">
            {/* Usable Dynamic Variables Pills */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Info className="w-3.5 h-3.5 text-indigo-600" /> Dynamic Context Variables (Click to Copy):
                </span>
                <span className="text-[11px] text-slate-400">Replaced automatically at runtime</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentStage.variables.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertToken(v.tag)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-700 transition shadow-2xs group"
                    title={`Click to copy: ${v.description}`}
                  >
                    <span>{v.tag}</span>
                    {copiedToken === v.tag ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                    )}
                    <span className="text-[10px] text-slate-400 font-sans ml-1">
                      ({v.description})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* System Prompt (Directives & Role) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>System Prompt (AI Engine Directives)</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {systemPrompt.length} chars
                  </Badge>
                </label>
                <span className="text-[11px] text-slate-400">
                  Instructs the AI model on rules, tone, structure, and output formatting
                </span>
              </div>
              <Textarea
                ref={systemTextareaRef}
                rows={16}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="font-mono text-xs text-slate-800 bg-slate-50/50 leading-relaxed border-slate-200 focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* User Prompt (Template Execution) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>User Prompt Template (Article Run Instruction)</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {userPrompt.length} chars
                  </Badge>
                </label>
                <span className="text-[11px] text-slate-400">
                  Sent on every article execution with the target keyword
                </span>
              </div>
              <Textarea
                ref={userTextareaRef}
                rows={4}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="font-mono text-xs text-slate-800 bg-slate-50/50 leading-relaxed border-slate-200 focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPrompt}
                className="text-xs text-slate-600 hover:text-slate-900 border-slate-200 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Platform Default</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSavePrompt()}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving Changes..." : "Save Custom Prompt"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Informational Helper Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h4 className="text-xs font-bold text-slate-900">Custom Prompts Run Live</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Whenever you click &quot;Run Now&quot; or &quot;Publish&quot; from your dashboard, your customized prompts are passed directly into the AI writer engine.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h4 className="text-xs font-bold text-slate-900">Always Reversible</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            You can test any tone or prompt change risk-free. If you ever want to return to the original verified formula, simply click &quot;Reset Stage&quot;.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h4 className="text-xs font-bold text-slate-900">Automated SEO Defense</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Even with custom tone instructions, the pipeline automatically defends focus keywords, RankMath scores, and prevents duplicate title tags.
          </p>
        </div>
      </div>
    </div>
  );
}
