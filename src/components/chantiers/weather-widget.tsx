'use client';

import { useEffect, useState, useCallback } from 'react';
import { Cloud, CloudRain, Sun, Wind, Thermometer, AlertTriangle, RefreshCw, Snowflake, CloudLightning, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { WeatherSnapshotRow, ScheduleEventType, WeatherSeverity } from '@/types/database';

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  date: string;
  eventType?: ScheduleEventType;
  compact?: boolean;
  siteAddressId?: string;
  scheduleEventId?: string;
  companyId?: string;
}

interface WeatherData {
  temp_min: number | null;
  temp_max: number | null;
  wind_speed: number | null;
  precipitation_mm: number | null;
  weather_code: number | null;
  weather_label: string | null;
  severity: WeatherSeverity;
}

function calculateSeverity(
  data: Omit<WeatherData, 'severity'>,
  eventType?: ScheduleEventType
): WeatherSeverity {
  const { precipitation_mm, wind_speed, temp_min } = data;

  if (
    precipitation_mm !== null &&
    precipitation_mm > 10 &&
    eventType === 'chantier'
  ) {
    return 'alerte';
  }

  if (
    precipitation_mm !== null &&
    precipitation_mm > 5 &&
    eventType === 'chantier'
  ) {
    return 'defavorable';
  }

  if (wind_speed !== null && wind_speed > 40) {
    return 'defavorable';
  }

  if (temp_min !== null && temp_min < 0) {
    return 'acceptable';
  }

  return 'favorable';
}

const WEATHER_CODE_MAP: Record<number, { label: string; icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' }> = {
  0: { label: 'Ciel dégagé', icon: 'sun' },
  1: { label: 'Principalement dégagé', icon: 'sun' },
  2: { label: 'Partiellement nuageux', icon: 'cloud' },
  3: { label: 'Couvert', icon: 'cloud' },
  45: { label: 'Brouillard', icon: 'cloud' },
  48: { label: 'Brouillard givrant', icon: 'cloud' },
  51: { label: 'Bruine légère', icon: 'rain' },
  53: { label: 'Bruine modérée', icon: 'rain' },
  55: { label: 'Bruine forte', icon: 'rain' },
  61: { label: 'Pluie légère', icon: 'rain' },
  63: { label: 'Pluie modérée', icon: 'rain' },
  65: { label: 'Pluie forte', icon: 'rain' },
  71: { label: 'Neige légère', icon: 'snow' },
  73: { label: 'Neige modérée', icon: 'snow' },
  75: { label: 'Neige forte', icon: 'snow' },
  77: { label: 'Grains de neige', icon: 'snow' },
  80: { label: 'Averses légères', icon: 'rain' },
  81: { label: 'Averses modérées', icon: 'rain' },
  82: { label: 'Averses fortes', icon: 'rain' },
  85: { label: 'Averses de neige', icon: 'snow' },
  86: { label: 'Averses de neige forte', icon: 'snow' },
  95: { label: 'Orage', icon: 'storm' },
  96: { label: 'Orage avec grêle', icon: 'storm' },
  99: { label: 'Orage avec grêle forte', icon: 'storm' },
};

function getWeatherMeta(code: number | null): { label: string; icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' } {
  if (code === null) return { label: 'Inconnu', icon: 'cloud' };
  return WEATHER_CODE_MAP[code] ?? { label: 'Inconnu', icon: 'cloud' };
}

function WeatherIcon({ type, className }: { type: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm'; className?: string }) {
  const cls = cn('shrink-0', className);
  switch (type) {
    case 'sun':
      return <Sun className={cn(cls, 'text-yellow-400')} />;
    case 'rain':
      return <CloudRain className={cn(cls, 'text-blue-400')} />;
    case 'snow':
      return <Snowflake className={cn(cls, 'text-blue-200')} />;
    case 'storm':
      return <CloudLightning className={cn(cls, 'text-purple-400')} />;
    case 'cloud':
    default:
      return <Cloud className={cn(cls, 'text-gray-400')} />;
  }
}

const SEVERITY_CONFIG: Record<WeatherSeverity, { label: string; badgeClass: string; iconClass: string }> = {
  favorable: {
    label: 'Favorable',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    iconClass: 'text-emerald-500',
  },
  acceptable: {
    label: 'Acceptable',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
    iconClass: 'text-yellow-500',
  },
  defavorable: {
    label: 'Défavorable',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
    iconClass: 'text-orange-500',
  },
  alerte: {
    label: 'Alerte',
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
    iconClass: 'text-red-500',
  },
};

export function WeatherWidget({
  latitude,
  longitude,
  date,
  eventType,
  compact = false,
  siteAddressId,
  scheduleEventId,
  companyId,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const supabase = createClient();

  const fetchFromDatabase = useCallback(async (): Promise<WeatherSnapshotRow | null> => {
    let query = supabase
      .from('weather_snapshot')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1);

    if (scheduleEventId) {
      query = query.eq('schedule_event_id', scheduleEventId);
    } else if (siteAddressId) {
      query = query.eq('site_address_id', siteAddressId);
    } else {
      return null;
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Erreur chargement météo:', error);
      return null;
    }
    return data;
  }, [supabase, date, scheduleEventId, siteAddressId]);

  const fetchFromAPI = useCallback(async (): Promise<WeatherData | null> => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=Europe%2FParis&start_date=${date}&end_date=${date}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Réponse API invalide');
      const json = await res.json();

      const daily = json?.daily;
      if (!daily) throw new Error('Données météo indisponibles');

      const idx = 0;
      const rawData: Omit<WeatherData, 'severity'> = {
        temp_min: daily.temperature_2m_min?.[idx] ?? null,
        temp_max: daily.temperature_2m_max?.[idx] ?? null,
        wind_speed: daily.windspeed_10m_max?.[idx] ?? null,
        precipitation_mm: daily.precipitation_sum?.[idx] ?? null,
        weather_code: daily.weathercode?.[idx] ?? null,
        weather_label: daily.weathercode?.[idx] !== undefined
          ? getWeatherMeta(daily.weathercode[idx]).label
          : null,
      };

      const severity = calculateSeverity(rawData, eventType);
      return { ...rawData, severity };
    } catch (e) {
      console.error('Erreur API météo:', e);
      return null;
    }
  }, [latitude, longitude, date, eventType]);

  const loadWeather = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (!forceRefresh) {
        const snapshot = await fetchFromDatabase();
        if (snapshot) {
          const data: WeatherData = {
            temp_min: snapshot.temp_min,
            temp_max: snapshot.temp_max,
            wind_speed: snapshot.wind_speed,
            precipitation_mm: snapshot.precipitation_mm,
            weather_code: snapshot.weather_code,
            weather_label: snapshot.weather_label,
            severity: snapshot.severity,
          };
          setWeather(data);
          setLastUpdated(snapshot.created_at);
          return;
        }
      }

      const apiData = await fetchFromAPI();
      if (apiData) {
        setWeather(apiData);
        setLastUpdated(new Date().toISOString());

        if ((siteAddressId || scheduleEventId) && companyId) {
          const insertPayload: Record<string, unknown> = {
            company_id: companyId,
            date,
            temp_min: apiData.temp_min,
            temp_max: apiData.temp_max,
            wind_speed: apiData.wind_speed,
            precipitation_mm: apiData.precipitation_mm,
            weather_code: apiData.weather_code,
            weather_label: apiData.weather_label,
            severity: apiData.severity,
          };
          if (siteAddressId) insertPayload.site_address_id = siteAddressId;
          if (scheduleEventId) insertPayload.schedule_event_id = scheduleEventId;

          await supabase.from('weather_snapshot').upsert(insertPayload as never);
        }
      } else {
        setError('Données météo indisponibles pour cette date.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchFromDatabase, fetchFromAPI, siteAddressId, scheduleEventId, companyId, supabase, date]);

  useEffect(() => {
    loadWeather(false);
  }, [loadWeather]);

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      );
    }
    return (
      <Card className="border border-white/10 bg-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !weather) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-xs text-muted-foreground">Météo indisponible</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => loadWeather(true)}
          >
            Réessayer
          </Button>
        </div>
      );
    }
    return (
      <Card className="border border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Météo indisponible</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[48px] min-w-[48px]"
              onClick={() => loadWeather(true)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    if (compact) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-muted-foreground"
          onClick={() => loadWeather(true)}
        >
          <Cloud className="h-3 w-3 mr-1" />
          Mettre à jour la météo
        </Button>
      );
    }
    return (
      <Card className="border border-white/10 bg-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucune donnée météo disponible</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[48px]"
              onClick={() => loadWeather(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Mettre à jour
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta = getWeatherMeta(weather.weather_code);
  const severityConfig = SEVERITY_CONFIG[weather.severity];

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <WeatherIcon type={meta.icon} className="h-4 w-4" />
                {weather.temp_max !== null && (
                  <span className="text-sm font-medium">
                    {Math.round(weather.temp_max)}°C
                  </span>
                )}
                {weather.precipitation_mm !== null && weather.precipitation_mm > 0 && (
                  <span className="text-xs text-blue-400">
                    {weather.precipitation_mm.toFixed(1)}mm
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <div className="text-xs space-y-1">
                <p className="font-medium">{meta.label}</p>
                {weather.temp_min !== null && weather.temp_max !== null && (
                  <p>Température : {Math.round(weather.temp_min)}° / {Math.round(weather.temp_max)}°C</p>
                )}
                {weather.precipitation_mm !== null && (
                  <p>Précipitations : {weather.precipitation_mm.toFixed(1)} mm</p>
                )}
                {weather.wind_speed !== null && (
                  <p>Vent : {Math.round(weather.wind_speed)} km/h</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          <Badge
            variant="outline"
            className={cn('text-xs px-2 py-0.5 border font-medium', severityConfig.badgeClass)}
          >
            {weather.severity === 'alerte' && (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {severityConfig.label}
          </Badge>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border border-white/10 bg-white/5">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WeatherIcon type={meta.icon} className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium">{meta.label}</p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Mis à jour le{' '}
                  {new Date(lastUpdated).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[48px] min-w-[48px] rounded-full"
            onClick={() => loadWeather(true)}
            disabled={refreshing}
            aria-label="Actualiser la météo"
          >
            <RefreshCw
              className={cn('h-4 w-4 text-muted-foreground', refreshing && 'animate-spin')}
            />
          </Button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Temperature */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col items-center gap-1">
            <Thermometer className="h-4 w-4 text-orange-400" />
            <p className="text-xs text-muted-foreground text-center">Température</p>
            {weather.temp_min !== null && weather.temp_max !== null ? (
              <p className="text-sm font-semibold text-center">
                {Math.round(weather.temp_min)}° / {Math.round(weather.temp_max)}°C
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Precipitation */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col items-center gap-1">
            <Droplets className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-muted-foreground text-center">Précipitations</p>
            {weather.precipitation_mm !== null ? (
              <p className="text-sm font-semibold text-center">
                {weather.precipitation_mm.toFixed(1)} mm
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Wind */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col items-center gap-1">
            <Wind className="h-4 w-4 text-cyan-400" />
            <p className="text-xs text-muted-foreground text-center">Vent</p>
            {weather.wind_speed !== null ? (
              <p className="text-sm font-semibold text-center">
                {Math.round(weather.wind_speed)} km/h
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Severity badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1 text-sm font-medium border',
              severityConfig.badgeClass
            )}
          >
            {weather.severity === 'alerte' && (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {weather.severity === 'defavorable' && (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            Météo {severityConfig.label.toLowerCase()}
          </Badge>

          {eventType === 'chantier' && weather.severity === 'alerte' && (
            <p className="text-xs text-red-400">
              Intervention déconseillée
            </p>
          )}
          {eventType === 'chantier' && weather.severity === 'defavorable' && (
            <p className="text-xs text-orange-400">
              Conditions difficiles prévues
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherWidget;
