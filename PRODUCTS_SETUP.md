# Product Listings Setup

The storefront loads active products from a **Products** sheet via the same Google Apps Script web app used for orders. Use **`admin.html`** to add, edit, show, or hide listings.

## What you need

1. The existing orders Google Sheet (same spreadsheet as **Orders**).
2. Updated Apps Script from [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. An admin password stored in Script Properties (not in git).

## One-time setup

### 1. Update Apps Script

1. Open your orders Google Sheet → **Extensions** → **Apps Script**.
2. Replace the project code with the latest [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Save the project.

### 2. Set the admin password

1. In Apps Script: **Project Settings** (gear) → **Script Properties**.
2. Add a property:
   - Property: `ADMIN_TOKEN`
   - Value: a strong password you will use on `admin.html`
3. Save.

Do **not** commit this password to the repository.

### 3. Redeploy the web app

1. **Deploy** → **Manage deployments** → edit the existing web app deployment (pencil).
2. Version: **New version**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy.

Keep using the same web app URL already set as `ORDER_ENDPOINT` in `index.html` and `API_ENDPOINT` in `admin.html`. If Google gives you a new URL, update both files.

### 4. Create / seed the Products sheet

On first product API call, the script creates a **Products** tab and seeds the current catalog if the sheet is empty.

You can also create the tab manually:

| ID | Name | Price | Unit | Eyebrow | Description | Image | Sort | Active |
|----|------|-------|------|---------|-------------|-------|------|--------|

Optional: import [`google-apps-script/products-seed.csv`](google-apps-script/products-seed.csv) into a sheet named **Products**.

**Active** = `TRUE` shows on the shop; `FALSE` hides it (same idea as the old hidden cards).

### 5. Open the admin page

1. Publish / push the site so `admin.html` is on GitHub Pages.
2. Visit `…/admin.html` (not linked from the public nav).
3. Sign in with the `ADMIN_TOKEN` password.
4. Add, edit, show/hide, or delete listings. Image field should be a path like `images/product-pompano.png` or a public URL (no upload in v1). Prefer **Hide** over **Delete** if you might sell the item again.

## API quick reference

Same web app URL as orders:

| Call | Purpose |
|------|---------|
| `GET ?action=products` | Active products for the shop |
| `GET ?action=products&all=1&adminToken=…` | All products for admin |
| `GET ?action=verifyAdmin&adminToken=…` | Check password |
| `GET ?action=upsertProduct&adminToken=…&name=…&price=…` | Create / update |
| `GET ?action=setProductActive&adminToken=…&id=…&active=true\|false` | Show / hide |
| `GET ?action=deleteProduct&adminToken=…&id=…` | Permanently delete a row |

Writes also accept `POST` JSON with an `action` field; the admin UI uses **GET** so the browser can read the JSON response (Apps Script POST responses are awkward with CORS).

## Notes

- Orders still work the same way (`POST` without `action`).
- Changing a product **name** can leave old names in customer carts until they refresh.
- Rotate `ADMIN_TOKEN` in Script Properties if it is ever shared or leaked.
