# Performance Optimization Guide

## Frontend Optimizations Implemented

### 1. **API Response Caching**
- **Location**: `src/lib/api-cache.ts`
- **How it works**: Caches GET request responses in memory
- **Cache TTL**:
  - Bookings: 30 seconds
  - Employees: 60 seconds
  - Users: 60 seconds
  - Departments: 5 minutes (rarely change)
  - Clients: 60 seconds
  - Invoices: 30 seconds

### 2. **Request Deduplication**
- **Location**: `src/lib/api-client.ts`
- **How it works**: If the same request is made multiple times simultaneously, only one actual request is sent
- **Benefit**: Prevents duplicate API calls when components mount simultaneously

### 3. **Stale-While-Revalidate Pattern**
- **How it works**: Shows cached data immediately while fetching fresh data in the background
- **Benefit**: Users see data instantly, then it updates with fresh data
- **Implemented in**: Booking Requests page

### 4. **Parallel Requests**
- **How it works**: Multiple API calls are made simultaneously using `Promise.all()`
- **Benefit**: Reduces total loading time when multiple endpoints are needed
- **Implemented in**: Employee Management page

### 5. **Cache Invalidation**
- **How it works**: When data is modified (create/update/delete), cache is invalidated
- **Benefit**: Ensures users always see fresh data after mutations
- **Methods**: `apiClient.invalidateCache(pattern)` or `apiCache.invalidate(pattern)`

## Backend Performance Recommendations

### 1. **Database Indexing**
Ensure these fields are indexed:
- `review_status` in bookings collection
- `employee_id` in users collection
- `department_id` in employees collection
- `email` in employees and users collections (should already be unique indexes)
- `createdAt` for date-based queries

### 2. **Query Optimization**
- Use `.select()` to only fetch needed fields
- Use `.lean()` for read-only queries (Mongoose)
- Implement pagination for large datasets
- Use aggregation pipelines for complex queries

### 3. **Response Optimization**
- Compress responses (gzip/brotli)
- Minimize response payload size
- Use projection to exclude unnecessary fields
- Populate only required relationships

### 4. **Caching Headers**
Add HTTP cache headers:
```
Cache-Control: public, max-age=30
ETag: "unique-hash"
```

### 5. **Pagination Implementation**
For large datasets, implement pagination:
```
GET /api/bookings?page=1&limit=50
```

### 6. **Database Connection Pooling**
- Configure MongoDB connection pool size
- Use connection pooling middleware

### 7. **Response Time Monitoring**
- Log slow queries (>100ms)
- Monitor API response times
- Set up alerts for degraded performance

## Usage Examples

### Using Cached Requests
```typescript
// Automatically uses cache (default)
const result = await apiClient.getBookings();

// Force fresh data (skip cache)
const result = await apiClient.getBookings(false);
```

### Invalidating Cache
```typescript
// Invalidate specific endpoint
apiClient.invalidateCache('/bookings');

// Invalidate all cache
apiClient.invalidateCache();
```

### Parallel Requests
```typescript
// Fetch multiple endpoints in parallel
const [employees, users, departments] = await Promise.all([
  apiClient.getEmployees(),
  apiClient.getUsers(),
  apiClient.getDepartments(),
]);
```

## Expected Performance Improvements

- **First Load**: Same speed (no cache)
- **Subsequent Loads**: 50-90% faster (cached responses)
- **Navigation**: Instant display of cached data
- **Background Updates**: Fresh data loads without blocking UI

## Monitoring

Check browser DevTools Network tab to see:
- Cached responses (from memory cache)
- Request deduplication (same request only sent once)
- Parallel requests (multiple requests at same time)

