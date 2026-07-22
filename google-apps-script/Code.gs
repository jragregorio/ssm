const SHEET_NAME = "Orders";
const PRODUCTS_SHEET_NAME = "Products";
const ORDER_PREFIX = "AHSOM";
const MAX_CART_LINES = 20;
const MAX_NOTES_LENGTH = 300;
const RATE_LIMIT_SECONDS = 60;
const DUPLICATE_WINDOW_SECONDS = 10 * 60;
const HEADERS = [
  "Order ID",
  "Timestamp",
  "Status",
  "Customer Name",
  "Mobile Number",
  "Fulfillment Type",
  "Address Or Meetup Note",
  "Additional Notes",
  "Items Summary",
  "Items JSON",
  "Total Items",
  "Subtotal",
  "Currency",
  "Submitted At ISO"
];
const PRODUCT_HEADERS = [
  "ID",
  "Name",
  "Price",
  "Unit",
  "Eyebrow",
  "Description",
  "Image",
  "Sort",
  "Active"
];
const DEFAULT_PRODUCTS = [
  ["pompano", "Pompano", 340, "/ kilo", "Best Seller", "Clean, mild-flavored whole fish that works well for steaming, frying, or simple home-style meals.", "images/product-pompano.png", 10, true],
  ["tilapia", "Tilapia", 125, "", "Daily Catch", "Budget-friendly everyday fish that is easy to fry, grill, or cook in familiar Filipino recipes.", "images/product-tilapia.png", 20, false],
  ["salmon", "Salmon", 600, "/ kilo", "Premium Cut", "Rich, premium salmon that is ideal for baking, pan-searing, or serving as a special family meal.", "images/product-salmon.png", 30, true],
  ["shrimp", "Shrimp", 530, "/ kilo", "Market Favorite", "Fresh shrimp for stir-fry, butter garlic dishes, soups, and quick seafood platters at home.", "images/product-shrimp.png", 40, true],
  ["bangus", "Bangus", 200, "/ kilo", "Home Favorite", "Classic milkfish option for grilling, frying, or everyday family recipes with familiar local flavor.", "images/product-bangus.png", 50, true],
  ["sugpo", "Sugpo", 1400, "", "Large Prawns", "Large prawns for grilling, buttered seafood plates, and special-occasion family meals.", "images/product-sugpo.png", 60, true],
  ["tahong", "Tahong", 170, "", "Shellfish", "Fresh mussels that are great for soups, steaming, or simple garlic-butter preparations.", "images/product-tahong.png", 70, false],
  ["hasa-hasa", "Hasa Hasa", 350, "", "Daily Fish", "Versatile fish option for frying or stewing, added from your handwritten market list.", "images/product-hasa-hasa.png", 80, false],
  ["squid", "Squid", 450, "/ kilo", "Seafood Staple", "Fresh squid for adobo, calamares, stuffing, or classic seafood dishes at home.", "images/product-squid.png", 90, false],
  ["matambaka", "Matambaka", 300, "", "Local Pick", "Local fish choice for simple frying and grilling, with pricing taken from your attached list.", "images/product-matambaka.png", 100, false]
];

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);

    if (payload && payload.action) {
      return handleProductPost_(payload);
    }

    const validated = validatePayload_(payload);
    enforceRequestGuards_(validated);

    const sheet = getOrdersSheet_();
    const orderId = getNextOrderId_(sheet);

    sheet.appendRow([
      orderId,
      new Date(),
      validated.status,
      validated.customerName,
      validated.customerPhone,
      validated.fulfillmentType,
      validated.customerAddress,
      validated.customerNotes,
      validated.itemsSummary,
      JSON.stringify(validated.items),
      validated.totalItems,
      validated.subtotal,
      validated.currency,
      validated.submittedAt
    ]);

    rememberOrderGuardState_(validated);

    return jsonResponse_({
      ok: true,
      message: "Order saved."
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error.message
    });
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = normalizeWhitespace_(params.action) || "ping";

    if (action === "products") {
      const includeInactive = String(params.all || "") === "1";
      if (includeInactive) {
        requireAdminToken_(params.adminToken);
      }
      return jsonResponse_({
        ok: true,
        products: listProducts_(!includeInactive)
      });
    }

    if (action === "verifyAdmin") {
      requireAdminToken_(params.adminToken);
      return jsonResponse_({
        ok: true,
        message: "Admin token accepted."
      });
    }

    if (action === "upsertProduct" || action === "setProductActive" || action === "deleteProduct") {
      return handleProductGetAction_(action, params);
    }

    return jsonResponse_({
      ok: true,
      message: "Orders endpoint is running."
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error.message
    });
  }
}

function handleProductGetAction_(action, params) {
  requireAdminToken_(params.adminToken);

  if (action === "upsertProduct") {
    const product = upsertProduct_({
      id: params.id,
      name: params.name,
      price: params.price,
      unit: params.unit,
      eyebrow: params.eyebrow,
      description: params.description,
      image: params.image,
      sort: params.sort,
      active: params.active
    });
    return jsonResponse_({
      ok: true,
      message: "Product saved.",
      product: product
    });
  }

  if (action === "deleteProduct") {
    const product = deleteProduct_(params.id);
    return jsonResponse_({
      ok: true,
      message: "Product deleted.",
      product: product
    });
  }

  const product = setProductActive_(params.id, params.active);
  return jsonResponse_({
    ok: true,
    message: "Product visibility updated.",
    product: product
  });
}

function handleProductPost_(payload) {
  const action = normalizeWhitespace_(payload.action);

  if (action === "verifyAdmin") {
    requireAdminToken_(payload.adminToken);
    return jsonResponse_({
      ok: true,
      message: "Admin token accepted."
    });
  }

  if (action === "upsertProduct") {
    requireAdminToken_(payload.adminToken);
    const product = upsertProduct_(payload.product || payload);
    return jsonResponse_({
      ok: true,
      message: "Product saved.",
      product: product
    });
  }

  if (action === "setProductActive") {
    requireAdminToken_(payload.adminToken);
    const product = setProductActive_(payload.id, payload.active);
    return jsonResponse_({
      ok: true,
      message: "Product visibility updated.",
      product: product
    });
  }

  if (action === "deleteProduct") {
    requireAdminToken_(payload.adminToken);
    const product = deleteProduct_(payload.id);
    return jsonResponse_({
      ok: true,
      message: "Product deleted.",
      product: product
    });
  }

  throw new Error("Unknown action.");
}

function requireAdminToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
  if (!expected) {
    throw new Error("ADMIN_TOKEN is not configured in Script Properties.");
  }
  if (normalizeWhitespace_(token) !== expected) {
    throw new Error("Unauthorized. Check your admin password.");
  }
}

function listProducts_(activeOnly) {
  const sheet = getProductsSheet_();
  ensureProductsSheetStructure_(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, PRODUCT_HEADERS.length).getValues();
  const products = values
    .map(rowToProduct_)
    .filter(function (product) {
      return product && product.id && product.name;
    });

  products.sort(function (a, b) {
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }
    return a.name.localeCompare(b.name);
  });

  if (activeOnly) {
    return products.filter(function (product) {
      return product.active;
    });
  }

  return products;
}

function rowToProduct_(row) {
  return {
    id: normalizeWhitespace_(row[0]),
    name: normalizeWhitespace_(row[1]),
    price: roundMoney_(Number(row[2]) || 0),
    unit: normalizeWhitespace_(row[3]),
    eyebrow: normalizeWhitespace_(row[4]),
    description: normalizeWhitespace_(row[5]),
    image: normalizeWhitespace_(row[6]),
    sort: Number(row[7]) || 0,
    active: toBoolean_(row[8])
  };
}

function productToRow_(product) {
  return [
    product.id,
    product.name,
    product.price,
    product.unit,
    product.eyebrow,
    product.description,
    product.image,
    product.sort,
    product.active ? true : false
  ];
}

function upsertProduct_(input) {
  const sheet = getProductsSheet_();
  ensureProductsSheetStructure_(sheet);

  const name = normalizeWhitespace_(input && input.name);
  if (!name) {
    throw new Error("Product name is required.");
  }

  let id = normalizeProductId_(input && input.id);
  if (!id) {
    id = slugifyProductId_(name);
  }

  const price = roundMoney_(Number(input && input.price));
  if (!isFinite(price) || price < 0) {
    throw new Error("Product price is invalid.");
  }

  const product = {
    id: id,
    name: name,
    price: price,
    unit: normalizeWhitespace_(input && input.unit),
    eyebrow: normalizeWhitespace_(input && input.eyebrow),
    description: normalizeWhitespace_(input && input.description),
    image: normalizeWhitespace_(input && input.image) || "images/product-pompano.png",
    sort: parseSortValue_(input && input.sort),
    active: input && input.active === undefined ? true : toBoolean_(input.active)
  };

  if (!isFinite(product.sort)) {
    product.sort = nextProductSort_(sheet);
  }

  const rowIndex = findProductRowIndex_(sheet, product.id);
  const rowValues = productToRow_(product);

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, PRODUCT_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return product;
}

function setProductActive_(id, active) {
  const sheet = getProductsSheet_();
  ensureProductsSheetStructure_(sheet);
  const productId = normalizeProductId_(id);

  if (!productId) {
    throw new Error("Product id is required.");
  }

  const rowIndex = findProductRowIndex_(sheet, productId);
  if (rowIndex < 0) {
    throw new Error("Product not found.");
  }

  const row = sheet.getRange(rowIndex, 1, 1, PRODUCT_HEADERS.length).getValues()[0];
  const product = rowToProduct_(row);
  product.active = toBoolean_(active);
  sheet.getRange(rowIndex, 1, 1, PRODUCT_HEADERS.length).setValues([productToRow_(product)]);
  return product;
}

function deleteProduct_(id) {
  const sheet = getProductsSheet_();
  ensureProductsSheetStructure_(sheet);
  const productId = normalizeProductId_(id);

  if (!productId) {
    throw new Error("Product id is required.");
  }

  const rowIndex = findProductRowIndex_(sheet, productId);
  if (rowIndex < 0) {
    throw new Error("Product not found.");
  }

  const row = sheet.getRange(rowIndex, 1, 1, PRODUCT_HEADERS.length).getValues()[0];
  const product = rowToProduct_(row);
  sheet.deleteRow(rowIndex);
  return product;
}

function findProductRowIndex_(sheet, productId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (normalizeProductId_(ids[index][0]) === productId) {
      return index + 2;
    }
  }

  return -1;
}

function nextProductSort_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 10;
  }

  const sorts = sheet.getRange(2, 8, lastRow - 1, 1).getValues();
  let maxSort = 0;
  for (let index = 0; index < sorts.length; index += 1) {
    const value = Number(sorts[index][0]) || 0;
    if (value > maxSort) {
      maxSort = value;
    }
  }
  return maxSort + 10;
}

function getProductsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(PRODUCTS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(PRODUCTS_SHEET_NAME);
  }

  return sheet;
}

function ensureProductsSheetStructure_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(PRODUCT_HEADERS);
    seedDefaultProducts_(sheet);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), PRODUCT_HEADERS.length)).getValues()[0];
  const headerMismatch = PRODUCT_HEADERS.some(function (header, index) {
    return normalizeWhitespace_(currentHeaders[index]) !== header;
  });

  if (headerMismatch) {
    sheet.getRange(1, 1, 1, PRODUCT_HEADERS.length).setValues([PRODUCT_HEADERS]);
  }

  if (sheet.getLastRow() === 1) {
    seedDefaultProducts_(sheet);
  }
}

function seedDefaultProducts_(sheet) {
  DEFAULT_PRODUCTS.forEach(function (row) {
    sheet.appendRow(row);
  });
}

function normalizeProductId_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyProductId_(name) {
  return normalizeProductId_(name) || "product-" + Date.now();
}

function toBoolean_(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
}

function parseSortValue_(value) {
  if (value === "" || value === null || value === undefined) {
    return NaN;
  }
  return Number(value);
}

function parseRequestBody_(e) {
  const raw = (e && e.postData && e.postData.contents) || "{}";
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid request payload.");
  }
}

function validatePayload_(payload) {
  const customerName = normalizeWhitespace_(payload.customerName);
  const customerPhone = normalizePhone_(payload.customerPhone);
  const fulfillmentType = normalizeWhitespace_(payload.fulfillmentType);
  const customerAddress = normalizeWhitespace_(payload.customerAddress);
  const customerNotes = normalizeWhitespace_(payload.customerNotes);
  const honeypot = normalizeWhitespace_(payload.website);
  const status = normalizeWhitespace_(payload.status) || "New";
  const currency = normalizeWhitespace_(payload.currency) || "PHP";
  const submittedAt = normalizeWhitespace_(payload.submittedAt);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (honeypot) {
    throw new Error("Unable to process this request. Please refresh and try again.");
  }

  if (!customerName) {
    throw new Error("Please enter your full name before placing an order.");
  }

  if (!/^09\d{9}$/.test(customerPhone)) {
    throw new Error("Please enter a valid PH mobile number (example: 09XXXXXXXXX).");
  }

  if (fulfillmentType !== "Delivery" && fulfillmentType !== "Pickup") {
    throw new Error("Please select Delivery or Pickup before placing an order.");
  }

  if (fulfillmentType === "Delivery" && !customerAddress) {
    throw new Error("Please enter the delivery address before placing the order.");
  }

  if (customerNotes.length > MAX_NOTES_LENGTH) {
    throw new Error("Notes are too long. Please keep additional notes under 300 characters.");
  }

  if (rawItems.length === 0) {
    throw new Error("Add at least one item before placing an order.");
  }

  if (rawItems.length > MAX_CART_LINES) {
    throw new Error("Your cart has too many item lines. Please keep it to 20 items or fewer.");
  }

  const items = rawItems.map(normalizeLineItem_);
  const totalItems = items.reduce(function (sum, item) {
    return sum + item.quantity;
  }, 0);
  const subtotal = roundMoney_(items.reduce(function (sum, item) {
    return sum + item.price * item.quantity;
  }, 0));
  const submittedSubtotal = roundMoney_(Number(payload.subtotal) || 0);

  if (Math.abs(subtotal - submittedSubtotal) > 0.01) {
    throw new Error("Order total mismatch detected. Please refresh your cart and try again.");
  }

  if (!submittedAt || isNaN(new Date(submittedAt).getTime())) {
    throw new Error("Invalid submitted timestamp.");
  }

  return {
    status: status,
    customerName: customerName,
    customerPhone: customerPhone,
    fulfillmentType: fulfillmentType,
    customerAddress: customerAddress,
    customerNotes: customerNotes,
    items: items,
    itemsSummary: items.map(function (item) {
      return item.name + " x" + item.quantity;
    }).join(", "),
    totalItems: totalItems,
    subtotal: subtotal,
    currency: currency,
    submittedAt: submittedAt,
    signature: buildOrderSignature_(customerPhone, fulfillmentType, customerAddress, items, subtotal)
  };
}

function normalizeLineItem_(item) {
  const name = normalizeWhitespace_(item && item.name);
  const unit = normalizeWhitespace_(item && item.unit);
  const price = Number(item && item.price);
  const quantity = Number(item && item.quantity);

  if (!name) {
    throw new Error("One or more cart items has an invalid name.");
  }

  if (!isFinite(price) || price < 0) {
    throw new Error("One or more cart items has an invalid price.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("One or more cart items has an invalid quantity.");
  }

  return {
    name: name,
    unit: unit,
    price: roundMoney_(price),
    quantity: quantity
  };
}

function enforceRequestGuards_(validated) {
  const cache = CacheService.getScriptCache();
  const rateKey = "rate:" + validated.customerPhone;
  const duplicateKey = "dup:" + validated.signature;

  if (cache.get(rateKey)) {
    throw new Error("You just sent an order. Please wait about 1 minute before sending another request.");
  }

  if (cache.get(duplicateKey)) {
    throw new Error("This order looks identical to one sent recently. If this is intentional, please wait 10 minutes or edit your order.");
  }
}

function rememberOrderGuardState_(validated) {
  const cache = CacheService.getScriptCache();
  cache.put("rate:" + validated.customerPhone, "1", RATE_LIMIT_SECONDS);
  cache.put("dup:" + validated.signature, "1", DUPLICATE_WINDOW_SECONDS);
}

function buildOrderSignature_(phone, fulfillmentType, customerAddress, items, subtotal) {
  const canonicalItems = items
    .map(function (item) {
      return {
        name: normalizeWhitespace_(item.name).toLowerCase(),
        price: roundMoney_(item.price),
        quantity: item.quantity
      };
    })
    .sort(function (a, b) {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      if (a.price < b.price) return -1;
      if (a.price > b.price) return 1;
      return a.quantity - b.quantity;
    })
    .map(function (item) {
      return item.name + "|" + item.price.toFixed(2) + "|" + item.quantity;
    })
    .join(";");

  return [
    normalizePhone_(phone),
    normalizeWhitespace_(fulfillmentType).toLowerCase(),
    normalizeWhitespace_(customerAddress).toLowerCase(),
    canonicalItems,
    roundMoney_(subtotal).toFixed(2)
  ].join("::");
}

function normalizeWhitespace_(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function roundMoney_(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  return sheet;
}

function ensureSheetStructure_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (currentHeaders[0] !== HEADERS[0]) {
    sheet.insertColumnBefore(1);
    backfillOrderIds_(sheet);
  }

  if (sheet.getLastColumn() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), HEADERS.length - sheet.getLastColumn());
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function backfillOrderIds_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const idRange = sheet.getRange(2, 1, lastRow - 1, 1);
  const idValues = idRange.getValues();

  for (let index = 0; index < idValues.length; index += 1) {
    if (!idValues[index][0]) {
      idValues[index][0] = buildOrderId_(index + 1);
    }
  }

  idRange.setValues(idValues);
}

function getNextOrderId_(sheet) {
  ensureSheetStructure_(sheet);
  return buildOrderId_(sheet.getLastRow());
}

function buildOrderId_(number) {
  return ORDER_PREFIX + "-" + String(number).padStart(4, "0");
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
