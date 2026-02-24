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
      .order('fetched_at', { ascending: false })
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
      const weatherCode: number | null = daily.weathercode?.[idx] ?? null;
      const rawData: Omit<WeatherData, 'severity'> = {
        temp_min: daily.temperature_2m_min?.[idx] ?? null,
        temp_max: daily.temperature_2m_max?.[idx] ?? null,
        wind_speed: daily.windspeed_10m_max?.[idx] ?? null,
        precipitation_mm: daily.precipitation_sum?.[idx] ?? null,
        weather_code: weatherCode,
        weather_label: weatherCode !== null ? getWeatherMeta(weatherCode).label : null,
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
          const weatherMeta = getWeatherMeta(snapshot.weather_code);
          const data: WeatherData = {
            temp_min: snapshot.temperature_min,
            temp_max: snapshot.temperature_max,
            wind_speed: snapshot.wind_speed_kmh,
            precipitation_mm: snapshot.precipitation_mm,
            weather_code: snapshot.weather_code,
            weather_label: weatherMeta.label,
            severity: snapshot.severity,
          };
          setWeather(data);
          setLastUpdated(snapshot.fetched_at);
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
            temperature_min: apiData.temp_min,
            temperature_max: apiData.temp_max,
            wind_speed_kmh: apiData.wind_speed,
            precipitation_mm: apiData.precipitation_mm,
            weather_code: apiData.weather_code,
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
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-orange-400" />
        <span>{error}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => loadWeather(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', refreshing && 'animate-spin')} />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!weather) return null;

  const meta = getWeatherMeta(weather.weather_code);
  const severityConfig = SEVERITY_CONFIG[weather.severity];

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2">
          <WeatherIcon type={meta.icon} className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            {weather.temp_min !== null && weather.temp_max !== null
              ? `${Math.round(weather.temp_min)}–${Math.round(weather.temp_max)}°C`
              : meta.label}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn('text-xs cursor-default', severityConfig.badgeClass)}
              >
                {severityConfig.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <p className="font-medium">{meta.label}</p>
                {weather.precipitation_mm !== null && (
                  <p>Précipitations : {weather.precipitation_mm} mm</p>
                )}
                {weather.wind_speed !== null && (
                  <p>Vent : {Math.round(weather.wind_speed)} km/h</p>
                )}
                {lastUpdated && (
                  <p className="text-muted-foreground">
                    Mis à jour : {new Date(lastUpdated).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => loadWeather(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border border-white/10 bg-white/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WeatherIcon type={meta.icon} className="h-6 w-6" />
            <span className="text-sm font-medium">{meta.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs', severityConfig.badgeClass)}
            >
              {weather.severity === 'alerte' && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {severityConfig.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => loadWeather(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2">
            <Thermometer className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-muted-foreground">Temp.</span>
            <span className="text-sm font-semibold">
              {weather.temp_min !== null && weather.temp_max !== null
                ? `${Math.round(weather.temp_min)}–${Math.round(weather.temp_max)}°C`
                : '–'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2">
            <Droplets className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">Précip.</span>
            <span className="text-sm font-semibold">
              {weather.precipitation_mm !== null
                ? `${weather.precipitation_mm} mm`
                : '–'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2">
            <Wind className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-muted-foreground">Vent</span>
            <span className="text-sm font-semibold">
              {weather.wind_speed !== null
                ? `${Math.round(weather.wind_speed)} km/h`
                : '–'}
            </span>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground text-right">
            Mis à jour : {new Date(lastUpdated).toLocaleString('fr-FR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
