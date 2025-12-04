import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the frontend base URL for constructing QR code URLs
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (if set)
 * 2. window.location.origin (client-side)
 * 3. Extract from NEXT_PUBLIC_API_URL (fallback)
 */
export function getFrontendBaseUrl(): string {
  // Check for explicit frontend URL
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Use current origin on client-side
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side: try to extract from API URL or use default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      // If API URL is on same domain, use it; otherwise might need separate config
      return url.origin;
    } catch {
      // Invalid URL, fall through to default
    }
  }
  
  // Default fallback (shouldn't happen in production)
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
}

/**
 * Construct a full QR payment URL from a relative path or full URL
 * @param qrPath - Relative path like '/qr-payment/abc123' or full URL
 * @returns Full URL ready for QR code
 */
export function getQRPaymentUrl(qrPath: string): string {
  if (!qrPath) return '';
  
  // If it's already a full URL, return as is
  if (qrPath.startsWith('http://') || qrPath.startsWith('https://')) {
    return qrPath;
  }
  
  // Ensure path starts with /
  const path = qrPath.startsWith('/') ? qrPath : `/${qrPath}`;
  
  // Construct full URL
  const baseUrl = getFrontendBaseUrl();
  return `${baseUrl}${path}`;
}