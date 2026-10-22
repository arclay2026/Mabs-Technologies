-- =====================================================================
-- Mabs Technologies — MySQL / MariaDB schema
-- ---------------------------------------------------------------------
-- Works on MySQL 5.7+ and MariaDB 10.3+. Install it from the admin panel
-- (admin/setup.php) or import it in phpMyAdmin, then load seed.sql.
-- JSON values (specs, art, address) are stored as text for portability.
-- =====================================================================

CREATE TABLE categories (
  id    VARCHAR(40)  NOT NULL,
  name  VARCHAR(80)  NOT NULL,
  blurb VARCHAR(160) NULL,
  sort  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE brands (
  id          VARCHAR(40)  NOT NULL,
  name        VARCHAR(80)  NOT NULL,
  logo_url    VARCHAR(255) NULL,      -- full-colour logo for the featured brands strip
  logo_height SMALLINT     NULL,      -- display height in px, tuned per logo
  sort        INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY brands_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id          VARCHAR(80)   NOT NULL,  -- URL slug, e.g. 'apple-iphone-15'
  name        VARCHAR(200)  NOT NULL,
  brand_id    VARCHAR(40)   NOT NULL,
  category_id VARCHAR(40)   NOT NULL,
  type        VARCHAR(60)   NOT NULL,  -- 'Laptop', 'Smartphone', …
  price       DECIMAL(12,2) NOT NULL,  -- rand, VAT inclusive
  was_price   DECIMAL(12,2) NULL,      -- previous price; shows a sale tag
  stock       INT           NOT NULL DEFAULT 0,
  featured    TINYINT(1)    NOT NULL DEFAULT 0,
  badge       VARCHAR(30)   NULL,      -- 'New', 'Gaming', 'Hot'
  summary     TEXT          NULL,
  specs       TEXT          NOT NULL,  -- JSON: [["Memory","8 GB RAM"], …]
  image_url   VARCHAR(255)  NULL,      -- main photo (cards and the product page); NULL = drawn placeholder
  images      TEXT          NULL,      -- JSON: every photo in gallery order, when there's more than one
  art         TEXT          NULL,      -- JSON: placeholder illustration settings
  active      TINYINT(1)    NOT NULL DEFAULT 1,
  sort        INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY products_category (category_id, active),
  KEY products_brand (brand_id, active),
  CONSTRAINT products_brand_fk    FOREIGN KEY (brand_id)    REFERENCES brands (id)     ON UPDATE CASCADE,
  CONSTRAINT products_category_fk FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE CASCADE,
  CONSTRAINT products_price_ck CHECK (price >= 0),
  CONSTRAINT products_stock_ck CHECK (stock >= 0),
  CONSTRAINT products_was_ck   CHECK (was_price IS NULL OR was_price > price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- one row of shop-wide settings
CREATE TABLE store_settings (
  id          TINYINT       NOT NULL DEFAULT 1,
  courier_fee DECIMAL(12,2) NOT NULL DEFAULT 120,
  free_over   DECIMAL(12,2) NOT NULL DEFAULT 1500,
  collect     TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO store_settings (id) VALUES (1);

CREATE TABLE orders (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  number         VARCHAR(20)   NOT NULL,              -- e.g. 'MB261022-4821'
  status         ENUM('placed','confirmed','out_for_delivery','ready_for_collection','delivered','collected','cancelled')
                               NOT NULL DEFAULT 'placed',
  fulfilment     ENUM('delivery','collect') NOT NULL,
  payment_method ENUM('eft','on_receipt')   NOT NULL,
  payment_status ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  customer_name  VARCHAR(120)  NOT NULL,
  customer_phone VARCHAR(30)   NOT NULL,
  customer_email VARCHAR(190)  NOT NULL,
  address        TEXT          NULL,                  -- JSON: {street, suburb, city, province, postal}
  notes          TEXT          NULL,
  subtotal       DECIMAL(12,2) NOT NULL,
  delivery_fee   DECIMAL(12,2) NOT NULL,
  total          DECIMAL(12,2) NOT NULL,
  ip_hash        CHAR(64)      NULL,                  -- hashed, for rate limiting only
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY orders_number (number),
  KEY orders_status (status, created_at),
  KEY orders_created (created_at),
  KEY orders_ip (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id   INT UNSIGNED  NOT NULL,
  product_id VARCHAR(80)   NULL,       -- NULL if the product is later deleted
  name       VARCHAR(200)  NOT NULL,   -- copied at order time
  unit_price DECIMAL(12,2) NOT NULL,
  qty        INT           NOT NULL,
  PRIMARY KEY (id),
  KEY order_items_order (order_id),
  CONSTRAINT order_items_order_fk   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT order_items_qty_ck CHECK (qty > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- admin panel users
CREATE TABLE admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- failed admin sign-ins, for throttling
CREATE TABLE login_attempts (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_hash CHAR(64)     NOT NULL,
  at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY login_attempts_ip (ip_hash, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- product reviews: written on the product page, shown once approved in the admin panel
CREATE TABLE reviews (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  VARCHAR(80)  NOT NULL,
  rating      TINYINT      NOT NULL,              -- 1 to 5 stars
  title       VARCHAR(120) NULL,
  body        TEXT         NOT NULL,
  name        VARCHAR(80)  NOT NULL,              -- shown with the review
  email       VARCHAR(190) NOT NULL,              -- never shown; matches orders for "Verified buyer"
  verified    TINYINT(1)   NOT NULL DEFAULT 0,    -- this email ordered this product
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reply       TEXT         NULL,                  -- the shop's public reply
  ip_hash     CHAR(64)     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME     NULL,
  PRIMARY KEY (id),
  KEY reviews_product (product_id, status, created_at),
  KEY reviews_status (status, created_at),
  KEY reviews_email (email, product_id),
  KEY reviews_ip (ip_hash, created_at),
  CONSTRAINT reviews_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT reviews_rating_ck CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
