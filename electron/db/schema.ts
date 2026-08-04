import type { Database } from 'better-sqlite3'

export const MIGRATIONS: { version: number; up: (db: Database) => void }[] = [
  {
    version: 1,
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
          recovery_code_hash TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          supplier_id INTEGER REFERENCES suppliers(id),
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS product_variants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL REFERENCES products(id),
          dimension TEXT NOT NULL,
          price INTEGER NOT NULL,
          sku TEXT
        );

        CREATE TABLE IF NOT EXISTS stock_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_variant_id INTEGER NOT NULL UNIQUE REFERENCES product_variants(id),
          quantity_on_hand INTEGER NOT NULL DEFAULT 0,
          low_stock_threshold INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER REFERENCES customers(id),
          created_by INTEGER NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'delivered', 'cancelled')),
          wilaya TEXT,
          delivery_address TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL REFERENCES sales(id),
          product_variant_id INTEGER REFERENCES product_variants(id),
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          unit_price_at_sale INTEGER NOT NULL,
          custom_description TEXT
        );

        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL REFERENCES sales(id),
          amount INTEGER NOT NULL CHECK (amount >= 0),
          type TEXT NOT NULL CHECK (type IN ('deposit', 'balance', 'full')),
          entered_as_percentage INTEGER,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
          change INTEGER NOT NULL,
          reason TEXT NOT NULL CHECK (reason IN ('sale', 'restock', 'adjustment')),
          reference_id INTEGER,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          created_by INTEGER NOT NULL REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS receipt_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          store_name TEXT NOT NULL DEFAULT 'My Life Mattress',
          logo_path TEXT,
          default_deposit_percentages TEXT NOT NULL DEFAULT '[30,50,70]',
          show_delivery_note INTEGER NOT NULL DEFAULT 1,
          show_phone_on_receipt INTEGER NOT NULL DEFAULT 1,
          show_quantity_on_receipt INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        INSERT OR IGNORE INTO receipt_settings (id) VALUES (1);

        CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
        CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_item_id ON stock_movements(stock_item_id);
        CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
        CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      `)
    },
  },
  {
    version: 2,
    up(db) {
      db.exec(`
        ALTER TABLE product_variants ADD COLUMN name TEXT;
      `)
    },
  },
  {
    version: 3,
    up(db) {
      db.exec(`
        ALTER TABLE products ADD COLUMN image_path TEXT;
      `)
    },
  },
  {
    version: 4,
    up(db) {
      db.exec(`
        ALTER TABLE receipt_settings ADD COLUMN dimension_presets TEXT NOT NULL DEFAULT '["90x190","160x190","180x200"]';
      `)
    },
  },
  {
    version: 5,
    up(db) {
      db.exec(`
        ALTER TABLE sales ADD COLUMN free_delivery INTEGER NOT NULL DEFAULT 0;
      `)
    },
  },
  {
    version: 6,
    up(db) {
      db.exec(`
        ALTER TABLE receipt_settings ADD COLUMN receipt_width_mm INTEGER NOT NULL DEFAULT 80;
        ALTER TABLE receipt_settings ADD COLUMN receipt_height_mm INTEGER;
        ALTER TABLE receipt_settings ADD COLUMN receipt_font_scale REAL NOT NULL DEFAULT 1;
      `)
    },
  },
  {
    version: 7,
    up(db) {
      db.exec(`
        ALTER TABLE receipt_settings ADD COLUMN employees_see_delivered INTEGER NOT NULL DEFAULT 0;
      `)
    },
  },
  {
    version: 8,
    up(db) {
      db.exec(`
        ALTER TABLE receipt_settings ADD COLUMN employees_can_collect_deliver INTEGER NOT NULL DEFAULT 1;
      `)
    },
  },
  {
    version: 9,
    up(db) {
      db.exec(`
        ALTER TABLE receipt_settings ADD COLUMN employees_can_access_delivery INTEGER NOT NULL DEFAULT 0;
      `)
    },
  },
]
