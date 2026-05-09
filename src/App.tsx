/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Zap, 
  Settings, 
  Plus,
  PlusCircle, 
  BarChart3, 
  Download,
  Trash2,
  Search,
  Users,
  Globe,
  Loader2,
  TrendingUp,
  Award,
  Video,
  Sparkles,
  Folder,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Target,
  Rocket,
  MessageSquare,
  Send,
  X,
  Bot,
  AlertCircle,
  FileText,
  Link,
  LogIn,
  LogOut,
  User,
  Check
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { UserPreferences, AIContentCalendar, ContentStyle, Goal, Platform, Project, SavedScript, LongTermPlan, PlanDay, ChatMessage } from "./types";
import { generateContentCalendar, generateFullScript, chatWithAI } from "./services/geminiService";
import { LANGUAGES } from "./constants";

// --- Helpers ---
const truncateText = (text: string, limit: number = 40) => {
  if (!text) return "";
  if (text.length <= limit) return text;
  return text.substring(0, limit) + "...";
};

// --- Constants ---
const LOADING_MESSAGES = [
  "Analyzing your niche...",
  "Scanning viral trends...",
  "Building content pillars...",
  "Generating 30 video ideas...",
  "Calculating growth scores...",
  "Finalizing your calendar..."
];

// --- Components ---

const SidebarNavItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active?: boolean; 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
      active 
        ? "bg-brand/10 text-brand font-medium" 
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon className={`w-4 h-4 ${active ? "text-brand" : "group-hover:text-white"}`} />
    <span className="text-[13px]">{label}</span>
  </button>
);

const ScoreCard = ({ label, value, colorClass, icon: Icon }: any) => (
  <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
    <div className="flex items-baseline gap-2">
      <h3 className={`text-3xl font-display font-extrabold ${colorClass}`}>{value}</h3>
    </div>
    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`} 
        style={{ width: typeof value === 'number' ? `${value}%` : value.includes('%') ? value : '70%' }}
      />
    </div>
  </div>
);

function AnalyticsRow({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-brand/10 group-hover:border-brand/20 transition-all">
        <Icon className="w-4 h-4 text-gray-500 group-hover:text-brand" />
      </div>
      <div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">{label}</span>
        <span className="text-sm font-bold text-white italic group-hover:text-brand transition-colors">{value}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"dashboard" | "calendar" | "analytics" | "projects" | "scripts" | "plan">("dashboard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>({
    niche: "",
    audience: "",
    language: "English",
    country: "USA",
    style: ContentStyle.STORYTELLING,
    frequency: "Daily",
    goal: Goal.VIEWS,
  });
  const [calendar, setCalendar] = useState<AIContentCalendar | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [plans, setPlans] = useState<LongTermPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LongTermPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingScript, setEditingScript] = useState<SavedScript | null>(null);
  const [scriptLangPickerItem, setScriptLangPickerItem] = useState<any | null>(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [selectedPlanForAdd, setSelectedPlanForAdd] = useState<string>("");
  const [selectedMonthForAdd, setSelectedMonthForAdd] = useState<number>(1);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<number>(1);
  const [isAddingToPlan, setIsAddingToPlan] = useState(false);
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanMonths, setNewPlanMonths] = useState(12);
  const [newPlanProjectId, setNewPlanProjectId] = useState<string>("");
  const [newPlanStartMonth, setNewPlanStartMonth] = useState<number>(1);
  const [newPlanType, setNewPlanType] = useState<"new" | "select">("new");
  const [targetExistingPlanId, setTargetExistingPlanId] = useState("");
  const [stagedMapping, setStagedMapping] = useState<Record<number, { title: string, hook: string }>>({});
  const [selectedIdeaForMapping, setSelectedIdeaForMapping] = useState<number | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [addMonthModalOpen, setAddMonthModalOpen] = useState(false);
  const [addMonthProjectId, setAddMonthProjectId] = useState("");
  const [markedIdeas, setMarkedIdeas] = useState<number[]>([]);
  const [isPickingIdea, setIsPickingIdea] = useState(false);
  const [targetPlanDay, setTargetPlanDay] = useState<{planId: string, date: string} | null>(null);
  const assignIdeaToPlanDay = (ideaDay: number) => {
    if (!targetPlanDay || !calendar) return;

    const idea = calendar.calendar.find(i => i.day === ideaDay);
    if (!idea) return;

    setPlans(prev => {
      const updated = prev.map(p => {
        if (p.id === targetPlanDay.planId) {
          const newDays = [...p.days];
          const existingIdx = newDays.findIndex(d => d.date === targetPlanDay.date);
          if (existingIdx >= 0) {
            newDays[existingIdx] = { ...newDays[existingIdx], title: idea.title, notes: idea.hook };
          } else {
            newDays.push({ date: targetPlanDay.date, title: idea.title, notes: idea.hook });
          }
          return { ...p, days: newDays };
        }
        return p;
      });
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });

    setIsPickingIdea(false);
    setTargetPlanDay(null);
    // Optionally remove from markedIdeas if user wants only one placement
    // setMarkedIdeas(prev => prev.filter(id => id !== ideaDay));
  };
  
  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await chatWithAI(chatInput, chatMessages, prefs);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: response.text || "I'm sorry, I couldn't process that.",
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, modelMsg]);

      // Check for function calls
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === "update_roadmap_days") {
            const updates = call.args.updates as any[];
            handleAIUpdateRoadmap(updates);
          }
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "model",
        content: "Error: Failed to connect to AI server. Please try again.",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAIUpdateRoadmap = (updates: any[]) => {
    // This logic updates the current selected plan or calendar
    // For simplicity, we update selectedPlan if in plan view, or the current calendar project
    
    if (view === "plan" && selectedPlan) {
      setPlans(prev => {
        const updated = prev.map(p => {
          if (p.id === selectedPlan.id) {
            const newDays = [...p.days];
            updates.forEach(u => {
              const dNum = u.dayIndex;
              const date = new Date(p.startDate);
              date.setDate(date.getDate() + dNum - 1);
              const dateStr = date.toISOString().split('T')[0];
              const idx = newDays.findIndex(d => d.date === dateStr);
              if (idx >= 0) {
                newDays[idx] = { ...newDays[idx], title: u.title, notes: `${u.hook}\n\n[AI SCRIPT]:\n${u.script}` };
              }
            });
            const updatedPlan = { ...p, days: newDays };
            setSelectedPlan(updatedPlan);
            return updatedPlan;
          }
          return p;
        });
        localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
        return updated;
      });
    } else if (calendar) {
      // Find matching project
      const project = projects.find(p => p.calendar === calendar);
      if (project) {
        const newCalendar = { ...calendar };
        updates.forEach(u => {
          const idx = newCalendar.calendar.findIndex(c => c.day === u.dayIndex);
          if (idx >= 0) {
            newCalendar.calendar[idx] = { 
              ...newCalendar.calendar[idx], 
              title: u.title, 
              hook: u.hook, 
              scriptOutline: u.script 
            };
          }
        });
        setCalendar(newCalendar);
        updateProject(project.id, newCalendar);
      }
    }
  };

  const addCalendarToPlan = () => {
    if (!calendar || !selectedPlanForAdd) return;
    
    const plan = plans.find(p => p.id === selectedPlanForAdd);
    if (!plan) return;

    // The absolute day offset in the roadmap (1-indexed)
    const startDay = (selectedMonthForAdd - 1) * 30 + selectedDayForAdd;
    
    // Filter items to add
    const itemsToAdd = markedIdeas.length > 0 
      ? calendar.calendar.filter(i => markedIdeas.includes(i.day)) 
      : calendar.calendar.slice(0, 30);

    const targetDates: string[] = [];
    for (let i = 0; i < itemsToAdd.length; i++) {
        const d = new Date(plan.startDate);
        d.setDate(d.getDate() + (startDay + i) - 1);
        targetDates.push(d.toISOString().split('T')[0]);
    }

    const isSlotOccupied = plan.days.some(day => targetDates.includes(day.date) && day.title.trim() !== "");

    if (isSlotOccupied && markedIdeas.length === 0) {
        alert("Some days in this range already have a plan. You cannot overwrite them with a batch add.");
        return;
    }

    setPlans(prev => {
      const updated = prev.map(p => {
        if (p.id === selectedPlanForAdd) {
            let newDays = [...p.days];
            itemsToAdd.forEach((item, index) => {
                const targetDate = targetDates[index];
                const existingIdx = newDays.findIndex(d => d.date === targetDate);
                if (existingIdx >= 0) {
                    newDays[existingIdx] = { ...newDays[existingIdx], title: item.title, notes: item.hook };
                } else {
                    newDays.push({ date: targetDate, title: item.title, notes: item.hook });
                }
            });

            // Update assignments - optionally assign to the start month
            const project = projects.find(proj => proj.calendar === calendar);
            let newAssignments = [...(p.assignments || [])];
            if (project) {
              const existingAssIdx = newAssignments.findIndex(a => a.month === selectedMonthForAdd);
              if (existingAssIdx >= 0) {
                newAssignments[existingAssIdx] = { month: selectedMonthForAdd, projectId: project.id, projectName: project.name };
              } else {
                newAssignments.push({ month: selectedMonthForAdd, projectId: project.id, projectName: project.name });
              }
            }

            return { ...p, days: newDays, assignments: newAssignments };
        }
        return p;
      });
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });

    alert(`Successfully added to ${plan.name} starting Month ${selectedMonthForAdd}, Day ${selectedDayForAdd}`);
    setPlanPickerOpen(false);
  };

  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptContent, setScriptContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthTimeout(true);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setAuthLoading(false);
    }).catch(err => {
      clearTimeout(timeout);
      console.error('Auth error:', err);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadDataFromSupabase = async (userId: string) => {
    try {
      // Load Projects
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (projErr) throw projErr;
      if (projData) setProjects(projData as any[]);

      // Load Scripts
      const { data: scriptData, error: scriptErr } = await supabase
        .from('scripts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (scriptErr) throw scriptErr;
      if (scriptData) setScripts(scriptData as any[]);

      // Load Plans
      const { data: planData, error: planErr } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (planErr) throw planErr;
      if (planData) setPlans(planData as any[]);

    } catch (err) {
      console.error('Error loading data from Supabase:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDataFromSupabase(user.id);
    }
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const updateProfile = async (updates: any) => {
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setProfile({ ...profile, ...updates });
      setProfileModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    // Current Active Calendar
    const saved = localStorage.getItem("viral_caly_data");
    if (saved) {
      try {
        setCalendar(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("viral_caly_data");
      }
    }

    // Load Projects
    const savedProjects = localStorage.getItem("viral_caly_projects");
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        setProjects([]);
      }
    }

    // Load Scripts
    const savedScripts = localStorage.getItem("viral_caly_scripts");
    if (savedScripts) {
      try {
        setScripts(JSON.parse(savedScripts));
      } catch (e) {
        setScripts([]);
      }
    }

    // Load Plans
    const savedPlans = localStorage.getItem("viral_caly_plans");
    if (savedPlans) {
      try {
        setPlans(JSON.parse(savedPlans));
      } catch (e) {
        setPlans([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prefs.niche) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateContentCalendar(prefs);
      setCalendar(result);
      localStorage.setItem("viral_caly_data", JSON.stringify(result));

      // Save as Project
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: prefs.niche,
        createdAt: new Date().toISOString(),
        preferences: { ...prefs },
        calendar: result
      };
      
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      localStorage.setItem("viral_caly_projects", JSON.stringify(updatedProjects));

      // Save to Supabase if logged in
      if (user) {
        await supabase.from('projects').insert({
          id: newProject.id,
          user_id: user.id,
          name: newProject.name,
          preferences: newProject.preferences,
          calendar: newProject.calendar,
          created_at: newProject.createdAt
        });
      }

      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate calendar");
    } finally {
      setIsGenerating(false);
      setLoadingMsgIndex(0);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetApp = () => {
    localStorage.clear();
    window.location.reload();
  };

  const loadProject = (project: Project, targetView: "dashboard" | "calendar" | "analytics" | "plan" = "dashboard") => {
    setCalendar(project.calendar);
    setPrefs(project.preferences);
    localStorage.setItem("viral_caly_data", JSON.stringify(project.calendar));
    setView(targetView);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
      }).catch(err => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  const updateProject = async (id: string, newCalendar: AIContentCalendar) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, calendar: newCalendar } : p);
      localStorage.setItem("viral_caly_projects", JSON.stringify(updated));
      return updated;
    });

    if (user) {
      await supabase
        .from('projects')
        .update({ calendar: newCalendar })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }
    document.body.removeChild(textArea);
  };

  const handleCopyTags = (tags: string[]) => {
    const tagString = tags.join(" ");
    copyToClipboard(tagString);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this project?")) return;

    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem("viral_caly_projects", JSON.stringify(updated));
      return updated;
    });

    if (user) {
      await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const deleteScript = async (id: string) => {
    setScripts(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem("viral_caly_scripts", JSON.stringify(updated));
      return updated;
    });
    setEditingScript(null);

    if (user) {
      await supabase
        .from('scripts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const updateScript = async () => {
    if (!editingScript) return;
    setScripts(prev => {
      const updated = prev.map(s => s.id === editingScript.id ? editingScript : s);
      localStorage.setItem("viral_caly_scripts", JSON.stringify(updated));
      return updated;
    });

    if (user) {
      await supabase
        .from('scripts')
        .update({
          title: editingScript.title,
          content: editingScript.content
        })
        .eq('id', editingScript.id)
        .eq('user_id', user.id);
    }

    alert("Script updated successfully!");
    setEditingScript(null);
  };

  const createPlan = async (name: string, months: number, projectId?: string, startMonth: number = 1, manualMapping?: Record<number, { title: string, hook: string }>) => {
    const startDate = new Date();
    const newPlan: LongTermPlan = {
      id: crypto.randomUUID(),
      name,
      startDate: startDate.toISOString(),
      months,
      days: [],
      createdAt: new Date().toISOString(),
      assignments: []
    };

    const initialDays: PlanDay[] = [];
    const startDayOffset = (startMonth - 1) * 30;

    // Use manual mapping if provided, otherwise auto-fill from project
    if (manualMapping) {
      Object.entries(manualMapping).forEach(([relDayIdx, data]) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + startDayOffset + parseInt(relDayIdx));
        initialDays.push({
          date: d.toISOString().split('T')[0],
          title: data.title,
          notes: data.hook
        });
      });
    } else if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project && project.calendar) {
        project.calendar.calendar.forEach((item, index) => {
          if (index < 30) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + startDayOffset + index);
            initialDays.push({
              date: d.toISOString().split('T')[0],
              title: item.title,
              notes: item.hook
            });
          }
        });
      }
    }

    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        newPlan.assignments = [{
          month: startMonth,
          projectId: project.id,
          projectName: project.name
        }];
      }
    }

    newPlan.days = initialDays;

    setPlans(prev => {
      const updated = [newPlan, ...prev];
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });

    if (user) {
      await supabase.from('plans').insert({
        id: newPlan.id,
        user_id: user.id,
        name: newPlan.name,
        start_date: newPlan.startDate,
        months: newPlan.months,
        days: newPlan.days,
        assignments: newPlan.assignments,
        created_at: newPlan.createdAt
      });
    }

    setSelectedPlan(newPlan);
  };

  const addMonthToPlan = (planId: string) => {
    const project = projects.find(p => p.id === addMonthProjectId);
    
    setPlans(prev => {
      const updated = prev.map(p => {
        if (p.id === planId) {
          const nextMonth = p.months + 1;
          const updatedPlan = { ...p, months: nextMonth };
          
          if (project && project.calendar) {
            const newAssignments = [...(p.assignments || [])];
            newAssignments.push({ month: nextMonth, projectId: project.id, projectName: project.name });
            updatedPlan.assignments = newAssignments;
            const startDayOffset = (nextMonth - 1) * 30;
            const newDays = [...p.days];
            project.calendar.calendar.forEach((item, index) => {
              if (index < 30) {
                const d = new Date(p.startDate);
                d.setDate(d.getDate() + startDayOffset + index);
                newDays.push({ date: d.toISOString().split('T')[0], title: item.title, notes: item.hook });
              }
            });
            updatedPlan.days = newDays;
          }
          if (selectedPlan?.id === p.id) setSelectedPlan(updatedPlan);
          
          // Sync to Supabase
          if (user) {
            supabase.from('plans').update({ 
               months: updatedPlan.months, 
               days: updatedPlan.days, 
               assignments: updatedPlan.assignments 
            }).eq('id', planId).eq('user_id', user.id).then();
          }
          
          return updatedPlan;
        }
        return p;
      });
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });
    
    setAddMonthModalOpen(false);
    setAddMonthProjectId("");
  };

  const deleteMonthFromPlan = async (planId: string, mIndex: number) => {
    setPlans(prev => {
      const updated = prev.map(p => {
        if (p.id === planId) {
          const monthNum = mIndex + 1;
          const startDay = mIndex * 30 + 1;
          const endDay = (mIndex + 1) * 30;
          
          let newDays = p.days.filter(day => {
            const planStart = new Date(p.startDate).getTime();
            const dayDate = new Date(day.date).getTime();
            const dNum = Math.floor((dayDate - planStart) / (1000 * 60 * 60 * 24)) + 1;
            return dNum < startDay || dNum > endDay;
          });

          newDays = newDays.map(day => {
            const planStart = new Date(p.startDate).getTime();
            const dayDate = new Date(day.date).getTime();
            const dNum = Math.floor((dayDate - planStart) / (1000 * 60 * 60 * 24)) + 1;
            if (dNum > endDay) {
                const d = new Date(day.date);
                d.setDate(d.getDate() - 30);
                return { ...day, date: d.toISOString().split('T')[0] };
            }
            return day;
          });

          let newAssignments = (p.assignments || []).filter(a => a.month !== monthNum);
          newAssignments = newAssignments.map(a => {
            if (a.month > monthNum) {
              return { ...a, month: a.month - 1 };
            }
            return a;
          });

          const updatedPlan = {
            ...p,
            months: Math.max(1, p.months - 1),
            days: newDays,
            assignments: newAssignments
          };

          if (selectedPlan?.id === planId) {
            setSelectedPlan(updatedPlan);
          }

          if (user) {
            supabase.from('plans').update({ 
               months: updatedPlan.months, 
               days: updatedPlan.days, 
               assignments: updatedPlan.assignments 
            }).eq('id', planId).eq('user_id', user.id).then();
          }

          return updatedPlan;
        }
        return p;
      });
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });
  };

  const updatePlanDay = async (planId: string, dayDate: string, title: string, notes: string) => {
    setPlans(prev => {
      const updated = prev.map(p => {
        if (p.id === planId) {
          const existingDayIndex = p.days.findIndex(d => d.date === dayDate);
          let newDays = [...p.days];
          if (existingDayIndex >= 0) {
            newDays[existingDayIndex] = { ...newDays[existingDayIndex], title, notes };
          } else {
            newDays.push({ date: dayDate, title, notes });
          }
          
          if (user) {
            supabase.from('plans').update({ 
               days: newDays 
            }).eq('id', planId).eq('user_id', user.id).then();
          }

          return { ...p, days: newDays };
        }
        return p;
      });
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });
  };

  const deletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this roadmap?")) return;

    setPlans(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem("viral_caly_plans", JSON.stringify(updated));
      return updated;
    });

    if (selectedPlan?.id === id) setSelectedPlan(null);

    if (user) {
      await supabase
        .from('plans')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const handleGenerateScript = async (item: any, langOverride?: string) => {
    if (generatingScript) return;
    setGeneratingScript(true);
    setError(null);
    setScriptContent(null);
    setScriptLangPickerItem(null);

    const targetLang = langOverride || prefs.language;
    const activePrefs = { ...prefs, language: targetLang };

    try {
      const script = await generateFullScript(item.title, item.hook, item.scriptOutline, activePrefs);
      setScriptContent(script);

      // Save script to history
      const newSavedScript: SavedScript = {
        id: crypto.randomUUID(),
        projectId: projects.find(p => p.calendar === calendar)?.id || "unknown",
        day: item.day,
        title: item.title,
        content: script,
        createdAt: new Date().toISOString()
      };
      
      setScripts(prev => {
        const updated = [newSavedScript, ...prev];
        localStorage.setItem("viral_caly_scripts", JSON.stringify(updated));
        return updated;
      });

      if (user) {
        await supabase.from('scripts').insert({
          id: newSavedScript.id,
          user_id: user.id,
          project_id: newSavedScript.projectId,
          day: newSavedScript.day,
          title: newSavedScript.title,
          content: newSavedScript.content,
          created_at: newSavedScript.createdAt
        });
      }
    } catch (err) {
      alert("Failed to generate script. Please try again.");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleExport = () => {
    if (!calendar) return;
    
    const title = `Viral Strategy: ${prefs.niche}`;
    const date = new Date().toLocaleDateString();

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333; }
        h1 { color: #FF4D2D; border-bottom: 2px solid #FF4D2D; padding-bottom: 10px; font-size: 24pt; }
        h2 { color: #444; margin-top: 30px; background: #f0f0f0; padding: 10px; font-size: 18pt; }
        h3 { color: #FF4D2D; font-size: 14pt; margin-bottom: 5px; }
        .item { margin-bottom: 25px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .label { font-weight: bold; color: #777; font-size: 10pt; text-transform: uppercase; margin-top: 10px; }
        .value { margin-bottom: 10px; font-size: 12pt; }
        .meta { color: #999; font-size: 10pt; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .platform-tag { background: #FF4D2D; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: bold; display: inline-block; }
        .stat-box { display: inline-block; margin-right: 20px; margin-top: 10px; font-size: 10pt; color: #666; }
      </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Generated by ViralCal AI on ${date} | Niche: ${prefs.niche} | Style: ${prefs.style} | Goal: ${prefs.goal}</div>
        
        <h2>Weekly Growth Strategy</h2>
        <div class="item">
          <p><strong>Week 1 (Reach):</strong> ${calendar.weeklyStrategy.week1}</p>
          <p><strong>Week 2 (Growth):</strong> ${calendar.weeklyStrategy.week2}</p>
          <p><strong>Week 3 (Viral):</strong> ${calendar.weeklyStrategy.week3}</p>
          <p><strong>Week 4 (Monetization):</strong> ${calendar.weeklyStrategy.week4}</p>
        </div>

        <h2>30-Day Content Matrix</h2>
        ${calendar.calendar.map(item => `
          <div class="item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3>Day ${item.day}: ${item.title}</h3>
              <span class="platform-tag">${item.platform}</span>
            </div>
            
            <div class="label">Viral Hook (3s)</div>
            <div class="value"><em>"${item.hook}"</em></div>
            
            <div class="label">Thumbnail Concept</div>
            <div class="value">${item.thumbnailText || "N/A"}</div>
            
            <div class="label">Strategy Brief</div>
            <div class="value">${item.scriptOutline || "N/A"}</div>

            <div class="label">SEO Hashtags</div>
            <div class="value">${item.hashtags?.map(t => "#" + t).join(" ") || "N/A"}</div>

            <div class="stat-box"><strong>Upload:</strong> ${item.uploadTime}</div>
            <div class="stat-box"><strong>Viral Score:</strong> ${item.viralScore}%</div>
            <div class="stat-box"><strong>Complexity:</strong> ${item.difficulty}</div>
          </div>
        `).join('')}

        <h2>Advanced Protocols</h2>
        <div class="item">
          <p><strong>Recovery Plan:</strong> ${calendar.extraFeatures.recoveryPlan}</p>
          <p><strong>Trend Strategy:</strong> ${calendar.extraFeatures.trendReactionIdeas}</p>
          <p><strong>Repurposing:</strong> ${calendar.extraFeatures.repurposingTips}</p>
          <p><strong>Viral Reuse:</strong> ${calendar.extraFeatures.reuseViralContent}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `viral_strategy_${prefs.niche.replace(/\s+/g, '_')}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to delete this plan and start fresh?")) {
      setCalendar(null);
      setPrefs({
        niche: "",
        audience: "",
        language: "English",
        country: "USA",
        style: ContentStyle.STORYTELLING,
        frequency: "Daily",
        goal: Goal.VIEWS,
      });
      setSelectedDay(null);
      setError(null);
      localStorage.removeItem("viral_caly_data");
      setView("dashboard");
    }
  };

  const activeDay = selectedDay !== null ? calendar?.calendar.find(d => d.day === selectedDay) : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center flex-col gap-6 p-8 text-center">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-brand animate-spin" />
          <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] animate-pulse">Initializing Engine...</p>
          {authTimeout && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl max-w-xs mx-auto"
            >
              <p className="text-[11px] text-gray-400 leading-relaxed italic">
                Taking longer than usual. Please check your Supabase credentials in Vercel. 
                Vercel-এ <code className="text-brand">VITE_SUPABASE_URL</code> সেট করেছেন তো?
              </p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return (
        <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter mb-4">Supabase missing!</h2>
          <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-8">
            It looks like you haven't connected Supabase yet. Vercel-এ এটি কাজ করানোর জন্য <code className="text-brand">VITE_SUPABASE_URL</code> এবং <code className="text-brand">VITE_SUPABASE_ANON_KEY</code> এনভায়রনমেন্ট ভেরিয়েবল সেট করতে হবে।
          </p>
          <a 
            href="/settings" 
            className="px-8 py-4 bg-white text-black font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-brand hover:text-white transition-all shadow-xl shadow-brand/20"
          >
            Go to Settings
          </a>
        </div>
      );
    }
    return <SupabaseAuth />;
  }

  return (
    <div className={`flex h-screen bg-bg-primary overflow-hidden ${theme === 'light' ? 'light' : ''}`}>
      {/* Sidebar */}
      <aside className="w-[220px] bg-bg-secondary border-r border-border-subtle flex flex-col py-6">
        <div className="px-5 mb-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white fill-current" />
          </div>
          <h1 className="font-display font-extrabold text-lg text-white">
            Viral<span className="text-brand">Cal</span>
          </h1>
        </div>

        <div className="flex-1 px-3 space-y-6">
          {calendar ? (
            <div className="space-y-1">
              <div className="px-3 py-2 bg-brand/5 border border-brand/10 rounded-xl mb-4">
                 <span className="text-[9px] font-bold text-brand uppercase tracking-widest block mb-0.5">Active Project</span>
                 <h3 className="text-[13px] font-bold text-white truncate italic">{prefs.niche}</h3>
              </div>
              <SidebarNavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                active={view === "dashboard"} 
                onClick={() => setView("dashboard")} 
              />
              <SidebarNavItem 
                icon={CalendarIcon} 
                label="Calendar" 
                active={view === "calendar"} 
                onClick={() => setView("calendar")} 
              />
              <SidebarNavItem 
                icon={BarChart3} 
                label="Analytics" 
                active={view === "analytics"} 
                onClick={() => setView("analytics")} 
              />
              <SidebarNavItem 
                icon={Video} 
                label="Scripts" 
                active={view === "scripts"} 
                onClick={() => setView("scripts")} 
              />
              <SidebarNavItem 
                icon={Target} 
                label="Plan" 
                active={view === "plan"} 
                onClick={() => setView("plan")} 
              />
              <div className="pt-4 mt-4 border-t border-white/5">
                <SidebarNavItem 
                  icon={Folder} 
                  label="All Projects" 
                  active={view === "projects"}
                  onClick={() => setView("projects")} 
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Workspace</h4>
              <SidebarNavItem 
                icon={PlusCircle} 
                label="New Strategy" 
                active={view === "dashboard"} 
                onClick={() => setView("dashboard")} 
              />
              <SidebarNavItem 
                icon={Folder} 
                label="Projects" 
                active={view === "projects"}
                onClick={() => setView("projects")} 
              />
              <SidebarNavItem 
                icon={Video} 
                label="Scripts" 
                active={view === "scripts"} 
                onClick={() => setView("scripts")} 
              />
              <SidebarNavItem 
                icon={Target} 
                label="Plan" 
                active={view === "plan"} 
                onClick={() => setView("plan")} 
              />
            </div>
          )}

          <div className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tools</h4>
            <SidebarNavItem 
              icon={Settings} 
              label="Settings" 
              active={view === "settings"}
              onClick={() => setView("settings")} 
            />
          </div>
        </div>

        <div className="px-4 mt-auto">
          <div className="bg-gradient-to-br from-brand to-[#FF8C42] p-4 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
              <strong className="text-white text-sm block mb-1">Upgrade to Pro</strong>
              <p className="text-white/70 text-[10px] leading-tight mb-3">Unlimited AI calls & priority support.</p>
              <button className="w-full bg-white text-brand text-[11px] font-bold py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Upgrade Now →
              </button>
            </div>
            <Zap className="absolute -bottom-2 -right-2 w-16 h-16 text-white/10 group-hover:scale-110 transition-transform" />
          </div>

          <button 
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-3 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all mt-6 border border-white/5"
          >
            <User className="w-4 h-4 text-brand" />
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest truncate w-full text-left">
                {profile?.full_name || user?.email?.split('@')[0] || 'Warrior Profile'}
              </span>
              <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Edit Identity</span>
            </div>
          </button>

          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-3 text-red-500/60 hover:text-red-500 rounded-xl hover:bg-red-500/5 transition-all mt-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
        {/* Topbar */}
        <header className="h-16 bg-bg-secondary border-b border-border-subtle px-8 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-text-primary">Content Strategy</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors bg-white/5 rounded-lg border border-white/5"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => {
                setCalendar(null);
                localStorage.removeItem("viral_caly_data");
              }}
              className="bg-brand text-white text-[12px] font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-3 h-3 fill-current" />
              Generate New
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {!calendar && !isGenerating ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <div className="bg-[#141414] border border-white/5 p-8 rounded-3xl space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-brand">
                      <Rocket className="w-5 h-5" />
                      <h3 className="font-display font-bold text-lg text-white">Algorithm Input</h3>
                    </div>
                    <button 
                      onClick={() => setView("projects")}
                      className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3 h-3" /> Back to Projects
                    </button>
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Niche / Main Topic *</label>
                       <div className="relative">
                          <input 
                            type="text" 
                            className="niche-input" 
                            placeholder="e.g. Minimalist Travel, Crypto Analysis..."
                            value={prefs.niche}
                            onChange={e => setPrefs({...prefs, niche: e.target.value})}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-brand text-white text-[9px] font-bold rounded">AI ENGINE</div>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Audience</label>
                        <input 
                          className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-sm" 
                          placeholder="e.g. Gen Z Creators"
                          value={prefs.audience}
                          onChange={e => setPrefs({...prefs, audience: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Content Style</label>
                        <select 
                          className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none"
                          value={prefs.style}
                          onChange={e => setPrefs({...prefs, style: e.target.value as ContentStyle})}
                        >
                            {Object.values(ContentStyle).map((s, idx) => <option key={`style-${s}-${idx}`} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Main Goal</label>
                        <select 
                          className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none"
                          value={prefs.goal}
                          onChange={e => setPrefs({...prefs, goal: e.target.value as Goal})}
                        >
                            {Object.values(Goal).map((g, idx) => <option key={`goal-${g}-${idx}`} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Language</label>
                        <input 
                          list="language-options"
                          className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-sm" 
                          placeholder="Search or type language..."
                          value={prefs.language}
                          onChange={e => setPrefs({...prefs, language: e.target.value})}
                        />
                        <datalist id="language-options">
                          {LANGUAGES.map(lang => (
                            <option key={`lang-opt-${lang}`} value={lang} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={!prefs.niche}
                    className="w-full bg-brand text-white font-display font-extrabold text-base py-5 rounded-2xl hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(255,77,45,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <Sparkles className="w-5 h-5 fill-current" />
                    GENERATE VIRAL PLAN
                  </button>
                </div>

                <div className="text-center space-y-4 py-12">
                   <div className="flex justify-center text-gray-700">
                      <CalendarIcon className="w-12 h-12" />
                   </div>
                   <h3 className="font-display font-bold text-lg text-gray-400">Your content calendar is waiting...</h3>
                   <p className="text-gray-500 text-sm max-w-xs mx-auto">Fill in your details above to build a high-performance 30-day strategy.</p>
                </div>
              </motion.div>
            ) : isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center gap-6"
              >
                <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                <div className="text-center">
                  <h3 className="font-display font-bold text-xl text-white mb-2">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
                  <p className="text-gray-500 text-sm italic">AI is drafting your viral narrative...</p>
                </div>
              </motion.div>
            ) : calendar && (
              <motion.div 
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                {view === "dashboard" && calendar && (
                  <div className="space-y-10">
                    {/* Header */}
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                          Strategy Active
                        </div>
                        <h1 className="text-4xl font-display font-extrabold text-white italic tracking-tighter">
                          {prefs.niche}
                        </h1>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={handleExport}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Strategy
                        </button>
                        <button className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                          Share Plan
                        </button>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-4 gap-4">
                      <ScoreCard label="Viral Potential" value={calendar.metrics.viralOpportunity} colorClass="text-brand" />
                      <ScoreCard label="Growth Index" value={calendar.metrics.growthPotential} colorClass="text-[#FF8C42]" />
                      <ScoreCard label="Monetization" value={calendar.metrics.monetizationScore} colorClass="text-[#7F77DD]" />
                      <ScoreCard label="Platform Lift" value="High" colorClass="text-[#EF9F27]" />
                    </div>

                    <div className="grid grid-cols-12 gap-8">
                       <div className="col-span-8 space-y-8">
                          <section>
                            <h4 className="font-display font-bold text-lg text-white mb-6">30-Day Strategy Breakdown</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {[
                                { title: "Week 1", subtitle: "Reach Growth", desc: calendar.weeklyStrategy.week1, color: "text-brand" },
                                { title: "Week 2", subtitle: "Subscriber Push", desc: calendar.weeklyStrategy.week2, color: "text-[#FF8C42]" },
                                { title: "Week 3", subtitle: "Viral Surge", desc: calendar.weeklyStrategy.week3, color: "text-[#7F77DD]" },
                                { title: "Week 4", subtitle: "Monetization", desc: calendar.weeklyStrategy.week4, color: "text-[#EF9F27]" },
                              ].map((w, i) => (
                                <div key={`pillar-${i}`} className="bg-[#141414] p-5 rounded-2xl border border-white/5">
                                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${w.color}`}>{w.title} // {w.subtitle}</div>
                                  <p className="text-sm text-gray-400 leading-relaxed font-light">{w.desc}</p>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section>
                            <h4 className="font-display font-bold text-lg text-white mb-6">Automation & Growth Hacks</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                                <RefreshCw className="absolute -right-4 -bottom-4 w-20 h-20 text-brand/5 group-hover:rotate-45 transition-transform" />
                                <h5 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-brand fill-current" /> Repurposing Plan
                                </h5>
                                <p className="text-xs text-gray-400 leading-relaxed italic line-clamp-4">{calendar.extraFeatures.repurposingTips}</p>
                              </div>
                              <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                                <TrendingUp className="absolute -right-4 -bottom-4 w-20 h-20 text-emerald-500/5 group-hover:scale-110 transition-transform" />
                                <h5 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                                  <Rocket className="w-4 h-4 text-emerald-500" /> Viral Reuse
                                </h5>
                                <p className="text-xs text-gray-400 leading-relaxed italic line-clamp-4">{calendar.extraFeatures.reuseViralContent}</p>
                              </div>
                            </div>
                          </section>
                       </div>

                       <div className="col-span-4 space-y-8">
                          <section>
                            <h4 className="font-display font-bold text-lg text-white mb-6">Content Pillars</h4>
                            <div className="space-y-3">
                              {calendar.contentPillars.map((p, i) => (
                                <div key={`guideline-${i}`} className="group bg-[#141414] p-4 rounded-xl border border-white/5 hover:border-brand/30 transition-all">
                                   <div className="flex items-center gap-3 mb-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                                      <h5 className="font-bold text-[13px] text-white italic">{p.title}</h5>
                                   </div>
                                   <p className="text-[11px] text-gray-500 leading-relaxed">{p.description}</p>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section>
                              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 space-y-4">
                                <h4 className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest flex items-center gap-2">
                                  Recovery Protocol
                                </h4>
                                <p className="text-[11px] text-gray-500 italic">"If performance stals: {calendar.extraFeatures.recoveryPlan}"</p>
                              </div>
                          </section>
                       </div>
                    </div>
                  </div>
                )}

                {view === "calendar" && calendar && (
                   <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h2 className="text-2xl font-display font-extrabold text-white tracking-tight uppercase italic">Live Content Matrix</h2>
                       <div className="flex items-center gap-4">
                          <button 
                            onClick={() => {
                              if (plans.length === 0) {
                                alert("Please create a Growth Plan first in the 'Plan' section.");
                                return;
                              }
                              setSelectedPlanForAdd(plans[0].id);
                              setPlanPickerOpen(true);
                            }}
                            className="px-4 py-2 bg-brand/10 border border-brand/20 text-brand font-bold rounded-xl hover:bg-brand/20 transition-all uppercase tracking-widest text-[10px] flex items-center gap-2"
                          >
                            <PlusCircle className="w-4 h-4" /> Add to Plan
                          </button>
                          <div className="flex gap-2">
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> YouTube
                             </div>
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Facebook
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#141414] border border-white/5 rounded-3xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-6 py-4 w-10">
                              <input 
                                type="checkbox" 
                                checked={calendar.calendar.length > 0 && markedIdeas.length === calendar.calendar.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const allDays = calendar.calendar.map(i => i.day);
                                    setMarkedIdeas(Array.from(new Set(allDays)));
                                  }
                                  else setMarkedIdeas([]);
                                }}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 accent-brand cursor-pointer"
                              />
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Day</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Format</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Viral Concept</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">3s Hook</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Score</th>
                            <th className="px-6 py-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {calendar.calendar.map((item, i) => (
                            <tr key={`idea-row-calendar-${item.day}-${i}`} className={`group hover:bg-white/[0.02] transition-colors ${markedIdeas.includes(item.day) ? 'bg-brand/5' : ''}`}>
                              <td className="px-6 py-6 border-r border-white/5">
                                <input 
                                  type="checkbox" 
                                  checked={markedIdeas.includes(item.day)}
                                  onChange={() => {
                                    setMarkedIdeas(prev => 
                                      prev.includes(item.day) 
                                      ? prev.filter(id => id !== item.day) 
                                      : [...prev, item.day]
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-white/10 bg-white/5 accent-brand cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-6 transition-transform group-hover:translate-x-1">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display font-extrabold text-brand italic">
                                  {item.day}
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                     <div className={`w-1.5 h-1.5 rounded-full ${item.platform === Platform.YOUTUBE ? 'bg-red-500' : 'bg-blue-500'}`} />
                                     <span className="text-[10px] font-bold uppercase text-gray-300">{item.platform}</span>
                                  </div>
                                  <span className="text-[11px] text-gray-600 bg-white/5 px-2 py-0.5 rounded self-start truncate max-w-[100px]">{item.videoType}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <h5 className="text-sm font-bold text-white group-hover:text-brand transition-colors italic">{item.title}</h5>
                                <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-light">CTA: {item.cta}</p>
                              </td>
                              <td className="px-6 py-6 border-x border-white/5">
                                <p className="text-[12px] text-gray-400 italic max-w-[180px] font-light leading-snug">"{item.hook}"</p>
                              </td>
                              <td className="px-6 py-6">
                                <span className={`text-[13px] font-bold font-display ${item.viralScore > 85 ? 'text-brand' : 'text-accent'}`}>{item.viralScore}%</span>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <button 
                                  onClick={() => setSelectedDay(item.day)}
                                  className="p-2 rounded-lg bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-brand/10 hover:border-brand/30"
                                >
                                  <ChevronRight className="w-4 h-4 text-brand" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {markedIdeas.length > 0 && (
                      <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-brand/30 px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-8 backdrop-blur-xl"
                      >
                        <div className="flex items-center gap-3 pr-8 border-r border-white/10">
                          <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
                            <span className="text-brand font-black text-sm">{markedIdeas.length}</span>
                          </div>
                          <span className="text-xs font-bold text-white uppercase tracking-widest">Marked Ideas</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => {
                              if (plans.length === 0) {
                                alert("Please create a Growth Plan first in the 'Plan' section.");
                                return;
                              }
                              setSelectedPlanForAdd(plans[0].id);
                              setPlanPickerOpen(true);
                            }}
                            className="px-6 py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
                          >
                            <PlusCircle className="w-4 h-4" /> Batch Add to Plan
                          </button>
                          <button 
                            onClick={() => setMarkedIdeas([])}
                            className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {view === "plan" && (
                  <div className="space-y-8">
                    {!selectedPlan ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Growth Plans</h2>
                            <p className="text-gray-500 text-sm">Long-term strategy and planning.</p>
                          </div>
                          <button 
                            onClick={() => {
                              setNewPlanName("My Roadmap");
                              setNewPlanMonths(12);
                              setNewPlanProjectId("");
                              setNewPlanStartMonth(1);
                              setNewPlanModalOpen(true);
                            }}
                            className="px-6 py-3 bg-brand text-white font-bold rounded-2xl flex items-center gap-2 hover:opacity-90 transition-opacity"
                          >
                            <PlusCircle className="w-5 h-5" /> New Plan
                          </button>
                        </div>

                        {plans.length === 0 ? (
                          <div className="py-20 text-center space-y-4">
                            <Target className="w-16 h-16 text-gray-800 mx-auto" />
                            <h3 className="text-xl font-bold text-gray-500">No plans yet.</h3>
                            <p className="text-gray-600 text-sm">Create a long-term roadmap for your content.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map((plan, i) => (
                              <motion.div 
                                key={`plan-card-main-${plan.id}-${i}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedPlan(plan)}
                                className="bg-[#141414] border border-white/5 p-6 rounded-3xl cursor-pointer group hover:border-brand/40 transition-all flex flex-col justify-between h-[200px]"
                              >
                                <div>
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                                      <Target className="w-5 h-5 text-gray-500 group-hover:text-brand" />
                                    </div>
                                    <button 
                                      onClick={(e) => deletePlan(plan.id, e)}
                                      className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                  <h4 className="text-xl font-display font-bold text-white italic truncate leading-tight">{plan.name}</h4>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                                    {plan.months} Months
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                                    {new Date(plan.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex justify-between items-center">
                          <button 
                            onClick={() => setSelectedPlan(null)}
                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Back to List</span>
                          </button>
                          <div className="text-right">
                            <h2 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter leading-none mb-1">{selectedPlan.name}</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedPlan.months} MONTH ROADMAP</p>
                          </div>
                        </div>

                        <div className="flex gap-8 overflow-x-auto pb-12 custom-scrollbar">
                          {Array.from({ length: selectedPlan.months }).map((_, mIndex) => (
                            <div key={`roadmap-month-${mIndex}`} className="min-w-[400px] max-w-[400px] bg-bg-secondary border border-border-subtle rounded-[40px] p-8 flex flex-col shadow-2xl shadow-black/10 transition-colors">
                              <div className="flex justify-between items-start mb-8 sticky top-0 bg-bg-secondary/90 backdrop-blur-md py-2 z-10">
                                <div className="flex flex-col">
                                  <h3 className="text-4xl font-display font-black text-brand italic uppercase tracking-tighter leading-none">
                                    Month {mIndex + 1}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-3">
                                    {selectedPlan.assignments?.find(a => a.month === mIndex + 1) && (
                                      <div className="flex items-center gap-2 px-3 py-1 bg-brand/5 border border-brand/10 rounded-full w-fit">
                                        <Folder className="w-3 h-3 text-brand" />
                                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                          {selectedPlan.assignments.find(a => a.month === mIndex + 1)?.projectName}
                                        </span>
                                      </div>
                                    )}
                                    <button 
                                      onClick={() => {
                                        if (selectedPlan.months > 1) {
                                          deleteMonthFromPlan(selectedPlan.id, mIndex);
                                        } else {
                                          alert("A roadmap must have at least one month.");
                                        }
                                      }}
                                      className="p-1 px-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-1 group"
                                      title="Delete Month"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Remove</span>
                                    </button>
                                  </div>
                                </div>
                                <span className="text-[10px] text-text-secondary font-black tracking-[0.2em] uppercase">Stage {mIndex + 1}</span>
                              </div>

                              <div className="grid grid-cols-5 gap-3">
                                {Array.from({ length: 30 }).map((_, dIndex) => {
                                  const dayNum = mIndex * 30 + dIndex + 1;
                                  const dayDate = new Date(selectedPlan.startDate);
                                  dayDate.setDate(dayDate.getDate() + dayNum - 1);
                                  const dateStr = dayDate.toISOString().split('T')[0];
                                  
                                  const currentPlan = plans.find(p => p.id === selectedPlan.id);
                                  const dayData = currentPlan?.days.find(d => d.date === dateStr);
                                  const hasContent = dayData?.title && dayData.title.trim() !== "";

                                  return (
                                    <button 
                                      key={`roadmap-day-${dayNum}-${dateStr}`}
                                      onClick={() => {
                                        if (!hasContent && markedIdeas.length > 0) {
                                          setTargetPlanDay({ planId: selectedPlan.id, date: dateStr });
                                          setIsPickingIdea(true);
                                          return;
                                        }

                                        // Find which month this day belongs to (1-indexed)
                                        const monthIdx = Math.floor((dayNum - 1) / 30);
                                        const monthNum = monthIdx + 1;
                                        const assignment = selectedPlan.assignments?.find(a => a.month === monthNum);
                                        
                                        if (assignment) {
                                          const project = projects.find(p => p.id === assignment.projectId);
                                          if (project) {
                                            loadProject(project, "plan");
                                            // Set day relative to month (1-30)
                                            setSelectedDay(((dayNum - 1) % 30) + 1);
                                            return;
                                          }
                                        }
                                        
                                        // If no assignment, just set absolute day (though details might not show without project calendar)
                                        setSelectedDay(dayNum);
                                      }}
                                      className={`aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 group relative ${
                                        hasContent 
                                        ? 'bg-brand/10 border-brand/30 text-text-primary shadow-lg shadow-brand/5' 
                                        : 'bg-bg-primary border-border-subtle text-text-secondary hover:border-brand/20'
                                      }`}
                                    >
                                      <span className={`text-[10px] font-black italic transition-colors ${hasContent ? 'text-brand' : 'text-text-secondary group-hover:text-brand'}`}>
                                        {dayNum}
                                      </span>
                                      {hasContent && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(255,77,45,0.8)]" />
                                      )}
                                      
                                      {/* Hover Preview Overlay */}
                                      {hasContent && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-bg-secondary border border-border-subtle rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-2xl scale-95 group-hover:scale-100 origin-bottom">
                                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Day {dayNum} Insight</p>
                                          <p className="text-xs text-text-primary font-medium line-clamp-3 leading-relaxed">{dayData.title}</p>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="mt-8 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">
                                  <span>Efficiency Level</span>
                                  <span className="text-brand">High Velocity</span>
                                </div>
                                <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand w-[75%] rounded-full shadow-[0_0_8px_rgba(255,77,45,0.4)]" />
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Month Option */}
                          <div key="roadmap-add-month-container" className="flex items-center">
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setAddMonthModalOpen(true)}
                              className="min-w-[400px] h-[500px] bg-white/5 border border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-6 hover:bg-brand/5 hover:border-brand/30 transition-all group"
                            >
                              <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-brand/5">
                                 <Plus className="w-8 h-8 text-brand" />
                              </div>
                              <div className="text-center">
                                 <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">Add Month</h3>
                                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Scale your content roadmap</p>
                              </div>
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {view === "analytics" && calendar && (
                   <div className="space-y-8">
                     <div className="p-8 bg-[#141414] rounded-3xl border border-white/5 relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-12 gap-8">
                           <div className="col-span-7">
                              <h3 className="text-2xl font-black text-white italic mb-6 uppercase tracking-tight">Performance Prediction</h3>
                              <div className="space-y-6">
                                <AnalyticsRow label="Peak Viral Content" value={calendar.analytics.bestExpectedVideo} icon={Sparkles} />
                                <AnalyticsRow label="Highest Engagement Trigger" value={calendar.analytics.highestCtrTopic} icon={Target} />
                                <AnalyticsRow label="Retention Sweetspot" value={calendar.analytics.bestRetentionTopic} icon={Users} />
                                <AnalyticsRow label="Monetization Engine" value={calendar.analytics.bestMonetizationTopic} icon={Rocket} />
                              </div>
                           </div>
                           <div className="col-span-5 flex flex-col justify-center items-center p-8 bg-brand/5 border border-brand/10 rounded-[32px]">
                              <BarChart3 className="w-20 h-20 text-brand mb-4 opacity-50" />
                              <h4 className="text-lg font-bold text-white mb-2">Data Integrity: 98.4%</h4>
                              <p className="text-xs text-gray-500 text-center">Your plan is cross-referenced with 2.4B viral data points from 2024-2026 platform cycles.</p>
                           </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        <div className="p-8 bg-[#141414] rounded-3xl border border-white/5 h-[400px]">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Viral Score Momentum (30 Days)</h4>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={calendar.calendar.map(d => ({ day: d.day, score: d.viralScore }))}>
                                <defs>
                                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF4D2D" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#FF4D2D" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                  itemStyle={{ color: '#FF4D2D' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#FF4D2D" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="p-8 bg-[#141414] rounded-3xl border border-white/5 h-[400px]">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Engagement vs Platform Strength</h4>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={calendar.calendar.slice(0, 10).map(d => ({ day: d.day, score: d.viralScore }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                />
                                <Bar dataKey="score" fill="#00C896" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                   </div>
                )}

                {view === "scripts" && (
                    <div className="space-y-8">
                       {!editingScript ? (
                         <>
                           <div className="flex justify-between items-center">
                              <div>
                                <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Your Scripts</h2>
                                <p className="text-gray-500 text-sm">Review your generated video scripts.</p>
                              </div>
                           </div>

                           {scripts.length === 0 ? (
                             <div className="py-20 text-center space-y-4">
                                <Video className="w-16 h-16 text-gray-800 mx-auto" />
                                <h3 className="text-xl font-bold text-gray-500">No scripts yet.</h3>
                                <p className="text-gray-600 text-sm">Generate a full script from your calendar to see it here.</p>
                             </div>
                           ) : (
                             <div className="grid grid-cols-1 gap-6">
                          {scripts.map((script, i) => (
                                 <motion.div 
                                   key={`script-card-main-${script.id}-${i}`}
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   className="bg-[#141414] border border-white/5 p-6 rounded-3xl group hover:border-brand/40 transition-all"
                                 >
                                   <div className="flex justify-between items-start mb-4">
                                     <div 
                                       className="cursor-pointer flex-1"
                                       onClick={() => setEditingScript(script)}
                                     >
                                       <div className="flex items-center gap-2 mb-1">
                                          <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] font-bold rounded uppercase tracking-widest">Day {script.day}</span>
                                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(script.createdAt).toLocaleDateString()}</span>
                                       </div>
                                       <h4 className="text-xl font-display font-bold text-white italic truncate">{script.title}</h4>
                                     </div>
                                     <div className="flex gap-2 relative z-10">
                                       <button 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           copyToClipboard(script.content);
                                         }}
                                         className="p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-brand transition-all uppercase tracking-widest cursor-pointer"
                                       >
                                         Copy
                                       </button>
                                       <button 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           deleteScript(script.id);
                                         }}
                                         className="p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-red-500 transition-all uppercase tracking-widest cursor-pointer"
                                       >
                                         Delete
                                       </button>
                                     </div>
                                   </div>
                                   <div 
                                     onClick={() => setEditingScript(script)}
                                     className="p-4 bg-black/30 border border-white/5 rounded-xl text-xs text-gray-400 font-mono line-clamp-3 whitespace-pre-wrap cursor-pointer"
                                   >
                                     {script.content}
                                   </div>
                                 </motion.div>
                               ))}
                             </div>
                           )}
                         </>
                       ) : (
                         <div className="space-y-6">
                           <div className="flex justify-between items-center">
                             <button 
                               onClick={() => setEditingScript(null)}
                               className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
                             >
                               <ChevronLeft className="w-4 h-4" />
                               <span className="text-xs font-bold uppercase tracking-widest">Back to List</span>
                             </button>
                             <div className="flex gap-4">
                               <button 
                                 onClick={() => copyToClipboard(editingScript.content)}
                                 className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-brand transition-all uppercase tracking-widest"
                               >
                                 Copy Content
                               </button>
                               <button 
                                 onClick={updateScript}
                                 className="px-6 py-2 bg-brand text-white rounded-xl text-[10px] font-bold hover:opacity-90 transition-all uppercase tracking-widest shadow-lg shadow-brand/20"
                               >
                                 Update Script
                               </button>
                             </div>
                           </div>

                           <div className="p-8 bg-[#141414] border border-white/5 rounded-[40px] space-y-6">
                             <div>
                               <div className="flex items-center gap-3 mb-2">
                                 <span className="px-3 py-1 bg-brand text-white text-[10px] font-black rounded italic italic tracking-tighter uppercase">Day {editingScript.day}</span>
                                 <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Editing Mode</span>
                               </div>
                               <input 
                                 type="text"
                                 value={editingScript.title}
                                 onChange={(e) => setEditingScript({...editingScript, title: e.target.value})}
                                 className="w-full bg-transparent text-3xl font-display font-black text-white italic uppercase tracking-tighter border-none outline-none focus:ring-0"
                               />
                             </div>

                             <textarea 
                               className="w-full h-[600px] bg-black/40 border border-white/5 rounded-2xl p-6 text-sm text-gray-300 font-mono leading-relaxed outline-none focus:border-brand/40 transition-colors resize-none"
                               value={editingScript.content}
                               onChange={(e) => setEditingScript({...editingScript, content: e.target.value})}
                               placeholder="Start writing your script here..."
                             />
                           </div>
                         </div>
                       )}
                    </div>
                 )}                 {view === "projects" && (
                   <div className="space-y-8">
                     <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Your Projects</h2>
                          <p className="text-gray-500 text-sm">Browse your saved viral content strategies.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setCalendar(null);
                            setView("dashboard");
                          }}
                          className="px-6 py-3 bg-brand text-white font-bold rounded-2xl flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          <PlusCircle className="w-5 h-5" /> New Strategy
                        </button>
                     </div>

                     {projects.length === 0 ? (
                       <div className="py-20 text-center space-y-4">
                          <Folder className="w-16 h-16 text-gray-800 mx-auto" />
                          <h3 className="text-xl font-bold text-gray-500">No projects yet.</h3>
                          <p className="text-gray-600 text-sm">Generate your first content calendar to see it here.</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 gap-6">
                        {projects.map((project, i) => (
                           <motion.div 
                             key={`project-card-main-${project.id}-${i}`}
                             whileHover={{ scale: 1.02 }}
                             onClick={() => loadProject(project)}
                             className="bg-[#141414] border border-white/5 p-6 rounded-3xl cursor-pointer group hover:border-brand/40 transition-all relative"
                           >
                             <div className="flex justify-between items-start mb-6">
                               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                                 <Folder className="w-6 h-6 text-gray-500 group-hover:text-brand" />
                               </div>
                               <div className="flex gap-1">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     loadProject(project, "dashboard");
                                   }}
                                   className="p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-brand hover:border-brand/30 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest"
                                 >
                                   Dashboard
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     loadProject(project, "calendar");
                                   }}
                                   className="p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-brand hover:border-brand/30 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest"
                                 >
                                   Calendar
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     loadProject(project, "analytics");
                                   }}
                                   className="p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-brand hover:border-brand/30 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest"
                                 >
                                   Analytics
                                 </button>
                                 <button 
                                   onClick={(e) => deleteProject(project.id, e)}
                                   className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                   Delete
                                 </button>
                               </div>
                             </div>
                             <h4 className="text-xl font-display font-bold text-white italic mb-1 truncate">{project.name}</h4>
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-4">
                               Created: {new Date(project.createdAt).toLocaleDateString()}
                             </span>
                             <div className="flex gap-2">
                               <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] font-bold rounded uppercase tracking-widest">
                                 {project.preferences.style}
                               </span>
                               <span className="px-2 py-0.5 bg-white/5 text-gray-500 text-[9px] font-bold rounded uppercase tracking-widest">
                                 {project.calendar.metrics.viralOpportunity} Viral Score
                               </span>
                             </div>
                           </motion.div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                 {view === "settings" && (
                   <div className="max-w-2xl mx-auto space-y-8">
                     <div>
                       <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Settings</h2>
                       <p className="text-gray-500 text-sm">Manage your application data and preferences.</p>
                     </div>

                     <div className="bg-[#141414] border border-white/5 rounded-3xl p-8 space-y-8">
                        <div>
                          <h3 className="text-white font-bold mb-2">Danger Zone</h3>
                          <p className="text-xs text-gray-500 mb-6 font-bold uppercase tracking-widest">Permanently delete all your data</p>
                          
                          <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
                            <div className="flex items-start gap-4">
                               <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                  <Trash2 className="w-5 h-5 text-red-500" />
                               </div>
                               <div>
                                  <h4 className="text-white font-bold text-sm">Reset All Application Data</h4>
                                  <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                                    This action will wipe all your saved projects, long-term roadmaps, scripts, and initial preferences. This cannot be undone.
                                  </p>
                               </div>
                            </div>
                            
                            {!showResetConfirm ? (
                              <button 
                                onClick={() => setShowResetConfirm(true)}
                                className="w-full py-4 bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 italic"
                              >
                                Reset Everything
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <button 
                                  onClick={resetApp}
                                  className="py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 italic"
                                >
                                  Confirm Reset
                                </button>
                                <button 
                                  onClick={() => setShowResetConfirm(false)}
                                  className="py-4 bg-white/5 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-white/10 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                           <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-white font-bold text-sm">App Version</h4>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">v2.4.0 Viral Caly Engine</p>
                              </div>
                              <span className="px-2 py-1 bg-white/5 text-gray-500 text-[8px] font-black uppercase tracking-widest rounded">Stable Build</span>
                           </div>
                        </div>
                     </div>
                   </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal Backdrop */}
      <AnimatePresence>
        {activeDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedDay(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative z-50 bg-bg-secondary w-full max-w-2xl rounded-[32px] border border-border-subtle overflow-hidden shadow-2xl"
            >
               <div className="p-8 space-y-8">
                  <div className="flex justify-between items-start">
                     <div>
                        <div className="flex items-center gap-3 text-brand font-display font-black italic text-4xl mb-4">
                           DAY {activeDay.day}
                        </div>
                        <div className="flex gap-2">
                           <span className="px-2 py-0.5 bg-brand text-white text-[9px] font-bold rounded uppercase tracking-widest">{activeDay.platform}</span>
                           <span className="px-2 py-0.5 bg-white/10 text-gray-400 text-[9px] font-bold rounded uppercase tracking-widest whitespace-nowrap">{activeDay.videoType}</span>
                        </div>
                     </div>
                     <button 
                        onClick={() => setSelectedDay(null)}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                     >
                        <PlusCircle className="w-6 h-6 text-gray-500 rotate-45" />
                     </button>
                  </div>

                  <div className="space-y-6">
                     {scriptContent ? (
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Generated Full Script</h4>
                              <button 
                                 onClick={() => setScriptContent(null)}
                                 className="text-brand text-[10px] font-bold hover:underline"
                              >
                                 Back to Overview
                              </button>
                           </div>
                           <div className="p-6 bg-black/40 border border-white/10 rounded-2xl max-h-[400px] overflow-y-auto text-sm text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                              {scriptContent}
                           </div>
                           <button 
                              onClick={() => {
                                 if (scriptContent) copyToClipboard(scriptContent);
                              }}
                              className="w-full py-3 bg-brand text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                           >
                              Copy Script
                           </button>
                        </div>
                     ) : (
                        <>
                           <div>
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Viral Framework</h4>
                              <h3 className="text-2xl font-display font-extrabold text-white leading-tight italic underline decoration-brand/50 underline-offset-8">
                                 {activeDay.title}
                              </h3>
                           </div>

                           <div className="grid grid-cols-2 gap-6 pt-4">
                              <div className="space-y-2">
                                 <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">3-Sec Hook</h4>
                                 <div className="p-4 bg-brand/5 border border-brand/20 rounded-2xl italic text-brand text-sm leading-relaxed">
                                    "{activeDay.hook}"
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thumbnail Core</h4>
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white text-sm leading-relaxed">
                                    {activeDay.thumbnailText}
                                 </div>
                              </div>
                           </div>

                           <div className="p-6 bg-white/5 border border-white/5 rounded-[24px] space-y-4">
                              <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Viral Tags & SEO</h4>
                              <button 
                                 onClick={() => handleCopyTags(activeDay.hashtags)}
                                 className="bg-brand/10 text-brand text-[10px] font-black px-3 py-1 rounded-full hover:bg-brand hover:text-white transition-all uppercase tracking-widest"
                              >
                                 Copy All Tags
                              </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                 {activeDay.hashtags.map((tag, i) => (
                                 <span key={`hashtag-${tag}-${i}`} className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2 py-1 rounded-md font-medium">#{tag.replace(/^#/, '')}</span>
                                 ))}
                              </div>
                           </div>

                           <div>
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Strategy Brief</h4>
                              <p className="text-gray-400 text-sm leading-relaxed font-light">{activeDay.scriptOutline}</p>
                           </div>

                           <div className="p-6 bg-white/5 border border-white/5 rounded-[24px] space-y-4">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand" />
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Video Description</h4>
                                 </div>
                                 <button 
                                    onClick={() => copyToClipboard(activeDay.description || `${activeDay.title}\n\n${activeDay.hook}`)}
                                    className="bg-brand/10 text-brand text-[10px] font-black px-3 py-1 rounded-full hover:bg-brand hover:text-white transition-all uppercase tracking-widest"
                                 >
                                    Copy Description
                                 </button>
                              </div>
                              <div className="relative group">
                                 <div className="bg-white/5 border border-white/5 rounded-xl p-4 max-h-[150px] overflow-y-auto custom-scrollbar">
                                    <p className="text-xs text-gray-400 leading-relaxed font-mono italic">
                                       {activeDay.description || `${activeDay.title}\n\n${activeDay.hook}\n\n#${activeDay.hashtags.join(' #')}`}
                                    </p>
                                 </div>
                              </div>
                           </div>

                           <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-6">
                              <div>
                                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Viral Score</span>
                                 <span className="text-xl font-display font-extrabold text-brand italic">{activeDay.viralScore}%</span>
                              </div>
                              <div>
                                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Upload Slot</span>
                                 <span className="text-lg font-bold text-white">{activeDay.uploadTime}</span>
                              </div>
                              <div>
                                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Complexity</span>
                                 <span className="text-lg font-bold text-white">{activeDay.difficulty}</span>
                              </div>
                           </div>
                        </>
                     )}
                  </div>
               </div>
               
               {!scriptContent && (
                  <div className="bg-white/5 p-4 flex justify-between items-center px-8 border-t border-white/5">
                     <div className="flex gap-1.5">
                     </div>
                     <button 
                        disabled={generatingScript}
                        onClick={() => setScriptLangPickerItem(activeDay)}
                        className="text-brand text-[11px] font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                     >
                        {generatingScript ? (
                           <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                           </>
                        ) : (
                           <>
                              Generate Full Script <ChevronRight className="w-3 h-3" />
                           </>
                        )}
                     </button>
                  </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Language Picker Modal */}
      <AnimatePresence>
        {scriptLangPickerItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setScriptLangPickerItem(null)}
               className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative z-[101] bg-bg-secondary w-full max-w-sm rounded-3xl border border-border-subtle p-8 shadow-2xl text-center"
            >
               <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Globe className="w-8 h-8 text-brand" />
               </div>
               <h3 className="text-xl font-display font-black text-white italic uppercase tracking-tighter mb-2">Choose Language</h3>
               <p className="text-gray-500 text-xs mb-8 uppercase tracking-widest font-bold">How should the script be written?</p>
               
               <div className="space-y-3">
                 <button 
                   onClick={() => handleGenerateScript(scriptLangPickerItem)}
                   className="w-full py-4 bg-brand text-white text-xs font-black italic uppercase tracking-tighter rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 group shadow-lg shadow-brand/20"
                 >
                   Own Language ({prefs.language})
                   <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </button>
                 <button 
                   onClick={() => handleGenerateScript(scriptLangPickerItem, "English")}
                   className="w-full py-4 bg-white/5 border border-white/10 text-white text-xs font-black italic uppercase tracking-tighter rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
                 >
                   English
                   <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </button>
               </div>
            </motion.div>
          </div>
        )}
        <AnimatePresence>
          {isPickingIdea && calendar && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsPickingIdea(false);
                  setTargetPlanDay(null);
                }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative z-[201] bg-bg-secondary w-full max-w-xl rounded-[32px] border border-border-subtle p-8 shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">Select from Marked Ideas</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Pick an idea to assign to this roadmap slot</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsPickingIdea(false);
                      setTargetPlanDay(null);
                    }}
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <PlusCircle className="w-6 h-6 text-gray-500 rotate-45" />
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {markedIdeas.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                      <Sparkles className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No marked ideas yet</p>
                      <p className="text-[10px] text-gray-600 mt-1">Go to the Calendar view and mark your favorites first.</p>
                    </div>
                  ) : (
                    markedIdeas.map((id, idx) => {
                      const idea = calendar.calendar.find(i => i.day === id);
                      if (!idea) return null;
                      return (
                        <button 
                          key={`marked-idea-${id}-${idx}`} 
                          onClick={() => assignIdeaToPlanDay(id)}
                          className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-brand/10 hover:border-brand/30 transition-all group flex items-center gap-4"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-display font-black text-brand italic">
                            {idea.day}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white group-hover:text-brand transition-colors truncate">{idea.title}</h4>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{idea.hook}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-brand transition-all" />
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {newPlanModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => {
                setNewPlanModalOpen(false);
                setStagedMapping({});
                setSelectedIdeaForMapping(null);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#0D0D0D] border border-white/10 w-full max-w-[1200px] max-h-[90vh] rounded-[40px] shadow-2xl z-[111] grid grid-cols-12 overflow-hidden"
            >
              {/* Column 1: Day Mapping Grid (BAM PASE) */}
              <div className="col-span-12 lg:col-span-3 border-r border-white/5 bg-[#111111]/50 p-6 sm:p-8 overflow-y-auto custom-scrollbar order-2 lg:order-1">
                <div className="mb-6">
                  <h3 className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2">1. Select Destination</h3>
                  <p className="text-xl font-display font-black text-white italic uppercase leading-none">Day Mapping</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-2">Map month {newPlanStartMonth} roadmap</p>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const isMapped = stagedMapping[i];
                    return (
                      <button 
                        key={`modal-mapping-day-${i}`}
                        onClick={() => {
                          if (selectedIdeaForMapping !== null && newPlanProjectId) {
                            const project = projects.find(p => p.id === newPlanProjectId);
                            const idea = project?.calendar.calendar[selectedIdeaForMapping];
                            if (idea) {
                              setStagedMapping(prev => ({
                                ...prev,
                                [i]: { title: idea.title, hook: idea.hook }
                              }));
                            }
                          } else if (isMapped) {
                            const newMap = { ...stagedMapping };
                            delete newMap[i];
                            setStagedMapping(newMap);
                          }
                        }}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all group relative ${
                          isMapped 
                          ? 'bg-brand/10 border-brand/50 text-brand' 
                          : 'bg-white/5 border-white/5 text-gray-600 hover:border-white/20'
                        }`}
                      >
                        <span className="text-[10px] font-black">{i + 1}</span>
                        {isMapped && (
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-brand/20 backdrop-blur-sm rounded-xl text-red-500">
                              <Trash2 className="w-3 h-3" />
                           </div>
                        )}
                        {isMapped && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-brand" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Selected Item</span>
                   </div>
                   {selectedIdeaForMapping !== null ? (
                      <div className="p-3 bg-brand/10 rounded-xl border border-brand/20">
                         <p className="text-[10px] text-white font-black italic line-clamp-2">
                           {projects.find(p => p.id === newPlanProjectId)?.calendar.calendar[selectedIdeaForMapping].title}
                         </p>
                         <p className="text-[8px] text-brand font-bold uppercase mt-1">Ready to map</p>
                      </div>
                   ) : (
                      <p className="text-[9px] text-gray-700 italic">Select an idea on the right first...</p>
                   )}
                </div>
              </div>

              {/* Column 2: Plan Identity & Config (CENTER) */}
              <div className="col-span-12 lg:col-span-5 p-8 sm:p-10 flex flex-col bg-black overflow-y-auto custom-scrollbar order-1 lg:order-2">
                <div className="flex-1 space-y-10">
                  <header>
                    <h3 className="font-display font-black text-5xl sm:text-6xl text-white italic tracking-tighter uppercase leading-[0.8] mb-4">
                      Create<br/><span className="text-brand">Growth</span><br/>Plan
                    </h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-[320px]">
                      Build your roadmap by mapping strategic content to specific days.
                    </p>
                  </header>

                  <div className="space-y-8">
                    <div>
                      <div className="flex p-1 bg-white/10 rounded-2xl mb-6">
                        <button 
                          onClick={() => setNewPlanType("new")}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newPlanType === "new" ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-gray-300"}`}
                        >
                          New Roadmap
                        </button>
                        <button 
                          onClick={() => {
                            setNewPlanType("select");
                            if (plans.length > 0 && !targetExistingPlanId) setTargetExistingPlanId(plans[0].id);
                          }}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newPlanType === "select" ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-gray-500 hover:text-gray-300"}`}
                        >
                          Select Plan
                        </button>
                      </div>

                      {newPlanType === "new" ? (
                        <div className="space-y-6">
                           <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">1. Plan Identity</label>
                              <input 
                                type="text"
                                value={newPlanName}
                                onChange={(e) => setNewPlanName(e.target.value)}
                                className="w-full bg-[#141414] border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-brand/40 outline-none transition-all placeholder:text-gray-700"
                                placeholder="My Strategic Roadmap"
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">2. Roadmap Duration ({newPlanMonths} Months)</label>
                              <input 
                                type="range"
                                min="1"
                                max="12"
                                value={newPlanMonths}
                                onChange={(e) => setNewPlanMonths(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-white/5 rounded-full accent-brand appearance-none cursor-pointer"
                              />
                           </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Destination Plan</label>
                          <select
                            value={targetExistingPlanId}
                            onChange={(e) => setTargetExistingPlanId(e.target.value)}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-4 text-sm text-white focus:border-brand/40 outline-none transition-all appearance-none cursor-pointer"
                          >
                            {plans.length === 0 && <option value="">No plans created yet</option>}
                            {plans.map((p, i) => (
                              <option key={`plan-opt-modal-${p.id}-${i}`} value={p.id}>{p.name} ({p.months}m)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {newPlanProjectId && (
                      <div className="p-6 bg-[#111111] border border-white/5 rounded-[32px]">
                         <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-brand uppercase tracking-widest">3. Select Target Month</h4>
                         </div>
                         <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <button 
                                key={`nm-box-${i}`}
                                onClick={() => setNewPlanStartMonth(i + 1)}
                                disabled={newPlanType === "new" && i + 1 > newPlanMonths}
                                className={`h-10 rounded-xl border text-[10px] font-black transition-all ${
                                  newPlanStartMonth === i + 1 
                                  ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' 
                                  : 'bg-white/5 border-white/5 text-gray-600 hover:border-white/10 disabled:opacity-10'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-white/5 mt-8">
                  <button onClick={() => setNewPlanModalOpen(false)} className="flex-1 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                  <button 
                    onClick={() => {
                        if (newPlanType === "new") {
                            createPlan(newPlanName, newPlanMonths, newPlanProjectId || undefined, newPlanStartMonth, Object.keys(stagedMapping).length > 0 ? stagedMapping : undefined);
                        } else {
                            setAddMonthProjectId(newPlanProjectId);
                            addMonthToPlan(targetExistingPlanId);
                        }
                        setNewPlanModalOpen(false);
                    }}
                    className="flex-[2] bg-brand text-white font-black text-xs py-4 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-2 uppercase tracking-widest italic"
                  >
                    <PlusCircle className="w-5 h-5" /> Finalize Roadmap
                  </button>
                </div>
              </div>

              {/* Column 3: Project & Content Ideas (DAN SIDE) */}
              <div className="col-span-12 lg:col-span-4 border-l border-white/5 bg-[#111111]/30 flex flex-col h-full overflow-hidden order-3">
                <div className="p-8 border-b border-white/5">
                   <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">2. Pick Content Strategy</h3>
                   <div className="grid gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      <button 
                        onClick={() => {setNewPlanProjectId(""); setStagedMapping({});}}
                        className={`w-full px-5 py-4 rounded-2xl border text-left transition-all ${newPlanProjectId === "" ? 'bg-brand/10 border-brand text-brand' : 'bg-white/5 border-white/5 text-gray-600'}`}
                      >
                        <div className="font-black text-[10px] uppercase tracking-widest">Blank Roadmap</div>
                      </button>
                      {projects.map((project, i) => (
                        <button 
                          key={`np-proj-list-${project.id}-${i}`}
                          onClick={() => {setNewPlanProjectId(project.id); setStagedMapping({}); setSelectedIdeaForMapping(null);}}
                          className={`w-full px-5 py-4 rounded-2xl border text-left transition-all ${newPlanProjectId === project.id ? 'bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10' : 'bg-white/5 border-white/5 text-gray-600'}`}
                        >
                          <div className="font-black text-[10px] truncate uppercase tracking-widest">{project.name}</div>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-[#080808]">
                   {newPlanProjectId ? (
                      <>
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Strategy Item</h4>
                           <button onClick={() => {
                               const project = projects.find(p => p.id === newPlanProjectId);
                               if (project?.calendar) {
                                  const newMap: Record<number, any> = {};
                                  project.calendar.calendar.forEach((item, idx) => { if (idx < 30) newMap[idx] = { title: item.title, hook: item.hook }; });
                                  setStagedMapping(newMap);
                               }
                           }} className="text-[9px] font-bold text-brand uppercase hover:underline">Auto-Fill All</button>
                        </div>
                        <div className="grid gap-2">
                          {projects.find(p => p.id === newPlanProjectId)?.calendar.calendar.map((item, idx) => (
                            <button 
                              key={`modal-idea-list-${idx}`}
                              onClick={() => setSelectedIdeaForMapping(idx)}
                              className={`w-full px-4 py-3 rounded-2xl border text-left transition-all group ${selectedIdeaForMapping === idx ? 'bg-brand border-brand text-white shadow-xl shadow-brand/30 scale-[1.02]' : 'bg-[#141414] border-white/5 hover:border-white/20'}`}
                            >
                               <div className="flex justify-between items-center mb-1.5">
                                  <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${selectedIdeaForMapping === idx ? 'bg-white/20' : 'bg-white/5 text-gray-500'}`}>D{item.day}</span>
                                  {Object.values(stagedMapping).some((m: any) => m.title === item.title) && (
                                     <div className="flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5 text-brand" />
                                        <span className="text-[7px] font-bold text-brand uppercase">Mapped</span>
                                     </div>
                                  )}
                               </div>
                               <h5 className={`text-[12px] font-bold italic leading-tight ${selectedIdeaForMapping === idx ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                 {truncateText(item.title, 35)}
                               </h5>
                            </button>
                          ))}
                        </div>
                      </>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20"><Sparkles className="w-12 h-12 mb-4 text-brand" /><p className="text-xs font-bold uppercase tracking-widest">Select project<br/>to start mapping</p></div>
                   )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {addMonthModalOpen && selectedPlan && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setAddMonthModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#111111] border border-white/10 w-full max-w-lg rounded-3xl p-8 shadow-2xl z-[111]"
            >
              <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter mb-6">Assign Strategy to Month {selectedPlan.months + 1}</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Select Initial Strategy (Optional)</label>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1 flex-nowrap overflow-x-hidden">
                    <button 
                      onClick={() => setAddMonthProjectId("")}
                      className={`w-full px-5 py-3 rounded-2xl border text-left transition-all ${
                        addMonthProjectId === "" 
                        ? 'bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10' 
                        : 'bg-[#1A1A1A] border-white/5 text-gray-500 hover:border-white/20'
                      }`}
                    >
                      <div className="font-bold text-xs truncate uppercase tracking-tight">Empty / No Project</div>
                      <div className="text-[9px] opacity-60 font-bold italic lowercase">start with a blank slate</div>
                    </button>
                    {projects.map((project, i) => (
                      <button 
                        key={`add-month-proj-${project.id}-${i}`}
                        onClick={() => setAddMonthProjectId(project.id)}
                        className={`w-full px-5 py-3 rounded-2xl border text-left transition-all ${
                          addMonthProjectId === project.id 
                          ? 'bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10' 
                          : 'bg-[#1A1A1A] border-white/5 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-xs truncate uppercase tracking-tight">{project.name}</div>
                        <div className="text-[9px] opacity-60 font-bold uppercase tracking-widest">{project.preferences.style}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setAddMonthModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => addMonthToPlan(selectedPlan.id)}
                    className="flex-[2] px-6 py-4 rounded-2xl bg-brand text-white font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
                  >
                    <PlusCircle className="w-4 h-4" /> Confirm & Scale
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {planPickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPlanPickerOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#111111] border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl z-[101]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">Add to Plan</h3>
                <button 
                  onClick={() => setPlanPickerOpen(false)}
                  className="text-gray-500 hover:text-white"
                >
                   <PlusCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">1. Select Destination Plan</label>
                    <div className="grid gap-2 max-h-[140px] overflow-y-auto pr-1 flex-nowrap overflow-x-hidden">
                      {plans.map((plan, i) => (
                        <button 
                          key={`plan-picker-item-${plan.id}-${i}`}
                          onClick={() => setSelectedPlanForAdd(plan.id)}
                        className={`w-full px-5 py-3 rounded-2xl border text-left transition-all ${
                          selectedPlanForAdd === plan.id 
                          ? 'bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10' 
                          : 'bg-[#1A1A1A] border-white/5 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-xs truncate uppercase tracking-tight">{plan.name}</div>
                        <div className="text-[9px] opacity-60 font-bold">{plan.months} MONTH ROADMAP</div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPlanForAdd && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">2. Choose Start Month & Day</label>
                    <div className="flex flex-col gap-4">
                      {/* Month Selector */}
                      <div className="grid grid-cols-4 gap-2">
                        {(() => {
                           const plan = plans.find(p => p.id === selectedPlanForAdd);
                           return Array.from({ length: plan?.months || 0 }).map((_, i) => {
                            const monthNum = i + 1;
                            const startDayOfM = (monthNum - 1) * 30 + 1;
                            const endDayOfM = monthNum * 30;
                            const isMonthMostlyOccupied = plan?.days.some(day => {
                              const planStart = new Date(plan.startDate).getTime();
                              const dayDate = new Date(day.date).getTime();
                              const dNum = Math.floor((dayDate - planStart) / (1000 * 60 * 60 * 24)) + 1;
                              return dNum >= startDayOfM && dNum <= endDayOfM && day.title.trim() !== "";
                            });

                            return (
                              <button 
                                key={`month-picker-btn-${selectedPlanForAdd}-${i}`}
                                onClick={() => setSelectedMonthForAdd(monthNum)}
                                className={`flex flex-col items-center justify-center py-3 rounded-xl border relative transition-all ${
                                  selectedMonthForAdd === monthNum 
                                  ? 'bg-brand text-white border-brand font-black' 
                                  : isMonthMostlyOccupied
                                    ? 'bg-brand/5 border-brand/20 text-brand/60'
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70 leading-none mb-1">M</span>
                                <span className="text-sm font-display font-black leading-none">{monthNum}</span>
                                {isMonthMostlyOccupied && (
                                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-brand rounded-full" />
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* Day Selector (1-30) */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Start on Day {selectedDayForAdd} of Month {selectedMonthForAdd}</span>
                        </div>
                        <div className="grid grid-cols-10 gap-1.5">
                          {(() => {
                             const plan = plans.find(p => p.id === selectedPlanForAdd);
                             return Array.from({ length: 30 }).map((_, i) => {
                              const dayNum = i + 1;
                              const absoluteDay = (selectedMonthForAdd - 1) * 30 + dayNum;
                              const d = new Date(plan?.startDate || '');
                              d.setDate(d.getDate() + absoluteDay - 1);
                              const dateStr = d.toISOString().split('T')[0];
                              const isDayOccupied = plan?.days.some(day => day.date === dateStr && day.title.trim() !== "");

                              return (
                                <button 
                                  key={`day-picker-btn-${selectedPlanForAdd}-${selectedMonthForAdd}-${i}`}
                                  onClick={() => setSelectedDayForAdd(dayNum)}
                                  className={`flex items-center justify-center h-8 rounded-lg border text-[10px] font-black transition-all ${
                                    selectedDayForAdd === dayNum 
                                    ? 'bg-brand text-white border-brand scale-110 z-10' 
                                    : isDayOccupied
                                      ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                      : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'
                                  }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    {plans.find(p => p.id === selectedPlanForAdd)?.days.some(day => {
                        const plan = plans.find(p => p.id === selectedPlanForAdd);
                        const startAbsDay = (selectedMonthForAdd - 1) * 30 + selectedDayForAdd;
                        const planStart = new Date(plan!.startDate).getTime();
                        const dayDate = new Date(day.date).getTime();
                        const dNum = Math.floor((dayDate - planStart) / (1000 * 60 * 60 * 24)) + 1;
                        
                        // Check if this day is within the 30 day range we're about to add
                        const rangeSize = markedIdeas.length > 0 ? markedIdeas.length : 30;
                        return dNum >= startAbsDay && dNum < startAbsDay + rangeSize && day.title.trim() !== "";
                    }) && (
                        <p className="text-[10px] text-red-500 mt-3 font-bold italic line-clamp-2">* Some selected days already have a content strategy. Overwriting common for individual adds but blocked for batch.</p>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    onClick={addCalendarToPlan}
                    disabled={!selectedPlanForAdd || plans.find(p => p.id === selectedPlanForAdd)?.days.some(day => {
                        const plan = plans.find(p => p.id === selectedPlanForAdd);
                        const startDay = (selectedMonthForAdd - 1) * 30 + 1;
                        const endDay = selectedMonthForAdd * 30;
                        const planStart = new Date(plan!.startDate).getTime();
                        const dayDate = new Date(day.date).getTime();
                        const dNum = Math.floor((dayDate - planStart) / (1000 * 60 * 60 * 24)) + 1;
                        return dNum >= startDay && dNum <= endDay && day.title.trim() !== "";
                    })}
                    className="w-full py-5 rounded-2xl bg-brand text-white font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-xl shadow-brand/20 disabled:opacity-50"
                  >
                    <Target className="w-5 h-5 pointer-events-none" />
                    Deploy to Strategy
                  </button>
                  <button 
                    onClick={() => setPlanPickerOpen(false)}
                    className="w-full mt-3 py-3 text-[10px] font-bold text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Assistant Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setChatOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-brand rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center text-white z-[90] border-4 border-[#0A0A0A]"
      >
        <Sparkles className="w-8 h-8" />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
            <span className="text-[8px] font-black italic">AI</span>
        </div>
      </motion.button>

      {/* AI Assistant Sidebar */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0F0F0F] border-l border-white/5 shadow-2xl z-[1001] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-brand/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
                    <Bot className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black text-white italic uppercase tracking-tighter">AI Assistant</h3>
                    <p className="text-[10px] text-brand font-bold uppercase tracking-widest">Strategy & Script Expert</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A]/50">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                       <MessageSquare className="w-8 h-8 text-gray-600" />
                    </div>
                    <h4 className="text-white font-bold uppercase tracking-tight">How can I help you today?</h4>
                    <p className="text-xs text-gray-500 max-w-[240px]">
                      Ask me to write a script for Month 2, or generate a 5-day viral challenge strategy.
                    </p>
                    <div className="grid gap-2 w-full pt-4">
                        {[
                            "Write a script for Day 15",
                            "Give me 5 viral hooks for my niche",
                            "Help me scale Month 3 with ads strategy",
                            "Summarize my content roadmap"
                        ].map(suggestion => (
                            <button 
                                key={`chat-suggestion-${suggestion}`}
                                onClick={() => setChatInput(suggestion)}
                                className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:bg-brand/5 hover:border-brand/20 hover:text-brand transition-all text-left"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={`${msg.id}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl ${
                        msg.role === "user" 
                        ? "bg-brand text-white font-medium rounded-tr-none shadow-lg shadow-brand/10" 
                        : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-brand animate-spin" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Assistant is thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-[#0F0F0F]">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    className="flex items-center gap-2"
                >
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your strategic request..."
                    className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:border-brand/40 outline-none transition-all placeholder:text-gray-600"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
                <div className="mt-4 flex justify-center">
                    <p className="text-[8px] text-gray-700 font-black uppercase tracking-[0.3em]">Viral AI Engine • Gemini 3 powered</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#0F0F0F] border border-white/10 w-full max-w-lg rounded-[40px] p-10 shadow-2xl shadow-black/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand/10 rounded-full -mr-24 -mt-24 blur-3xl p-10" />
              
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-4xl font-display font-black text-white italic uppercase tracking-tighter leading-none mb-2">My Profile</h3>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.25em]">Warrior Identity Dashboard</p>
                </div>
                <button 
                  onClick={() => setProfileModalOpen(false)} 
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateProfile({
                  full_name: formData.get('full_name'),
                  bio: formData.get('bio'),
                  website: formData.get('website'),
                });
              }} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3 px-1">Display Name</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-brand/5 rounded-2xl group-hover:bg-brand/10 transition-colors" />
                      <input 
                        name="full_name"
                        defaultValue={profile?.full_name || ''}
                        className="relative w-full bg-transparent border border-white/5 rounded-2xl px-6 py-5 text-base text-white focus:outline-none focus:border-brand/50 transition-all font-bold placeholder:text-gray-700"
                        placeholder="e.g. Master Content Creator"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3 px-1">Bio / Journey Path</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-brand/5 rounded-2xl group-hover:bg-brand/10 transition-colors" />
                      <textarea 
                        name="bio"
                        defaultValue={profile?.bio || ''}
                        rows={3}
                        className="relative w-full bg-transparent border border-white/5 rounded-2xl px-6 py-5 text-base text-white focus:outline-none focus:border-brand/50 transition-all font-bold resize-none placeholder:text-gray-700"
                        placeholder="Define your content vision for the AI engine..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3 px-1">Portfolio Link</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-brand/5 rounded-2xl group-hover:bg-brand/10 transition-colors" />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2">
                        <Link className="w-4 h-4 text-brand" />
                      </div>
                      <input 
                        name="website"
                        defaultValue={profile?.website || ''}
                        className="relative w-full bg-transparent border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm text-white focus:outline-none focus:border-brand/50 transition-all font-bold placeholder:text-gray-700"
                        placeholder="https://yourchannel.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 py-6 bg-brand text-white font-black text-xs uppercase tracking-[0.25em] rounded-[24px] hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl shadow-brand/30 disabled:opacity-50 italic flex items-center justify-center gap-3"
                  >
                    {isUpdatingProfile ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 fill-current" />
                    )}
                    {isUpdatingProfile ? 'Processing...' : 'Sync Identity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SupabaseAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        setError("Check your email for the confirmation link!");
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141414] rounded-3xl border border-white/5 p-8 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-white italic uppercase tracking-tighter">Viral Caly</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Growth Engine</p>
          </div>
        </div>

        <h2 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter mb-6">
          {mode === "login" ? "Welcome Back" : "Join the Engine"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {!supabaseUrl || !supabaseAnonKey ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Configuration Required</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Please add your Supabase credentials to the <span className="text-white font-bold">Secrets</span> panel in AI Studio to enable authentication.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1 px-1">Email</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/40 transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1 px-1">Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/40 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className={`px-3 py-2 rounded-lg ${error.includes('Check your email') ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'} text-[10px] font-bold uppercase tracking-wider`}>
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50 italic flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                {loading ? "Processing..." : mode === "login" ? "Launch Mission" : "Create Account"}
              </button>
            </>
          )}
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <button 
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-brand transition-colors"
          >
            {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
