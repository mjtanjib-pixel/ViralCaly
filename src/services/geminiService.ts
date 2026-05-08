/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { UserPreferences, AIContentCalendar, Platform, ChatMessage } from "../types";

// Use import.meta.env for Vite (Vercel/Netlify) or process.env for Node environments
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const updateRoadmapDaysTool: FunctionDeclaration = {
  name: "update_roadmap_days",
  description: "Update specific days in the content roadmap with new titles, hooks, and full scripts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      updates: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dayIndex: { 
              type: Type.INTEGER, 
              description: "The 1-based index of the day to update (e.g., 1 for Day 1)." 
            },
            title: { 
              type: Type.STRING, 
              description: "The new video title." 
            },
            hook: { 
              type: Type.STRING, 
              description: "The curiosity-driven 3-second hook." 
            },
            script: { 
              type: Type.STRING, 
              description: "The full viral script content." 
            }
          },
          required: ["dayIndex", "title", "hook", "script"]
        }
      }
    },
    required: ["updates"]
  }
};

export async function chatWithAI(
  message: string,
  history: ChatMessage[],
  prefs: UserPreferences
) {
  const systemInstruction = `
    You are the "Viral Caly" AI Assistant. You are an expert Viral Content Strategist and Scriptwriter.
    Your goal is to help creators scale their content roadmap.
    
    Current User Context:
    - Niche: ${prefs.niche}
    - Style: ${prefs.style}
    - Goal: ${prefs.goal}
    - Language: ${prefs.language}
    
    Capabilities:
    1. Answer questions about content strategy.
    2. Generate catchy titles and hooks.
    3. Write full scripts based on user requests.
    4. MULTI-DAY GENERATION: If the user asks for multiple days, you can generate them all.
    5. UPDATE ROADMAP: You can use the "update_roadmap_days" tool to suggest actual updates to their calendar. 
       When you do this, inform the user you've prepared the updates and they can see them in their plan.
    
    STRICT VIRAL SCRIPT STRUCTURE (MANDATORY):
    Formula: Hook → Curiosity → Problem → Story → Value → Twist → Payoff → CTA
    
    1. HOOK (0–5 sec): Scroll-stopper! Use curiosity, shock, questions, or problems.
    2. GOAL / PROMISE: What will the viewer get?
    3. PROBLEM / PAIN POINT: Touch frustration or fear.
    4. STORY / BUILDUP: Personal experience, experiment, challenge, mystery, or journey.
    5. MAIN VALUE SECTION: Tutorial, tips, explanation, process, breakdown.
    6. PATTERN INTERRUPTS: Every 20–30 sec to reset attention.
    7. EMOTIONAL PEAK / TWIST: Reveal, shocking truth, or emotional payoff.
    8. CONCLUSION: Short recap + final message.
    9. CTA (Call To Action): Subscription or specific next step.

    Guidelines:
    - Write EVERYTHING in ${prefs.language}.
  `;

  try {
    const formattedHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...formattedHistory, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [updateRoadmapDaysTool] }]
      }
    });

    return response;
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
}

export async function generateContentCalendar(prefs: UserPreferences): Promise<AIContentCalendar> {
  const commonRequirements = `
    - BE CONCISE. Keep titles, hooks, and descriptions short but punchy.
    - Focus on viral growth phases.
    - For every video, provide 5-8 viral hashtags.
    - STRICT JSON RULES: Never include unescaped newlines inside string values. Use \\n instead. Ensure all double quotes within strings are escaped as \\".
  `;

  const calendarSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.NUMBER },
        platform: { type: Type.STRING, enum: Object.values(Platform) },
        videoType: { type: Type.STRING },
        title: { type: Type.STRING },
        hook: { type: Type.STRING },
        thumbnailText: { type: Type.STRING },
        scriptOutline: { type: Type.STRING },
        cta: { type: Type.STRING },
        viralScore: { type: Type.NUMBER },
        uploadTime: { type: Type.STRING },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
        difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
        description: { type: Type.STRING }
      },
      required: ["day", "platform", "videoType", "title", "hook", "thumbnailText", "scriptOutline", "cta", "viralScore", "uploadTime", "hashtags", "difficulty", "description"]
    }
  };

  try {
    // Phase 1: Meta data + Days 1-15
    const prompt1 = `
      You are an elite AI Content Strategist. Build Phase 1 (Days 1-15) of a HIGH-PERFORMANCE 30-day content calendar.
      - Niche: ${prefs.niche} | Audience: ${prefs.audience} | Language: ${prefs.language} | Style: ${prefs.style} | Goal: ${prefs.goal}
      ${commonRequirements}
      - Generate metadata (nicheSummary, pillars, strategy, analytics) and EXACTLY Days 1 to 15 of the calendar.
    `;

    const response1 = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt1 }] }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8000,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nicheSummary: { type: Type.STRING },
            metrics: {
              type: Type.OBJECT,
              properties: {
                growthPotential: { type: Type.NUMBER },
                viralOpportunity: { type: Type.NUMBER },
                monetizationScore: { type: Type.NUMBER },
                contentDifficulty: { type: Type.NUMBER }
              }
            },
            contentPillars: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            calendar: calendarSchema,
            weeklyStrategy: {
              type: Type.OBJECT,
              properties: {
                week1: { type: Type.STRING },
                week2: { type: Type.STRING },
                week3: { type: Type.STRING },
                week4: { type: Type.STRING }
              }
            },
            extraFeatures: {
              type: Type.OBJECT,
              properties: {
                recoveryPlan: { type: Type.STRING },
                backupIdea: { type: Type.STRING },
                repurposingTips: { type: Type.STRING },
                trendReactionIdeas: { type: Type.STRING },
                reuseViralContent: { type: Type.STRING }
              }
            },
            analytics: {
              type: Type.OBJECT,
              properties: {
                bestExpectedVideo: { type: Type.STRING },
                highestCtrTopic: { type: Type.STRING },
                fastestGrowthTopic: { type: Type.STRING },
                bestRetentionTopic: { type: Type.STRING },
                bestMonetizationTopic: { type: Type.STRING }
              }
            }
          },
          required: ["nicheSummary", "metrics", "contentPillars", "calendar", "weeklyStrategy", "extraFeatures", "analytics"]
        }
      }
    });

    const phase1Data = JSON.parse(response1.text) as AIContentCalendar;

    // Phase 2: Days 16-30
    const prompt2 = `
      You are an elite AI Content Strategist. Build Phase 2 (Days 16-30) of the content calendar for:
      - Niche: ${prefs.niche} | Style: ${prefs.style}
      ${commonRequirements}
      - Context of Phase 1 titles: ${phase1Data.calendar.map(d => d.title).join(", ")}
      - Generate EXACTLY Days 16 to 30 of the calendar. ONLY return the calendar array.
    `;

    const response2 = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt2 }] }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8000,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calendar: calendarSchema
          },
          required: ["calendar"]
        }
      }
    });

    const phase2Data = JSON.parse(response2.text) as { calendar: any[] };

    // Merge
    phase1Data.calendar = [...phase1Data.calendar, ...phase2Data.calendar];
    
    return phase1Data;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate your viral content calendar. Please try again with a more specific niche.");
  }
}

export async function generateFullScript(
  title: string, 
  hook: string, 
  outline: string, 
  prefs: UserPreferences
): Promise<string> {
  const prompt = `
    You are an expert viral scriptwriter specializing in high-retention content. 
    Write a full, engaging script for a video in ${prefs.language} based on these details:
    
    - Video Title: ${title}
    - The 3-Second Hook: ${hook}
    - Content Outline: ${outline}
    - Niche: ${prefs.niche}
    - Language: ${prefs.language}
    - Target Audience: ${prefs.audience}
    - Content Style: ${prefs.style}
    
    STRICTLY FOLLOW THIS MODERN VIRAL SCRIPT STRUCTURE:
    Formula: Hook → Curiosity → Problem → Story → Value → Twist → Payoff → CTA

    - [HOOK]: Scroll-stopper! (0–5 sec)
    - [GOAL/PROMISE]: What viewer gets.
    - [PROBLEM/PAIN POINT]: Touch on frustration early.
    - [STORY/VALUE]: Narrative or technical breakdown with [VISUAL CUES].
    - [TWIST/PEAK]: Shocking truth or payoff.
    - [CTA]: Strong closing.

    Guidelines:
    - Fast pacing. No boring intros. Action-oriented language.
    - Write EVERYTHING in ${prefs.language}.
    - Style: ${prefs.style}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("AI returned empty script.");
    return responseText;
  } catch (error) {
    console.error("Script Generation Error:", error);
    throw new Error("Failed to generate your viral script. Please try again.");
  }
}
