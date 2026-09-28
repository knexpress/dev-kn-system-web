'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CloudSun, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { profileWeather, WeatherScene } from '@/components/weather-scene';
import { cn } from '@/lib/utils';

type WeatherState = {
  weather: string;
  code: string;
  tempC: number | null;
  city?: string;
};

const GEO_ERRORS = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

const WEATHER_LABELS: Record<string, string> = {
  clear: 'Clear',
  pcloudy: 'Partly Cloudy',
  mcloudy: 'Mostly Cloudy',
  cloudy: 'Cloudy',
  humid: 'Humid',
  lightrain: 'Light Rain',
  oshower: 'Occasional Showers',
  ishower: 'Isolated Showers',
  lightsnow: 'Light Snow',
  rain: 'Rain',
  snow: 'Snow',
  rainsnow: 'Mixed Rain/Snow',
  ts: 'Thunderstorm',
  tsrain: 'Thunderstorm + Rain',
};

const toWeatherLabel = (raw: string) => {
  const key = (raw || '').replace(/day|night/gi, '').toLowerCase();
  return WEATHER_LABELS[key] || raw || 'Weather';
};

interface DashboardWeatherProps {
  variant?: 'compact' | 'large';
}

export default function DashboardWeather({ variant = 'compact' }: DashboardWeatherProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [canRetryLocation, setCanRetryLocation] = useState(false);

  const requestLocationAndWeather = async () => {
    setLoading(true);
    setError(null);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Location permission requires HTTPS (or localhost).');
      setCanRetryLocation(true);
      setLoading(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not supported on this device.');
      setCanRetryLocation(false);
      setLoading(false);
      return;
    }

    // If browser exposes permission state, provide clearer guidance before requesting.
    try {
      if ('permissions' in navigator && navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'denied') {
          setError('Location is blocked in browser settings. Allow location for this site, then retry.');
          setCanRetryLocation(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Ignore permission query errors and proceed to direct geolocation request.
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const params = new URLSearchParams({
            lat: position.coords.latitude.toString(),
            lon: position.coords.longitude.toString(),
          });

          const response = await fetch(`/api/weather/current?${params.toString()}`);
          const result = await response.json();

          if (!response.ok || !result?.success) {
            throw new Error(result?.error || 'Unable to load weather.');
          }

          setWeather({
            weather: toWeatherLabel(result.data?.weather),
            code: String(result.data?.weather || ''),
            tempC: typeof result.data?.tempC === 'number' ? result.data.tempC : null,
            city: result.data?.city,
          });
          setCanRetryLocation(false);
        } catch (err: any) {
          setError(err?.message || 'Unable to load weather right now.');
          setCanRetryLocation(true);
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        if (geoError.code === GEO_ERRORS.PERMISSION_DENIED) {
          setError('Location permission denied. Click Enable Location to try again.');
          setCanRetryLocation(true);
        } else if (geoError.code === GEO_ERRORS.POSITION_UNAVAILABLE) {
          setError('Location unavailable. Turn on device location services (Windows Location), then retry.');
          setCanRetryLocation(true);
        } else if (geoError.code === GEO_ERRORS.TIMEOUT) {
          setError('Location request timed out. Check GPS/network and retry.');
          setCanRetryLocation(true);
        } else {
          setError(geoError.message || 'Unable to get your location for weather.');
          setCanRetryLocation(true);
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    requestLocationAndWeather();
  }, []);

  const isLarge = variant === 'large';

  if (loading) {
    return (
      <div
        className={
          isLarge
            ? 'flex h-full min-h-[220px] items-center justify-center gap-3 rounded-[28px] border border-slate-100 bg-white p-6 text-sm text-muted-foreground'
            : 'hidden md:flex items-center gap-2 text-xs text-muted-foreground'
        }
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Getting weather...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          isLarge
            ? 'flex h-full min-h-[220px] items-center justify-between gap-3 rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800'
            : 'flex items-center gap-2 text-xs text-amber-700 bg-amber-100/60 border border-amber-300 rounded-md px-2 py-1'
        }
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span className={isLarge ? 'flex-1' : 'max-w-[220px] truncate hidden lg:inline'}>{error}</span>
        {canRetryLocation && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={isLarge ? 'h-8 px-3 text-xs' : 'h-6 px-2 text-[10px]'}
            onClick={requestLocationAndWeather}
          >
            Enable Location
          </Button>
        )}
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  if (isLarge) {
    const profile = profileWeather(weather.code, weather.tempC);
    return (
      <div
        className={cn(
          'relative isolate flex h-full min-h-[220px] overflow-hidden rounded-[28px] bg-gradient-to-br p-6 text-white shadow-[0_24px_48px_-24px_rgba(43,38,120,0.6)]',
          profile.gradient
        )}
      >
        <WeatherScene profile={profile} />
        <div className="relative z-10 flex flex-1 flex-col justify-between gap-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" />
            {weather.city || 'Your location'}
          </span>
          <div>
            {weather.tempC !== null && (
              <p className="text-6xl font-extrabold leading-none tracking-tight drop-shadow-sm">
                {Math.round(weather.tempC)}°
                <span className="ml-1 align-top text-2xl font-bold text-white/80">C</span>
              </p>
            )}
            <p className="mt-2 text-lg font-bold drop-shadow-sm">{weather.weather}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-white/25 backdrop-blur-sm">
                {profile.intensityLabel}
              </span>
              <span className="flex gap-1" aria-label={`Intensity ${profile.intensity} of 3`}>
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={cn(
                      'h-1.5 w-4 rounded-full',
                      level <= profile.intensity ? 'bg-white' : 'bg-white/30'
                    )}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-1.5">
      <CloudSun className="h-4 w-4 text-primary" />
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">{weather.weather}</span>
        {weather.tempC !== null && (
          <span className="text-muted-foreground">{Math.round(weather.tempC)}°C</span>
        )}
        {weather.city && (
          <span className="hidden lg:inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {weather.city}
          </span>
        )}
      </div>
    </div>
  );
}
