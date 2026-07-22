# AHSOM

**Alabang Hills Seafood Online Market** — a simple customer-facing storefront for Marik. Shoppers browse seafood, build a cart, and submit an order request. Totals on the site are estimates; fulfillment, final pricing, and payment happen offline after you review each order.

## What’s in this repo

| Path | Purpose |
|------|--------|
| [`index.html`](index.html) | Single-page site: catalog, cart, checkout form, and client script that posts orders to your backend URL. |
| [`admin.html`](admin.html) | Password-gated admin page to add, edit, show, or hide product listings. |
| [`google-apps-script/Code.gs`](google-apps-script/Code.gs) | Google Apps Script web app: orders → **Orders** sheet; products → **Products** sheet. |
| [`ORDER_SETUP.md`](ORDER_SETUP.md) | Step-by-step setup: Sheet, deploy web app, paste URL into the site, suggested column workflow and status colors. |
| [`PRODUCTS_SETUP.md`](PRODUCTS_SETUP.md) | Products sheet, admin password (`ADMIN_TOKEN`), and `admin.html` usage. |

## Features

- Responsive layout, sticky header, cart indicator  
- First-visit mobile app tour (replay from About → Take a quick tour)  
- Product catalog loaded from Google Sheets (active items only)  
- Checkout collects name, phone, fulfillment type, address or meetup notes, and optional notes  
- Orders stored in Google Sheets for manual confirmation (availability, weight, delivery fee, payment method)
- Admin page for adding and updating listings without editing HTML

## Tech stack

- **Front end:** static HTML, CSS, and vanilla JavaScript (no build step)  
- **Back end:** Google Apps Script + Google Sheets  

## Quick start (local preview)

1. Clone the repository.  
2. Open `index.html` in a browser, or serve the folder with any static file server.  
3. For live submissions and the live catalog, complete the Google Apps Script deployment and set `ORDER_ENDPOINT` in `index.html` as described in [`ORDER_SETUP.md`](ORDER_SETUP.md) and [`PRODUCTS_SETUP.md`](PRODUCTS_SETUP.md).

## Hosting on GitHub Pages

If this repo is published with GitHub Pages from the default branch and root (or the folder that contains `index.html`), the storefront URL will be your `*.github.io` address. After changing `ORDER_ENDPOINT`, commit and push so the live site can reach your web app. Open `/admin.html` for listings (not linked in public nav).

## Important

This project **does not** process card or online wallet payments. It only captures order requests and sends them to your sheet for follow-up.

## Changelog

### v1.7.2

- Skeleton product cards and clearer loading label while the catalog loads from Sheets

### v1.7.1

- Larger guided-tour popovers, text, and buttons for easier reading (40+ friendly)
- Cart and cart-button tour spotlights fixed so the right control stays visible
- About → **Take a quick tour** button is full width

### v1.7.0

- First-visit mobile guided tour: bottom navbar, each menu option, cart view, and Add to Cart
- Replay anytime from About → **Take a quick tour**

### v1.6.0

- Product catalog loads from a **Products** Google Sheet via Apps Script (no more hardcoded cards in HTML)
- New password-gated [`admin.html`](admin.html) to add, edit, show, or hide listings
- Setup guide: [`PRODUCTS_SETUP.md`](PRODUCTS_SETUP.md)

### v1.5.1

- About popup body text is justified for a cleaner, more even reading layout

### v1.5.0

- Mobile home page goes straight to **Featured Seafood** (hero hidden on phones)
- Larger full-width **Add to Cart** buttons on product cards for easier tapping
- **Remove all items** in cart: full-width centered pill with a larger tap target (still destructive styling with confirmation)

### v1.4.0

- Mobile bottom navigation with centered cart button, white bordered bar, and larger tap targets for easier use on phones
- Horizontal product cards and simplified mobile header (replaced hamburger drawer)
- Cart sheet: swipe-down drag handle, themed scrollbar, and clearer actions — **Send order request**, **Back to shop**, and **Remove all items** (with confirmation)
- Desktop layout unchanged above 860px width

### v1.3.0

- Order notifications via ntfy and lightweight order hardening checks

---

For sheet columns, status suggestions, and upgrading an existing **Orders** tab, see **[ORDER_SETUP.md](ORDER_SETUP.md)**.  
For the **Products** sheet and admin page, see **[PRODUCTS_SETUP.md](PRODUCTS_SETUP.md)**.
