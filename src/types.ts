/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Platform {
  YOUTUBE = "YouTube",
  FACEBOOK = "Facebook",
}

export enum VideoType {
  YT_LONG = "YouTube Long Video",
  YT_SHORTS = "YouTube Shorts",
  FB_REEL = "Facebook Reel",
  FB_LONG = "Facebook Long Video",
  STORY = "Story Based Video",
  TUTORIAL = "Tutorial Video",
  REACTION = "Reaction Video",
  COMPARISON = "Comparison Video",
  CHALLENGE = "Challenge Video",
  BTS = "Behind The Scene",
}

export enum ContentStyle {
  EDUCATIONAL = "Educational",
  ENTERTAINMENT = "Entertainment",
  STORYTELLING = "Storytelling",
  FACELESS = "Faceless",
  PERSONAL_BRAND = "Personal Brand",
  NEWS = "News",
}

export enum Goal {
  VIEWS = "Views",
  SUBSCRIBERS = "Subscribers",
  SALES = "Sales",
  BRANDING = "Branding",
  MONETIZATION = "Monetization",
}

export interface DayPlan {
  day: number;
  platform: Platform;
  videoType: VideoType;
  title: string;
  hook: string;
  thumbnailText: string;
  scriptOutline: string;
  cta: string;
  viralScore: number;
  uploadTime: string;
  hashtags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  description?: string;
}

export interface ContentPillar {
  title: string;
  description: string;
}

export interface AIContentCalendar {
  nicheSummary: string;
  metrics: {
    growthPotential: number;
    viralOpportunity: number;
    monetizationScore: number;
    contentDifficulty: number;
  };
  contentPillars: ContentPillar[];
  calendar: DayPlan[];
  weeklyStrategy: {
    week1: string;
    week2: string;
    week3: string;
    week4: string;
  };
  extraFeatures: {
    recoveryPlan: string;
    backupIdea: string;
    repurposingTips: string;
    trendReactionIdeas: string;
    reuseViralContent: string;
  };
  analytics: {
    bestExpectedVideo: string;
    highestCtrTopic: string;
    fastestGrowthTopic: string;
    bestRetentionTopic: string;
    bestMonetizationTopic: string;
  };
}

export interface UserPreferences {
  niche: string;
  audience: string;
  language: string;
  country: string;
  style: ContentStyle;
  frequency: string;
  goal: Goal;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  preferences: UserPreferences;
  calendar: AIContentCalendar;
}

export interface SavedScript {
  id: string;
  projectId: string;
  day: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface PlanDay {
  date: string;
  title: string;
  notes: string;
}

export interface MonthAssignment {
  month: number;
  projectId: string;
  projectName: string;
}

export interface LongTermPlan {
  id: string;
  name: string;
  startDate: string;
  months: number;
  days: PlanDay[];
  createdAt: string;
  assignments?: MonthAssignment[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}
