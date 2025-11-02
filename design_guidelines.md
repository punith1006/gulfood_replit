# Gulfood 2026 AI Assistant - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Gulfood.com and GITEX.com, create a premium international trade show aesthetic that balances Dubai's modern futuristic architecture with food industry vibrancy and professional elegance.

**Key Design Principles:**
- Premium sophistication meets technological innovation
- Bold, confident layouts that command attention
- Data-rich interfaces with exceptional clarity
- Seamless multi-venue experience storytelling

## Typography

**Font System:**
- Primary: Inter or DM Sans (900, 700, 600, 500, 400 weights)
- Headings: 700-900 weight, very tight letter-spacing (-0.02em to -0.04em)
- Body: 400-500 weight, comfortable line-height (1.6-1.7)

**Hierarchy:**
- Hero Headlines: text-6xl to text-8xl (very bold, uppercase or sentence case)
- Section Titles: text-4xl to text-5xl (bold, tight spacing)
- Subsections: text-2xl to text-3xl (semibold)
- Body Text: text-base to text-lg (regular to medium)
- Captions/Labels: text-sm (medium, uppercase tracking-wide)

## Layout System

**Spacing Primitives:** Use Tailwind units of 3, 4, 6, 8, 12, 16, 20, 24, 32
- Micro spacing: p-3, gap-4
- Component spacing: p-6, p-8, py-12
- Section spacing: py-16, py-20, py-24, py-32

**Container Strategy:**
- Full-width sections with inner max-w-7xl for content
- Hero/Feature sections: Use full viewport width with centered max-w-7xl containers
- Dashboard views: max-w-screen-2xl for data-heavy layouts
- Form containers: max-w-3xl for optimal focus

**Grid Systems:**
- Feature showcases: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard metrics: grid-cols-2 lg:grid-cols-4
- Exhibitor directory: grid-cols-1 lg:grid-cols-2 xl:grid-cols-3
- Mobile: Always stack to single column

## Component Library

### Navigation
- Sticky top navigation with subtle backdrop blur
- Prominent logo (left), primary CTA buttons (right)
- Multi-level mega menu for sectors/features
- Mobile: Full-screen overlay navigation with large touch targets

### Hero Section
**Large Hero Image:** Full-width professional photography showcasing Gulfood event atmosphere (exhibition halls, international attendees, premium F&B displays)
- Overlay: Subtle gradient (dark bottom to transparent) for text legibility
- Height: 85vh on desktop, 70vh on mobile
- Content: Bold headline + supporting text + dual CTAs (Register + Learn More)
- CTAs: Buttons with blurred backgrounds (backdrop-blur-md with semi-transparent bg)

### Cards & Content Blocks
- Elevated cards: Subtle shadows (shadow-lg), rounded corners (rounded-xl to rounded-2xl)
- Hover states: Gentle lift effect (transform scale-105), increased shadow
- Icon placement: Top-aligned with generous spacing below (mb-6)
- Content density: Balanced whitespace, never cramped

### Data Visualization (Dashboard)
- Large stat cards: Grid layout with prominent numbers (text-5xl font-bold)
- Charts: Clean, minimal styling with data prominence
- Progress indicators: Bold linear progress bars with percentage labels
- Heat maps: Gradient-based visual encoding

### Forms & Inputs
- Generous input fields: py-3 px-4, rounded-lg borders
- Clear labels: text-sm font-medium mb-2
- Helper text: text-xs below inputs
- Multi-step forms: Progress indicator at top
- AI-enhanced fields: Subtle animated indicator when AI is processing

### AI Chatbot Widget
- Floating bottom-right position (fixed)
- Prominent trigger button (rounded-full, large size)
- Slide-up panel interface: rounded-t-2xl, shadow-2xl
- Message bubbles: Distinct styling for user vs. AI responses
- Quick action chips: Pill-shaped buttons for common queries

### Interactive Elements
- Primary buttons: Bold, high contrast, generous padding (px-8 py-3)
- Secondary buttons: Outlined variant with hover fill
- Icon buttons: Consistent sizing (w-10 h-10 or w-12 h-12)
- Links: Underline on hover, subtle transition

## Page-Specific Layouts

### Visitor Portal
- Company analyzer: Split layout - input form (left) + AI-generated insights card (right)
- Event planner: Calendar view with sidebar exhibitor recommendations
- Meeting scheduler: Directory grid + detail drawer/modal

### Exhibitor Portal  
- Relevance assessment: Multi-step wizard with progress tracking
- Competitive analysis: Side-by-side comparison tables
- Sales connection: Prominent contact cards with clear CTAs

### Organizer Dashboard
- KPI overview: 4-column metric cards at top
- Charts section: 2-column grid of analytics visualizations
- Real-time feed: Sidebar with live activity stream
- Export controls: Sticky action bar at top-right

## Images

**Hero Section:** Large, premium photography of Gulfood event - bustling exhibition halls with international exhibitors, premium food displays, networking moments. Image should convey scale and sophistication.

**Feature Sections:** 
- AI analyzer section: Modern digital interface visuals or abstract tech imagery
- Event planning section: Calendar/schedule interface mockup or venue photography
- Exhibitor section: Professional trade show booth imagery

**Dashboard:** Data visualization screenshots, analytics interface examples

**About/Trust Section:** DWTC venue photography, past event highlights

## Accessibility

- WCAG 2.1 AA compliance throughout
- Minimum 4.5:1 contrast ratios for text
- Focus indicators: 2px solid ring with offset
- Keyboard navigation: Clear focus states, logical tab order
- RTL support: Fully mirrored layouts for Arabic
- Screen reader: Semantic HTML, ARIA labels where needed
- Form validation: Clear error states with descriptive messages

## Animations

**Minimal, Purposeful Motion:**
- Page transitions: Subtle fade-in (300ms ease)
- Card hovers: Transform + shadow (200ms ease-out)
- AI processing: Subtle pulse/shimmer on loading states
- No scroll-triggered animations
- No auto-playing carousels

## Responsive Behavior

- Mobile-first approach
- Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- Touch-friendly targets: Minimum 44x44px
- Simplified navigation on mobile
- Stacked layouts prioritizing content hierarchy