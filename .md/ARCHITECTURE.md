# AUREL SYSTEM ARCHITECTURE AND CODEBASE DOCUMENTATION

## 1. Brand Identity
Brand Name: AUREL
Tagline: Made With Love For You
Philosophy: AUREL helps people turn special moments into something they can hold, see, and remember.

## 2. Color Palette and 60 30 10 Distribution Rule
Canvas Foundation (60%):
Warm ivory and soft beige neutral surfaces (Light Mode: #FAF7F2, #FFFFFF. Dark Mode: #181615, #1C1817)

Brand Identity Accent (30%):
Soft blush tints, champagne tones, and warm floral neutrals (#F4E7E1, #E8D4CB, #8E5E58, #342724)

Interactive Button Accent (10%):
Harmonious rose gold and terracotta rose family (#B36D6D, #9E5B5B)

## 3. Typography
Display and Headings: Playfair Display and Cormorant Garamond serif fonts
Body and Controls: Plus Jakarta Sans refined sans serif font
No generic fonts and no aerial fonts permitted.

## 4. Component Structure
Navigation: Sticky top bar with brand wordmark, theme switch, AI Concierge button, animated bag counter, and menu button
Sidebar: Fluid animated sliding drawer with category navigation, AI Concierge link, custom mix and match studio link, and concierge links
Hero: Motion animated headline, mouse parallax image card, and soft progress pills
Moments Section: Emotional reason cards for birthdays, anniversaries, milestones, and just because
Category Grid: Visual cards for custom magazines, hampers, bouquets, and single flowers
Product Catalog: Interactive product showcase with sorting by recommended, highest rated, most reviewed, and price
Magazine Showcase: Live interactive preview where typing recipient name updates masthead in real time
Custom Gift Builder: Interactive mix and match studio enabling custom hampers by selecting boxes, flowers, candles, cards, and treats
Product Detail View: Faded non static page transition view with finish selectors, quantity controls, and reviews
Cart Drawer: Slide over mini bag with free shipping indicator and itemized subtotal
Checkout Modal: Security hardened order form with Razorpay and UPI selection, input sanitization, error feedback, and WhatsApp transmission
Chatbot Modal: Gemini AI multi-turn conversational concierge (`server.ts` proxy endpoint `/api/chat` using `gemini-3.5-flash` or `gemini-3.1-flash-lite`)

## 5. Gemini Integration Architecture
Server Side Handler (`server.ts`):
- Uses modern `@google/genai` TypeScript SDK with `User-Agent: aistudio-build` telemetry
- Secure proxy route: `POST /api/chat`
- Models: `gemini-3.5-flash` (General creative consultation) and `gemini-3.1-flash-lite` (High speed responses)
- Custom System Instruction establishing persona as AUREL Bespoke Gifting Concierge & Memory Stylist
- Full multi-turn conversation history preserved across turns
- Frontend never accesses raw Gemini API keys
