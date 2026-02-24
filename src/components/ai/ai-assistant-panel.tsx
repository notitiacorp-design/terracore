"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  User,
  Bot,
  Loader2,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTION_CHIPS = [
  { label: "Optimiser ce devis", prompt: "Comment puis-je optimiser mon dernier devis pour améliorer la marge ?" },
  { label: "Planifier cette semaine", prompt: "Aide-moi à planifier les chantiers de cette semaine de façon optimale." },
  { label: "Analyser ma marge", prompt: "Analyse mes marges des 30 derniers jours et donne-moi des recommandations." },
  { label: "Risques météo", prompt: "Quels chantiers risquent d'être impactés par la météo cette semaine ?" },
  { label: "Employés disponibles", prompt: "Quels employés sont disponibles demain matin ?" },
];

const MOCK_RESPONSES: Record<string, string> = {
  default:
    "Je comprends votre demande. En analysant les données de TerraCore Pro, voici ce que je vous recommande : pensez à vérifier vos marges actuelles et à planifier vos équipes en fonction des prévisions météo. Souhaitez-vous que j'approfondisse un point particulier ?",
  devis:
    "En analysant votre dernier devis, j'observe que la marge brute est de 23%, légèrement en dessous de votre objectif de 28%. Je vous recommande d'ajuster le poste 'Main d'œuvre' (+8%) et de revoir les fournitures du lot 2. Voulez-vous que je génère un devis révisé ?",
  planifier:
    "Pour cette semaine, voici mon plan optimal : Lundi — Équipe A sur chantier Dupont (8h-17h), Équipe B sur jardinage Martin (9h-16h). Mardi — focus préparation chantier Leblanc. La météo prévoit des averses mercredi : je suggère de décaler les travaux extérieurs au jeudi. Confirmer ce planning ?",
  marge:
    "Analyse des 30 derniers jours : Marge moyenne 24.3% (objectif 28%). Les chantiers d'élagage ont la meilleure marge (31%), tandis que les travaux de maçonnerie paysagère sont à 18%. Recommandation : revaloriser vos tarifs maçonnerie de +12% et cibler davantage de chantiers d'élagage. Détail par client disponible.",
  météo:
    "Alerte météo cette semaine : mercredi 15h — orages prévus (risque élevé). Chantiers impactés : Résidence Bellevue (revêtement en cours), Jardins de la Mairie (plantation). Je recommande d'avancer ces chantiers à mardi ou de reporter à jeudi. Notification envoyée aux équipes concernées ?",
  employés:
    "Demain matin, employés disponibles : Marc Dubois (chef d'équipe), Julien Petit, Sarah Moreau, Thomas Bernard. Pierre Lambert est en congé. Rappel : Julien Petit n'a pas encore son CACES R482 à jour — vérifier avant affectation sur engin.",
};

function getMockResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("devis")) return MOCK_RESPONSES.devis;
  if (p.includes("planif") || p.includes("semaine")) return MOCK_RESPONSES.planifier;
  if (p.includes("marge")) return MOCK_RESPONSES.marge;
  if (p.includes("météo") || p.includes("meteo") || p.includes("risque"))
    return MOCK_RESPONSES.météo;
  if (p.includes("employ") || p.includes("disponible"))
    return MOCK_RESPONSES.employés;
  return MOCK_RESPONSES.default;
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-white",
          isUser
            ? "bg-slate-600"
            : "bg-gradient-to-br from-emerald-500 to-emerald-700"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-slate-800 text-white rounded-tr-sm"
            : "bg-emerald-50 text-slate-800 border border-emerald-100 rounded-tl-sm"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-slate-400 text-right" : "text-slate-400"
          )}
        >
          {format(message.timestamp, "HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
}

interface AiAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiAssistantPanel({ open, onOpenChange }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // FIX Bug 3: ref to track if async operations should be cancelled
  const isCancelledRef = useRef(false);
  // FIX Bug 2: ref to track mounted state for setTimeout in clearConversation
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    isCancelledRef.current = false;
    return () => {
      isMountedRef.current = false;
      isCancelledRef.current = true;
    };
  }, []);

  // FIX Bug 3: When panel closes, cancel any in-flight async operations
  useEffect(() => {
    if (!open) {
      isCancelledRef.current = true;
    } else {
      isCancelledRef.current = false;
    }
  }, [open]);

  // FIX Bug 1: Added messages.length to dependency array to correctly re-trigger
  // when messages are reset so welcome message shows again on reopen
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Bonjour ! Je suis l'assistant IA de TerraCore Pro. Je peux vous aider à optimiser vos devis, planifier vos équipes, analyser vos marges et bien plus encore. Comment puis-je vous aider aujourd'hui ?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const el = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage(prompt: string) {
    if (!prompt.trim() || isTyping) return;

    // FIX Bug 3: Reset cancelled state for new send operation when panel is open
    if (isCancelledRef.current) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response delay
    await new Promise((resolve) =>
      setTimeout(resolve, 800 + Math.random() * 800)
    );

    // FIX Bug 3: Check if cancelled before updating state
    if (isCancelledRef.current) return;

    const aiResponse = getMockResponse(prompt);
    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: aiResponse,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsTyping(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }

  function clearConversation() {
    // FIX Bug 2: Don't allow clear while typing to avoid async race
    if (isTyping) return;

    setMessages([]);

    // FIX Bug 2: Check isMountedRef before setting state in timeout
    const timeoutId = setTimeout(() => {
      if (!isMountedRef.current) return;
      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content:
            "Conversation réinitialisée. Comment puis-je vous aider ?",
          timestamp: new Date(),
        },
      ]);
    }, 50);

    // Cleanup the timeout if needed (component unmounts before it fires)
    return () => clearTimeout(timeoutId);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] p-0 flex flex-col bg-white border-l border-slate-200"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-emerald-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-white text-sm font-semibold">
                  Assistant IA
                </SheetTitle>
                <p className="text-emerald-100 text-xs">TerraCore Pro</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 mr-1.5 animate-pulse" />
                En ligne
              </Badge>
              <button
                onClick={clearConversation}
                className="flex items-center justify-center h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Réinitialiser la conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    <span className="text-xs text-slate-500">En train d'écrire...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion chips — only show when no user messages yet */}
            {messages.length <= 1 && !isTyping && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => sendMessage(chip.prompt)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="flex-1 text-sm border-slate-200 focus-visible:ring-emerald-500"
              disabled={isTyping}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
