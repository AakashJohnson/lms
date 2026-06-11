Master UI Design Prompt — CEAS-LMS Portal (NCUI / Ministry of Cooperative Affairs)

📌 PROJECT OVERVIEW
Design a full-featured Learning Management System (LMS) portal called CEAS-LMS for the National Cooperative Union of India (NCUI), under the Ministry of Cooperative Affairs. The portal serves three distinct user roles: Admin, Trainer/Faculty, and Participant/Trainee. The design must be modern, clean, government-grade yet accessible, mobile-responsive, and multilingual-ready.
Design Language: Clean dashboard UI inspired by modern EdTech platforms — use a light neutral base (#F5F6FA or #FAFBFF), accent color: deep indigo/navy (#1A237E or #3B4FD8), secondary accent: teal/green (#00897B), pastel card backgrounds (soft pink, yellow, purple, green), rounded corners (16–24px), soft shadows, and Inter or Poppins font.

🏛️ BRANDING BAR (Top of Home Page)

Topmost bar: image of Hon'ble Prime Minister (extreme right) + Hon'ble Union Minister for Cooperation (extreme left)
Below that: Ministry of Cooperation logo (extreme right) + NCUI logo (extreme left)
Centered: Portal name "CEAS-LMS Portal" with tagline


🧭 NAVIGATION STRUCTURE (All Roles)
Three navigation tabs visible after login:

LMS — Learning Management System (PDF-based course content)
QMS — Query Management System (user queries + expert responses)
Media Library — Audio-visual content

Left vertical sidebar with role-specific icons:

Dashboard / Home
My Courses / Course Management
Assessments
Reports & Analytics
Certificates
Profile Settings
Notifications
Live Sessions (Trainer + Admin)
User Management (Admin only)


📊 HOME PAGE / DASHBOARD
Stats block (box/card format — NOT graphs):
CardValueTotal Registered UsersLive countUsers Enrolled in CoursesLive countCourses EnrolledLive countCourses CompletedLive countTotal VisitorsLive count
Each stat card: pastel background, bold large number, icon, label, subtle up-trend indicator. Data auto-updated (real-time/daily badge shown).

👤 ROLE 1: PARTICIPANT / TRAINEE
Dashboard view includes:

Welcome banner with name + progress ring
Enrolled courses grid (2-col cards): course title, thumbnail, progress bar %, category tag, rating stars
Continue Learning shortcut card
Upcoming live sessions widget
Recent certificates earned

Course Detail Page:

Course banner image
Module list (accordion): each module = PDF viewer or video player
Progress tracker (chapter-wise)
Download disabled (no download button — content protection)
Notes section (per module)

Assessment Page:

MCQ quiz interface
Questions numbered automatically from Q1
Options auto-numbered (A, B, C, D)
No deleted options reappear
Submit → instant feedback → score shown
"Start Assessment" button only after course completion

Certificate Page:

"Pay ₹50 to Download Certificate" CTA
Payment gateway integration (Razorpay/PayU style modal)
After payment: certificate preview with QR code + serial number + digital signature + Ministry & NCUI logos
Vernacular language toggle (Hindi / English)

QMS — Query Page:

Submit a query form (category dropdown + text + optional attachment)
Query status tracker (Pending / Answered / Closed)
Expert response thread view


🎓 ROLE 2: TRAINER / FACULTY
Dashboard:

My Courses list with enrolled participant count
Assessment creation status
Session schedule calendar widget
Pending evaluations count

Course/Content Management:

Upload interface: drag-drop zone for PDF, PPT, Video, Audio
Module builder: reorder modules via drag, set titles, add descriptions
Batch-wise programme grouping

Assessment Builder:

Question bank interface
Add MCQ: question text + 4 options + correct answer selector
Delete option (deleted options never reappear in live quiz)
Preview mode
Assign to course + set duration

Live Session Management:

Schedule session: title, date/time, platform link (Zoom/Webex/Meet), batch selector
Notification toggle (email + SMS)
Attendance marking: participant checklist + biometric integration note

Conduct Session Page:

Join link button
Attendance sheet (auto + manual override)


🛠️ ROLE 3: ADMINISTRATOR
Dashboard:

All 5 stat blocks (real-time)
Programme-wise dashboards (dropdown selector)
Recent registrations table
Pending approval queue

User Management:

Table: Name, Role, Email/Phone, Status (Active/Pending/Blocked), Actions
Approve/Reject registration buttons
Bulk actions (export CSV)
OTP authentication status column
Role assignment dropdown

Course Management:

All courses table: title, trainer, batch, enrolled count, completion %, status
Create course button → wizard: title, category, assign trainer, add modules, set assessments
Modular structure builder

Reporting & Analytics:

Filters: Programme, Batch, Date range, Role
Report types:

Course Completion Report (table + export)
Participant Performance Report
Attendance Report
Certificate Download Report


Export buttons: PDF / Excel

Certification System:

Certificate template preview
Batch generate certificates
Serial number + QR verification system
Digital signature field management

Communication Module:

Compose announcement: select audience (all / batch / role), message, send via Email + SMS
Schedule reminders


📱 RESPONSIVENESS

Mobile-first for Participant role
Tablet-optimized for Trainer
Desktop-primary for Admin
Sidebar collapses to bottom nav on mobile
Course cards stack vertically
PDF viewer full-screen on mobile


🎨 COMPONENT DESIGN SPECS
Cards: 20px border-radius, box-shadow: 0 4px 20px rgba(0,0,0,0.06), 24px padding
Buttons: Primary = indigo (#3B4FD8), Secondary = outlined, Danger = red (#E53935)
Pills/Tags: Fully rounded, category colors match card pastels
Tables: Zebra striping, sticky header, pagination
Forms: Floating labels, OTP input boxes, inline validation
Modals: Centered, backdrop blur, close on ESC
Progress bars: Rounded, teal fill, animated on load
Charts: Bar chart for analytics (D3.js), horizontal for completion rates
Notifications: Top-right bell with badge count, dropdown list

🔐 AUTH FLOWS TO DESIGN

Registration page: Mobile number OR email, role selector (Participant / Trainer — Admin is pre-created)
OTP Verification screen: 6-box OTP input, resend timer
Login page: Mobile/email + password, "Forgot Password" link
Forgot Password: Enter mobile/email → OTP → Reset password
Admin approval screen: "Your registration is pending approval" holding state


⚠️ SPECIAL NOTES FOR THE DESIGNER

No download button anywhere on course content pages
Certificate download gated behind ₹50 payment
Biometric attendance integration point (show as "Biometric Sync" toggle in live session)
Deleted MCQ options must never render (show "(deleted)" placeholder in admin view only)
All assessments begin at Question No. 1 always
Dashboard stats in block/box format only — no pie/line charts on homepage
Support 1 lakh concurrent users (show "optimized for scale" badge in admin system info)
Low-bandwidth mode toggle in settings (reduces video quality, loads PDF-first)