# EduConnect AI Coding Instructions

## Project Overview
EduConnect is a hybrid school attendance, engagement, and notification system built as a static web application using vanilla JavaScript, Firebase (Authentication + Firestore), and custom CSS. It serves three user roles: Super Admin, Admin, and Client User (students/parents) through separate portals.

## Architecture
- **Frontend**: Static HTML/CSS/JS served from `public/` directory
- **Backend**: Firebase (Auth for login, Firestore for data)
- **Structure**: 
  - `public/admin/` - Admin portal pages
  - `public/customer/` - Student portal pages
  - `public/assets/js/` - Client-side logic (auth, dashboard, etc.)
  - `src/` - Source files (currently empty, logic lives in `public/assets/js/`)

## Key Patterns & Conventions

### Authentication & Authorization
- Use Firebase Auth with email/password, but support username login by querying Firestore `users` collection
- Store user role in Firestore `users/{uid}` document
- Redirect based on role: Admins to `dashboard.html`, Clients to `../customer/dashboard.html`
- Always log authentication events to `auditTrail` collection

### Data Models
- **Users**: `{email, username?, role, ...}` in `users/{uid}`
- **Audit Trail**: `{userId, action, details, timestamp}` in `auditTrail`
- **Notifications**: `{targetUserIds[], message, type, timestamp, createdBy, readStatus{}}` in `notifications`
- Query notifications with `where('targetUserIds', 'array-contains', userId)`

### UI/UX Design System
- **Colors**: Primary (#EDA306), Secondary (#F5BA14), Success (#20A464), Error (#C01530)
- **Typography**: Inter font family
- **CSS Variables**: Use predefined variables in `:root` for consistency
- **Components**: Follow design guide in `docs/DesignGuide.md` for spacing, shadows, borders

### Development Workflow
- No build process - edit files directly in `public/`
- Serve static files locally (e.g., `python -m http.server` or VS Code Live Server)
- Firebase config in `src/config/firebaseConfig.js` (API key exposed for development)
- Update Firestore rules from `firestore-rules-update.txt` when modifying data access

### Security & Best Practices
- Client-side validation only - rely on Firestore security rules
- Store user session in `sessionStorage` as JSON string
- Use `auth-guard.js` for route protection
- Audit all user actions for compliance

### File Organization
- Place new JS logic in `public/assets/js/`
- Add CSS to `public/assets/css/main.css`
- Follow existing HTML structure with semantic classes
- Update `docs/` markdown files for documentation

### Testing
- Unit tests in `tests/unit/`, integration in `tests/integration/`
- Currently empty - implement with Jest when adding tests
- Test Firebase interactions with mocked services

## Common Tasks
- **Add new feature**: Create HTML in appropriate portal, add JS in `public/assets/js/`, style with CSS variables
- **Modify data model**: Update Firestore queries and security rules
- **Add user role check**: Use `sessionStorage.getItem('user')` to get role, redirect if unauthorized
- **Send notification**: Add document to `notifications` collection with `targetUserIds` array</content>
<parameter name="filePath">/Users/johncaelmontejo/Development/WebApp/BSIT CAPSTONE/Prototype 2/project-root/.github/copilot-instructions.md