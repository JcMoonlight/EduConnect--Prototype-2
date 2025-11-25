This document provides a comprehensive design system for the EDUCONNECT webapp based on the sophisticated
logo design incorporating Google's minimalist principles and collaborative educational technology themes.
EDUCONNECT System Design Guide
Table of Contents
Color Theory, Design Methods & Implementation Framework
Executive Summary
Part 1: Color Theory Foundation
Part 2: Color Application Strategy
Part 3: Design Methods & Principles (Google-Inspired)
Part 4: Component Design System
Part 5: Module-Specific UI Guidelines
Part 6: Typography System
Part 7: Spacing System
Part 8: Shadow System
Part 9: Border Radius System
Part 10: Animation & Transitions
Part 11: Implementation Checklist
Part 12: Code Standards
Conclusion
Color Theory, Design Methods & Implementation Framework
Executive Summary
Part 1: Color Theory Foundation
Primary Color Palette
Gamboge Gold (#EDA306)
RGB: (237, 163, 6)
HSL: 41° 95% 48%
Purpose: Primary action color, trust & knowledge
Psychology: Warmth, optimism, intellectual authority
Usage: Buttons, links, highlights, call-to-action elements
Spanish Yellow (#F5BA14)
RGB: (245, 186, 20)
HSL: 44° 92% 52%
Purpose: Secondary accent, energy & engagement
Psychology: Enthusiasm, approachability, accessibility
Usage: Secondary buttons, badges, highlights, notifications
Crayola's Green (#20A464)
RGB: (32, 164, 100)
HSL: 151° 67% 38%
Purpose: Success states, growth & progress
Psychology: Growth, validation, harmony, learning progress
Usage: Success messages, positive feedback, completed states, checkmarks
Ocean Green (#60BE90)
RGB: (96, 190, 144)
HSL: 151° 42% 56%
Purpose: Calm states, supportive actions
Psychology: Balance, support, tranquility, collaboration
Usage: Info states, neutral actions, secondary confirmations, collaborative elements
Neutral Color Palette
Primary Neutral (#1F2121)
RGB: (31, 33, 33)
HSL: 200° 3% 12%
Purpose: Text, dark elements, contrast
Usage: Headings, body text, primary interface elements
Secondary Neutral (#626C71)
RGB: (98, 108, 113)
HSL: 210° 7% 41%
Purpose: Secondary text, disabled states
Usage: Help text, metadata, inactive elements
Light Neutral (#F5F5F5)
RGB: (245, 245, 245)
HSL: 0° 0% 96%
Purpose: Background, card surfaces
Usage: Page backgrounds, input fields, card backgrounds
Component Color Background Contrast Ratio WCAG Level
Text (Normal) #1F2121 #F5F5F5 12.6:1 AAA
Text (Large) #1F2121 #FFFFFF 14:1 AAA
Primary Button #EDA306 FFFFFF 4.8:1 AA
Link Text #20A464 #F5F5F5 6.2:1 AAA
Disabled Text #626C71 #F5F5F5 4.1:1 AA
Rationale: Users entering a system need to feel secure. Gold establishes authority; ocean green creates a welcoming
atmosphere.
White (#FFFFFF)
RGB: (255, 255, 255)
Purpose: Surfaces, overlays
Usage: Modal backgrounds, form backgrounds, elevated surfaces
Status Colors
Error State: #C01530 (Crimson Red)
RGB: (192, 21, 47)
Usage: Error messages, invalid inputs, delete actions
Warning State: #A84D2F (Burnt Orange)
RGB: (168, 75, 47)
Usage: Warnings, alerts, caution states
Info State: #626C71 (Slate)
RGB: (98, 108, 113)
Usage: Informational messages, help text
Part 2: Color Application Strategy
Accessibility & Contrast Ratios
Color Psychology Applied to Modules
System Login Module
Primary: Gamboge Gold (#EDA306) → Trust & Authority
Secondary: Ocean Green (#60BE90) → Welcoming & Safe
Status: Crayola's Green (#20A464) → Successful login
Accent: Spanish Yellow (#F5BA14) → "Forgot Password" link
Rationale: Clear differentiation between action types improves usability and prevents mistakes.
Rationale: Audit logs need clarity and historical context without overwhelming the interface.
Rationale: Dashboard should guide users through prioritized information with visual hierarchy.
Rationale: Landing page should be inviting, modern, and showcase all brand colors.
User Maintenance Module
Primary Actions: Crayola's Green (#20A464) → Create/Add
Secondary Actions: Spanish Yellow (#F5BA14) → Edit
Destructive Actions: #C01530 → Delete
Success Feedback: Ocean Green (#60BE90)
User Audit Trail
Neutral Theme: #626C71& lighter neutrals
Timeline Accents: Ocean Green (#60BE90)
Critical Actions: #C01530 (Red)
Highlights: Gamboge Gold (#EDA306)
User Dashboard
Primary Widget: Gamboge Gold (#EDA306) border accents
Data Visualization: Full spectrum (Gamboge, Spanish Yellow, Crayola's Green, Ocean Green)
Navigation: Spanish Yellow (#F5BA14)
Active States: Crayola's Green (#20A464)
Landing Page/Home Page
Hero Section: Gamboge Gold (#EDA306) with gradient to Ocean Green (#60BE90)
Call-to-Action: Spanish Yellow (#F5BA14)
Features Grid: Mix of all primary colors
Background: Light Neutral (#F5F5F5)
Part 3: Design Methods & Principles (Google-Inspired)
1. Material Design Philosophy
Surfaces & Elevation: Use consistent shadow depths (0dp, 1dp, 2dp, 4dp, 8dp, 16dp)
Motion: Subtle transitions (200ms-300ms ease-out) for state changes
Typography: Hierarchical scaling with clear visual relationships
2. Minimalist Approach
Whitespace: Minimum 16px padding, 24px margins between sections
Content Density: Maximum 2-3 related items per row on desktop, 1 on mobile
Visual Clutter: Remove decorative elements; every pixel should serve purpose
Background: #EDA306
Text: #FFFFFF
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
Hover: #D69400 (darker 10%)
Active: #BF8500 (darker 20%)
Background: #F5BA14
Text: #1F2121
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
Hover: #E6A806 (darker)
Active: #D69400
Background: #20A464
Text: #FFFFFF
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
Hover: #1A8653
Active: #148A50
Background: Transparent
Border: 2px solid #626C71
Text: #626C71
Padding: 10px 22px
3. Accessibility First
Color Independence: Don't rely solely on color to convey meaning; use icons, text, patterns
Contrast: Always maintain 4.5:1 ratio for normal text (WCAG AA)
Focus States: Visible 2px outline with 3px radius
4. Responsive Design
Mobile-First: Design for 375px first, scale up to 1920px
Flexible Grids: 4-column on mobile, 8-column on tablet, 12-column on desktop
Touch Targets: Minimum 48px × 48px buttons for mobile accessibility
Part 4: Component Design System
Button Styles
Primary Button (Gamboge Gold)
Secondary Button (Spanish Yellow)
Success Button (Crayola's Green)
Ghost Button (Bordered)
Border Radius: 8px
Hover: Background #F5F5F5
Background: #FFFFFF
Border: 1px solid #E0E0E0
Border Radius: 6px
Padding: 12px 16px
Font: 14px / 1.5
Focus Border: 2px solid #EDA306
Focus Box-Shadow: 0 0 0 4px rgba(237, 163, 6, 0.1)
Placeholder: #626C71
Font Size: 12px
Font Weight: 600
Color: #1F2121
Margin Bottom: 8px
Text Transform: Uppercase
Letter Spacing: 0.5px
Border Color: #C01530
Focus Border: #C01530
Error Icon: #C01530
Error Message: 12px / #C01530
Background: #FFFFFF
Border: 1px solid #E0E0E0
Border Radius: 12px
Box Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
Padding: 24px
Hover Shadow: 0 4px 16px rgba(0, 0, 0, 0.12)
Transition: box-shadow 200ms ease-out
Background: #FFFFFF
Border Bottom: 2px solid #F5F5F5
Height: 64px
Active Item Border: 3px solid #EDA306
Active Item Text: #EDA306
Inactive Item Text: #626C71
Hover Item Background: rgba(237, 163, 6, 0.05)
Form Input Styles
Text Input
Input Label
Input Error State
Card Component
Navigation Component
Layout Structure:
Color Application:
Micro-interactions:
Layout Structure:
Color Coding by Role:
Data Table Style:
Part 5: Module-Specific UI Guidelines
System Login Module
Centered card design (400px wide on desktop)
Logo above form (120px × 120px)
Title: "Welcome Back"
Two input fields: Email & Password
Three buttons: Login (Primary), Clear (Ghost), Exit (Ghost)
Card: White with subtle shadow
Title: #1F2121 (28px, bold)
Labels: #626C71 (12px uppercase)
Input Focus: #EDA306 border
Login Button: #EDA306 (Gamboge Gold)
Success: #20A464 (Crayola's Green)
Error: #C01530 (Red)
Password reveal toggle icon
Button ripple effect on click
Error message fade-in (200ms)
Input focus glow effect
User Maintenance Module
Header: "User Management" with Add New User button
Data table with columns: Name, Email, Role, Status, Actions
Action buttons: Edit (yellow), Delete (red), View (ghost)
Pagination controls
Super Admin: Gold badge (#EDA306)
Admin: Ocean Green badge (#60BE90)
Client User: Spanish Yellow badge (#F5BA14)
Alternating row backgrounds: White & #F5F5F5
Hover row: Background #F9F6F0 (light gold tint)
Header: Dark neutral (#1F2121) on #F5F5F5
Borders: 1px solid #E0E0E0
Layout Structure:
Color Coding Actions:
Visual Hierarchy:
Layout Structure:
Widget Design:
Chart Colors:
Hero Section:
Feature Grid:
User Audit Trail Module
Vertical timeline format
Filter by: Date Range, User, Action Type
Each record shows: Timestamp, User, Action, Details, Status
Create: #20A464 (Green)
Update: #EDA306 (Gold)
Delete: #C01530 (Red)
Login: #60BE90 (Ocean Green)
Error: #C01530 (Red)
Timeline line: #E0E0E0
Active node: Primary color (based on action)
Action labels: Bold, color-coded
User Dashboard Module
Welcome section with user greeting
4-widget grid: Summary, Recent Activity, Stats, Quick Actions
Responsive: 2 columns on tablet, 1 on mobile
Title: #1F2121 bold
Number: #EDA306 (28px bold)
Label: #626C71 (12px)
Icon: Color-coded status
Border accent: Top border 4px in primary color
Bar Charts: Gamboge, Spanish Yellow, Crayola's Green, Ocean Green
Line Chart: Primary #EDA306
Area: Semi-transparent version with 30% opacity
Landing Page/Home Page
Background: Gradient from #EDA306 to #60BE90
Headline: 48px white bold
Subheading: 20px white/light neutral
CTA Button: #F5BA14 with dark text
Navigation Bar:
Level Size Weight Line Height Use Case
H1 32px 700 1.2 Page titles
H2 28px 700 1.3 Section headers
H3 24px 600 1.4 Subsection titles
H4 20px 600 1.4 Component titles
Body 14px 400 1.6 Body text
Caption 12px 500 1.5 Labels, hints
Code 12px 400 1.5 Monospace text
3 columns (desktop) / 1 column (mobile)
Icon backgrounds: Each feature card uses a different primary color
Icon: White
Title: #1F2121 bold
Description: #626C71 regular
Background: White
Logo: Left-aligned
Menu Items: #626C71 hover-to-#EDA306
Login Button: #EDA306 (Gamboge) with white text
Part 6: Typography System
Font Family
Primary: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
Monospace: IBM Plex Mono (for audit logs, codes)
Font Scale
Part 7: Spacing System
Standardized Spacing Scale
4px (xs)
8px (sm)
12px (md)
16px (lg)
24px (xl)
32px (2xl)
48px (3xl)
64px (4xl)
Depth Shadow Use Case
1 0 2px 8px rgba(0,0,0,0.08) Cards, inputs
2 0 4px 16px rgba(0,0,0,0.12) Hovered cards
3 0 8px 24px rgba(0,0,0,0.15) Modals, dropdowns
4 0 12px 32px rgba(0,0,0,0.18) Floating actions
Category Value Use Case
Sharp 0px Tables, grids
Small 4px Form inputs
Medium 8px Buttons, cards
Large 12px Modals, containers
Full 9999px Badges, avatars
- Fast: 150ms ease-out (micro-interactions)
- Normal: 250ms ease-out (state changes)
- Slow: 350ms ease-out (complex animations)
Easing: cubic-bezier(0.16, 1, 0.3, 1)
Application
Padding: 16px (standard), 24px (cards), 12px (buttons)
Margin: 24px (between sections), 16px (between elements)
Gap: 16px (flex containers), 24px (grid containers)
Part 8: Shadow System
Elevation Levels
Part 9: Border Radius System
Part 10: Animation & Transitions
Standard Transitions
Hover States
Button: Scale 1.02, shadow elevation increase
Link: Color shift to darker shade
Card: Shadow elevation increase, subtle scale
Loading States
Skeleton screens: Shimmer animation over light neutral
Spinner: Gamboge gold color, smooth 1.5s rotation
Progress bar: Gradient from Spanish Yellow to Gamboge Gold
Part 11: Implementation Checklist
Phase 1: System Login Module (50% Progress)
[ ] Create login form with password masking
[ ] Input validation (empty fields)
[ ] Success/error messaging
[ ] Error message animations
[ ] Focus states and accessibility
[ ] Responsive layout (mobile-first)
Phase 2: User Maintenance Module (Prelims)
[ ] User table with CRUD operations
[ ] Role-based color coding
[ ] Add/Edit/Delete modals
[ ] Confirmation dialogs
[ ] Permission checks per role
Phase 3: User Audit Trail (Midterms)
[ ] Timeline visualization
[ ] Filter controls
[ ] Data export functionality
[ ] Search capabilities
[ ] Super admin access only
Phase 4: User Dashboard (Prefinals)
[ ] Widget components
[ ] Data visualization charts
[ ] Real-time activity feed
[ ] Quick action cards
[ ] Responsive grid layout
Phase 5: Landing Page (Finals)
[ ] Hero section
[ ] Feature showcase
[ ] Navigation bar
[ ] Call-to-action buttons
:root {
/* Primary Colors */
--color-primary: #EDA306;
--color-secondary: #F5BA14;
--color-success: #20A464;
--color-info: #60BE90;
--color-error: #C01530;
--color-warning: #A84D2F;
/* Neutrals */
--color-text-primary: #1F2121;
--color-text-secondary: #626C71;
--color-bg-light: #F5F5F5;
--color-bg-white: #FFFFFF;
/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;
--space-2xl: 32px;
/* Shadows */
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
/* Typography */
--font-family: Inter, system-ui, -apple-system, sans-serif;
--font-size-h1: 32px;
--font-size-h2: 28px;
--font-size-body: 14px;
}
This design system provides a cohesive, accessible, and professional visual language for EDUCONNECT. By adhering
to these principles and methods, your webapp will deliver a consistent, delightful user experience that builds trust and
encourages engagement across all modules and user roles.
Remember: Design is not decoration—it's communication. Every color choice, spacing decision, and interaction should
serve your users' needs while embodying EDUCONNECT's mission of connecting educators and learners.
[ ] Mobile responsiveness
[ ] SEO optimization
Part 12: Code Standards
CSS Variables (Implement in Your Stylesheet)
Conclusion