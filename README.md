# AUREL Luxury Bespoke Keepsakes Platform

Brand: AUREL
Tagline: Made With Love For You

AUREL helps people turn special moments into something they can hold, see, and remember.

## Overview
AUREL is an editorial luxury e commerce application crafted for bespoke gifting experiences. It offers custom magazines for anniversaries and birthdays in matte and gloss finishes, artisanal curated hampers, fresh luxury bouquets, and preserved single blossoms.

## Core Features and Innovations

1. Gemini AI Concierge & Memory Stylist:
Integrated multi-turn conversational AI chatbot using the modern @google/genai TypeScript SDK on the server (`server.ts`). Maintains continuous conversation history, scrollable thread, inspirational suggestion chips, and brand-tailored system instructions to advise on heartfelt dedication messages, gifts, and bespoke finishes.

2. Fluid Animated Sidebar:
A smooth sliding navigation panel with spring physics. Seamlessly lists all product categories, an interactive Mix and Match Custom Studio, brand philosophy, and concierge assistance. Navigating opens pages with faded transitions without static jumps.

3. Real Time Magazine Customizer:
Visitors can enter the recipient name, celebration occasion, and dedication message. The magazine cover updates in real time on screen, offering an instant preview of Matte versus Gloss finishes.

4. Mix and Match Custom Gift Studio:
A dedicated studio allowing customers to choose their presentation gift box, individual floral stems, scented candles, keepsake booklets, confections, and personalized wax sealed letters. Live subtotal calculation and direct addition to bag.

5. Fluid Bag Drawer and Sorting Controls:
Slide over bag with real time quantity adjusters, subtotal tracking, and free delivery thresholds. Dedicated sorting controls supporting Recommended, Highest Rated, Most Reviewed, Price Low to High, Price High to Low, and Newest.

6. Light and Dark Theme Transition:
Smooth theme switcher shifting between warm ivory beige and warm obsidian noir, with automatic text contrast adaptation and zero hard colors.

7. 60 30 10 Color Architecture:
60 percent neutral ivory and beige canvas, 30 percent brand pink tints and warm florals, 10 percent highlight action buttons in the warm rose gold family.

8. Razorpay and WhatsApp Checkout:
Integrated checkout popup supporting Razorpay gateway, Google Pay, PhonePe, Paytm, and cards. Upon order confirmation, the order details including customer name, phone number, delivery address, items, and exact payment timestamp are linked directly to WhatsApp.

## Security Audit and Protections

• Server-Side Gemini API Execution: All Gemini API requests run via `server.ts` with telemetry headers; the API key is never exposed to browser client bundles.
• Cross Site Scripting Prevention: Free text inputs (Recipient Name, Dedication Note, Delivery Address) are sanitized by stripping script tags, event handlers, and javascript protocols.
• Form Input Validation: Mandatory fields throw clear descriptive errors (such as Error: Name not mentioned, Error: Phone number not valid).
• URL Parameter Protection: All WhatsApp messages are encoded via standard URI encoding to prevent injection.
• State Integrity: Item prices and calculations are validated against catalog data to prevent tampering.

## Running the Application

To run in development mode:
npm run dev

To verify and build for production:
npm run build
