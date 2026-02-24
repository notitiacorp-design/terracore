'use client';

import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ReminderMessageRow } from '@/types/database';
import type { ReminderLevel } from '@/types/database';
import {
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Gavel,
  Shield,
  Bell,
  BellRing,
} from 'lucide-react';

type ReminderLevelType = ReminderLevel;

interface ReminderTimelineProps {
  messages: ReminderMessageRow[];
  currentLevel: ReminderLevelType;
}

const LEVEL_CONFIG: Record<
  ReminderLevelType,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    badgeBg: string;
    dotColor: string;
    Icon: React.ElementType;
    order: number;
  }
> = {
  relance_1: {
    label: '1ère relance (J+1)',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    Icon: Bell,
    order: 1,
  },
  relance_2: {
    label: '2ème relance (J+7)',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
    badgeBg: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    dotColor: 'bg-yellow-500',
    Icon: BellRing,
    order: 2,
  },
  relance_3: {
    label: '3ème relance (J+15)',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    badgeBg: 'bg-orange-100 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
    Icon: AlertTriangle,
    order: 3,
  },
  mise_en_demeure: {
    label: 'Mise en demeure (J+30)',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700',
    badgeBg: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    Icon: Shield,
    order: 4,
  },
  contentieux: {
    label: 'Contentieux (J+60)',
    color: 'rose',
    bgColor: 'bg-rose-950',
    borderColor: 'border-rose-800',
    textColor: 'text-rose-200',
    badgeBg: 'bg-rose-900 text-rose-200 border-rose-700',
    dotColor: 'bg-rose-900',
    Icon: Gavel,
    order: 5,
  },
};

const ALL_LEVELS: ReminderLevelType[] = [
  'relance_1',
  'relance_2',
  'relance_3',
  'mise_en_demeure',
  'contentieux',
];

function getLevelOrder(level: ReminderLevelType): number {
  return LEVEL_CONFIG[level].order;
}

function getChannelIcon(channel: string) {
  if (channel === 'email' || channel === 'mail') {
    return <Mail className="h-4 w-4" />;
  }
  return <MessageSquare className="h-4 w-4" />;
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    email: 'E-mail',
    mail: 'E-mail',
    sms: 'SMS',
    courrier: 'Courrier',
    phone: 'Téléphone',
  };
  return map[channel] ?? channel;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'sent' || status === 'envoye' || status === 'envoyé') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Envoyé
      </span>
    );
  }
  if (status === 'pending' || status === 'en_attente') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
        <Clock className="h-3 w-3" />
        En attente
      </span>
    );
  }
  if (status === 'failed' || status === 'echoue' || status === 'échec') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
        <XCircle className="h-3 w-3" />
        Échoué
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
      {status}
    </span>
  );
}

export function ReminderTimeline({ messages, currentLevel }: ReminderTimelineProps) {
  const currentOrder = getLevelOrder(currentLevel);

  // Group messages by level
  const messagesByLevel = messages.reduce<Record<string, ReminderMessageRow[]>>(
    (acc, msg) => {
      const lvl = msg.level as ReminderLevelType;
      if (!acc[lvl]) acc[lvl] = [];
      acc[lvl].push(msg);
      return acc;
    },
    {}
  );

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 px-1">
        Chronologie des relances
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="flex flex-col gap-0">
          {ALL_LEVELS.map((level, index) => {
            const config = LEVEL_CONFIG[level];
            const levelOrder = config.order;
            const isCurrent = level === currentLevel;
            const isPast = levelOrder < currentOrder;
            const isFuture = levelOrder > currentOrder;
            const levelMessages = messagesByLevel[level] ?? [];
            const hasMessages = levelMessages.length > 0;
            const LevelIcon = config.Icon;
            const isLast = index === ALL_LEVELS.length - 1;

            return (
              <div key={level} className="relative flex gap-4">
                {/* Dot and line */}
                <div className="flex flex-col items-center z-10">
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full border-2 transition-all duration-200',
                      'min-w-[40px] min-h-[40px] w-10 h-10',
                      isCurrent && [
                        'border-2 shadow-lg scale-110',
                        `${config.dotColor}`,
                        'border-white',
                      ],
                      isPast && hasMessages && [
                        config.dotColor,
                        'border-white opacity-80',
                      ],
                      isPast && !hasMessages && [
                        'bg-gray-300',
                        'border-white opacity-60',
                      ],
                      isFuture && [
                        'bg-white',
                        `border-dashed`,
                        config.borderColor,
                        'opacity-50',
                      ]
                    )}
                  >
                    <LevelIcon
                      className={cn(
                        'h-4 w-4',
                        isCurrent && 'text-white',
                        isPast && hasMessages && 'text-white',
                        isPast && !hasMessages && 'text-gray-400',
                        isFuture && config.textColor
                      )}
                    />
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 min-h-[16px]',
                        isFuture ? 'border-l-2 border-dashed border-gray-300' : 'bg-gray-200'
                      )}
                      style={isFuture ? { background: 'none' } : undefined}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    'flex-1 pb-5 pt-1',
                    isLast && 'pb-2'
                  )}
                >
                  {/* Level header */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isCurrent && config.textColor,
                        isPast && 'text-gray-700',
                        isFuture && 'text-gray-400'
                      )}
                    >
                      {config.label}
                    </span>
                    {isCurrent && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
                          config.badgeBg
                        )}
                      >
                        Niveau actuel
                      </span>
                    )}
                    {isFuture && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400 border border-dashed border-gray-300">
                        À venir
                      </span>
                    )}
                  </div>

                  {/* Messages */}
                  {hasMessages ? (
                    <div className="flex flex-col gap-2">
                      {levelMessages
                        .sort(
                          (a, b) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime()
                        )
                        .map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              'rounded-lg border p-3 transition-all',
                              isCurrent
                                ? cn(config.bgColor, config.borderColor)
                                : isPast
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white border-dashed border-gray-200 opacity-60'
                            )}
                          >
                            {/* Message header */}
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'flex items-center gap-1 text-xs font-medium',
                                    isCurrent ? config.textColor : 'text-gray-500'
                                  )}
                                >
                                  {getChannelIcon(msg.channel)}
                                  {getChannelLabel(msg.channel)}
                                </span>
                                {msg.sent_at && (
                                  <span className="text-xs text-gray-400">
                                    · {formatDate(msg.sent_at)}
                                  </span>
                                )}
                              </div>
                              <StatusBadge status={msg.status ?? 'en_attente'} />
                            </div>

                            {/* Subject */}
                            {msg.subject && (
                              <p
                                className={cn(
                                  'text-sm font-medium truncate',
                                  isCurrent ? config.textColor : 'text-gray-700'
                                )}
                              >
                                {msg.subject}
                              </p>
                            )}

                            {/* Error message */}
                            {msg.error_message && (
                              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <XCircle className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{msg.error_message}</span>
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'rounded-lg border p-3 text-sm',
                        isFuture
                          ? 'border-dashed border-gray-200 text-gray-400 bg-white'
                          : 'border-gray-200 text-gray-400 bg-gray-50'
                      )}
                    >
                      {isFuture
                        ? 'Pas encore atteint'
                        : 'Aucun message enregistré'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
