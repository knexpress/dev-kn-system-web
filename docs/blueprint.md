# **App Name**: CargoLogix

## Core Features:

- Secure Authentication: Implement a secure login flow with email and password using Firebase Authentication and protected routing.
- Department-Based Access: Use role-based access control (RBAC) to restrict the application based on user department (Sales, Operations, Finance, HR, Management).
- Dynamic Sidebar Navigation: Dynamically generate the sidebar navigation links based on the user's department.
- Client Management: Allow Sales to view, add, and manage clients in the Firestore 'clients' collection.
- Task Management: Enable Operations to manage jobs, filtering them by status and marking them as 'Delivered'.
- Invoice Generation: Let Finance generate invoices for delivered jobs, creating new documents in the 'invoices' collection and updating job statuses.

## Style Guidelines:

- Primary color: Deep Ocean Blue (#29ABE2) for trustworthiness and professionalism, reflecting the cargo and logistics nature of the app.
- Background color: Light Gray (#F5F5F5), providing a neutral backdrop for the content to stand out and reduce eye strain.
- Accent color: Sea Green (#3CB371) to indicate successful actions or completion, such as invoice generation and job delivery.
- Body and headline font: 'Inter' sans-serif, for a modern and neutral look.
- Use a set of consistent, professional icons from a library like FontAwesome or Material Icons, tailored to each navigation item and action.
- Maintain a clean, well-spaced layout with consistent padding and margins, following a grid system to maintain alignment and responsiveness.
- Employ subtle animations to enhance user experience, such as loading spinners, transition effects between pages, and button hover effects.