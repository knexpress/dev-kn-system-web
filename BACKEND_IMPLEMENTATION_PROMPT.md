# Backend Implementation: Get Booking for Review Endpoint

## Overview
Create a new endpoint that fetches a complete booking record with all identityDocuments images when a user clicks "View" or "Review" button. This endpoint should return the full booking data including all nested images from the `identityDocuments` object.

## Endpoint Specification

### Route
```
GET /api/bookings/:id/review
```

### Purpose
This endpoint is specifically designed to fetch complete booking data with all images when a manager/user wants to review a booking request. Unlike the regular `GET /api/bookings/:id` endpoint, this one should:
1. Return ALL data including full identityDocuments object with all images
2. Ensure images are not filtered or excluded
3. Return data in a format that matches the frontend expectations

### Request
- **Method**: GET
- **URL**: `/api/bookings/:id/review`
- **Parameters**: 
  - `id` (path parameter) - The booking ID

### Response Format

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "booking_id",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "service": "UAE_TO_PH",
    "review_status": "not reviewed",
    "sender": {
      "fullName": "John Doe",
      "contactNo": "+1234567890",
      "completeAddress": "123 Main St",
      "emailAddress": "john@example.com"
    },
    "receiver": {
      "fullName": "Jane Doe",
      "contactNo": "+0987654321",
      "completeAddress": "456 Oak Ave"
    },
    "identityDocuments": {
      "eidFrontImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgA…",
      "eidBackImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgA…",
      "eidFrontImageFirstName": "Noemie",
      "eidFrontImageLastName": "Arevalo",
      "philippinesIdFront": "data:image/jpeg;base64,/9j/2wCEAAUGBgsICwsLCwsNCwsLDQ4ODQ0ODg8NDg4ODQ8…",
      "philippinesIdBack": "data:image/jpeg;base64,/9j/2wCEAAoJCREMEREREREaExQTGhsbFxcbGx4ZGxsbGR4…",
      "customerImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgA…",
      "customerImages": ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."]
    },
    "items": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "error": "Booking not found"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Failed to fetch booking details"
}
```

## Implementation Requirements

### 1. Database Query
- Use the booking ID to fetch the complete booking document
- **IMPORTANT**: Include the `identityDocuments` object with ALL its fields, especially:
  - `eidFrontImage`
  - `eidBackImage`
  - `philippinesIdFront`
  - `philippinesIdBack`
  - `customerImage`
  - `customerImages` (array)
  - Any other image fields in identityDocuments

### 2. Data Population
- Populate all referenced fields (sender, receiver, etc.)
- Ensure nested objects are fully populated
- Do NOT exclude or filter out any image fields

### 3. Image Handling
- Return images as they are stored (base64 strings, URLs, or file paths)
- Do NOT convert or transform images unless necessary
- Ensure all image fields in `identityDocuments` are included in the response

### 4. Security/Authentication
- Add authentication middleware to ensure only authorized users can access this endpoint
- Consider role-based access control (e.g., only managers, sales, or operations can view)

### 5. Error Handling
- Handle cases where booking doesn't exist (404)
- Handle database errors (500)
- Return appropriate error messages

## Example Implementation (Node.js/Express with MongoDB)

```javascript
// routes/bookings.js or similar
router.get('/:id/review', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find booking with all fields, especially identityDocuments
    const booking = await Booking.findById(id)
      .populate('sender')
      .populate('receiver')
      .populate('created_by_employee_id')
      .lean(); // Use lean() for better performance if not modifying
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Ensure identityDocuments is included and not filtered
    // The booking should already have identityDocuments from the query
    // But explicitly verify it exists
    if (!booking.identityDocuments) {
      console.warn(`Booking ${id} has no identityDocuments`);
    }
    
    // Return the complete booking with all data
    res.json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('Error fetching booking for review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking details'
    });
  }
});
```

## Important Notes

1. **Do NOT filter out identityDocuments**: The endpoint should return the complete `identityDocuments` object with all image fields.

2. **Image Format**: Images may be stored as:
   - Base64 strings (data:image/jpeg;base64,...)
   - URLs (http://...)
   - File paths
   - Return them as-is without transformation

3. **Performance**: Since this endpoint loads full data including images, consider:
   - Adding response caching if appropriate
   - Limiting the size of base64 images if they're too large
   - Using streaming for very large images

4. **Testing**: Test with bookings that have:
   - Images in `identityDocuments`
   - Images in nested `collections.identityDocuments`
   - Images at top-level fields
   - Missing images (should still return the booking)

## Frontend Integration

The frontend will call this endpoint when:
- User clicks "View" button on a booking
- User clicks "Review" button on a booking

The frontend code is already updated to use:
```javascript
const result = await apiClient.getBookingForReview(booking._id);
```

## Verification Checklist

- [ ] Endpoint returns 200 with complete booking data
- [ ] `identityDocuments` object is included in response
- [ ] All image fields in `identityDocuments` are present:
  - [ ] `eidFrontImage`
  - [ ] `eidBackImage`
  - [ ] `philippinesIdFront`
  - [ ] `philippinesIdBack`
  - [ ] `customerImage`
  - [ ] `customerImages` (array)
- [ ] Error handling for non-existent bookings (404)
- [ ] Error handling for server errors (500)
- [ ] Authentication/authorization is implemented
- [ ] Tested with real booking data

## Additional Context

The frontend expects images to be available in this priority order:
1. `booking.identityDocuments.eidFrontImage` (primary)
2. `booking.collections.identityDocuments.eidFrontImage` (fallback)
3. `booking.id_front_image` (fallback)

So ensure the endpoint returns data in a structure that matches these expectations.

