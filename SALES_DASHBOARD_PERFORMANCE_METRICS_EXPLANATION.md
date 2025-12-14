# Sales Dashboard Performance Metrics - How It Works

## Overview
The Sales dashboard displays performance metrics that are fetched from the backend API and formatted for display. This document explains the complete flow.

## Data Flow

### 1. Dashboard Page (`src/app/dashboard/page.tsx`)
- **Location**: `/dashboard` route
- **Component**: `Dashboard` component
- **Action**: Renders `<PerformanceMetrics department={department.name} />` component
- **Department**: Automatically detects user's department from `useAuth()` hook

### 2. Performance Metrics Component (`src/components/performance-metrics.tsx`)
- **File**: `src/components/performance-metrics.tsx`
- **Function**: `PerformanceMetrics({ department })`
- **Flow**:
  1. On component mount, calls `fetchPerformanceData()`
  2. Checks if department is 'Management' (uses different logic)
  3. For Sales (and other departments), calls API endpoint

### 3. API Call (`src/lib/api-client.ts`)
- **Method**: `getDepartmentPerformance(department: string)`
- **Endpoint**: `GET /api/performance/department/Sales`
- **URL**: `http://localhost:5000/api/performance/department/Sales`
- **Returns**: `{ success: boolean, data?: any, error?: string }`

### 4. Data Processing (`src/lib/performance-metrics.ts`)
- **Function**: `getSalesPerformanceMetrics(data: any)`
- **Input**: Raw data from API response
- **Output**: Array of `PerformanceMetric` objects

## Sales Performance Metrics Structure

The Sales dashboard displays **4 key metrics**:

### 1. Monthly Revenue
- **Field**: `data.revenue`
- **Unit**: AED
- **Description**: Total revenue generated this month
- **Trend**: `data.revenueTrend` ('up' | 'down' | 'neutral')
- **Trend %**: `data.revenueTrendPercentage`
- **Icon**: DollarSign
- **Color**: success (green)

### 2. New Leads
- **Field**: `data.newLeads`
- **Unit**: Count (no unit)
- **Description**: New leads generated this month
- **Trend**: `data.leadsTrend`
- **Trend %**: `data.leadsTrendPercentage`
- **Icon**: Users
- **Color**: primary (blue)

### 3. Conversion Rate
- **Field**: `data.conversionRate`
- **Unit**: %
- **Description**: Lead to customer conversion rate
- **Trend**: `data.conversionTrend`
- **Trend %**: `data.conversionTrendPercentage`
- **Icon**: Target
- **Color**: warning (yellow)

### 4. Client Satisfaction
- **Field**: `data.clientSatisfaction`
- **Unit**: %
- **Description**: Average client satisfaction score
- **Trend**: `data.satisfactionTrend`
- **Trend %**: `data.satisfactionTrendPercentage`
- **Icon**: Star
- **Color**: secondary (gray)

## Expected API Response Format

The backend endpoint `/api/performance/department/Sales` should return:

```json
{
  "success": true,
  "data": {
    "revenue": 50000,
    "revenueTrend": "up",
    "revenueTrendPercentage": 12.5,
    "newLeads": 45,
    "leadsTrend": "up",
    "leadsTrendPercentage": 8.3,
    "conversionRate": 65.5,
    "conversionTrend": "neutral",
    "conversionTrendPercentage": 0,
    "clientSatisfaction": 88.2,
    "satisfactionTrend": "up",
    "satisfactionTrendPercentage": 5.2
  }
}
```

## Overall Performance Score

- **Function**: `calculateOverallScore(metrics: PerformanceMetric[])`
- **Location**: `src/lib/performance-metrics.ts` (line 419)
- **Calculation**:
  - Normalizes each metric to 0-100 scale
  - Averages all normalized scores
  - Returns percentage (0-100)
- **Display**: Shown as a progress bar and percentage badge

## Component Lifecycle

1. **Mount**: Component loads, shows loading skeleton
2. **Fetch**: Calls `apiClient.getDepartmentPerformance('Sales')`
3. **Process**: Maps API data to metric objects using `getSalesPerformanceMetrics()`
4. **Calculate**: Computes overall score using `calculateOverallScore()`
5. **Render**: Displays metrics cards with values, trends, and icons
6. **Update**: No auto-refresh (unlike Management which refreshes every 30s)

## Error Handling

- If API call fails: Shows empty metrics (all zeros)
- If API returns error: Logs to console, doesn't break the page
- If data is missing: Uses default values (0 for numbers, 'neutral' for trends)

## Key Files

1. **Dashboard Page**: `src/app/dashboard/page.tsx`
   - Renders the PerformanceMetrics component

2. **Performance Metrics Component**: `src/components/performance-metrics.tsx`
   - Handles fetching and displaying metrics

3. **API Client**: `src/lib/api-client.ts`
   - `getDepartmentPerformance()` method (line 655)

4. **Metrics Definitions**: `src/lib/performance-metrics.ts`
   - `getSalesPerformanceMetrics()` function (line 23)
   - `getDepartmentPerformanceMetrics()` router (line 397)
   - `calculateOverallScore()` function (line 419)

## Backend Endpoint Requirements

**Endpoint**: `GET /api/performance/department/Sales`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "revenue": number,
    "revenueTrend": "up" | "down" | "neutral",
    "revenueTrendPercentage": number,
    "newLeads": number,
    "leadsTrend": "up" | "down" | "neutral",
    "leadsTrendPercentage": number,
    "conversionRate": number,
    "conversionTrend": "up" | "down" | "neutral",
    "conversionTrendPercentage": number,
    "clientSatisfaction": number,
    "satisfactionTrend": "up" | "down" | "neutral",
    "satisfactionTrendPercentage": number
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Visual Display

Each metric is displayed as a card with:
- **Title**: Metric name (e.g., "Monthly Revenue")
- **Value**: Large number with unit (e.g., "50,000 AED")
- **Trend Indicator**: Arrow (↗ up, ↘ down, → neutral) with percentage
- **Description**: Small text explaining the metric
- **Icon**: Visual icon (DollarSign, Users, Target, Star)
- **Color Scheme**: Background and border colors based on metric type

## Differences from Management Dashboard

- **Management**: Calculates metrics from actual data (invoices, requests) using `calculateCompanyMetrics()`
- **Sales**: Fetches pre-calculated metrics from backend API
- **Management**: Auto-refreshes every 30 seconds
- **Sales**: Fetches once on mount (no auto-refresh)

## Troubleshooting

If metrics show as 0 or don't appear:

1. **Check API Response**: Open browser DevTools → Network tab → Look for `/api/performance/department/Sales`
2. **Check Console**: Look for error messages in browser console
3. **Verify Endpoint**: Ensure backend has `/api/performance/department/Sales` endpoint
4. **Check Data Format**: Verify API returns data in expected format
5. **Check Department**: Verify user's department is correctly set to 'Sales'

