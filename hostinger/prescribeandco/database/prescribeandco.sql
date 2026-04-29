-- =============================================================================
-- Prescribe & Co — MySQL Schema
-- =============================================================================
-- Fresh install: run this entire file once in phpMyAdmin or MySQL CLI.
-- To add tables or data later, append new statements at the bottom and
-- run only the new lines — existing tables use IF NOT EXISTS so re-running
-- the whole file is always safe.
--
-- Requirements: MySQL 8.0+ or MariaDB 10.5+, utf8mb4 charset.
-- All UUIDs are stored as CHAR(36) (e.g. '550e8400-e29b-41d4-a716-446655440000').
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;   -- allow tables to be created in any order

-- =============================================================================
-- 1. USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`               CHAR(36)     NOT NULL,
  `email`            VARCHAR(254) NOT NULL,
  `password_hash`    VARCHAR(255) NOT NULL,
  `role`             ENUM('CUSTOMER','ADMIN','PRESCRIBER','DISPENSER')
                                  NOT NULL DEFAULT 'CUSTOMER',
  `first_name`       VARCHAR(100) NOT NULL,
  `last_name`        VARCHAR(100) NOT NULL,
  `nhs_number`       CHAR(10)     NULL DEFAULT NULL,
  `phone`            VARCHAR(20)  NULL DEFAULT NULL,
  `date_of_birth`    DATE         NULL DEFAULT NULL,
  `is_verified`      TINYINT(1)   NOT NULL DEFAULT 0,
  `is_active`        TINYINT(1)   NOT NULL DEFAULT 1,
  `email_verified_at` TIMESTAMP   NULL DEFAULT NULL,
  `last_login_at`    TIMESTAMP    NULL DEFAULT NULL,
  `created_at`       TIMESTAMP    NULL DEFAULT NULL,
  `updated_at`       TIMESTAMP    NULL DEFAULT NULL,
  `deleted_at`       TIMESTAMP    NULL DEFAULT NULL,        -- soft-delete
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique`       (`email`),
  UNIQUE KEY `users_nhs_number_unique`  (`nhs_number`),
  KEY `users_role_index`      (`role`),
  KEY `users_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. REFRESH TOKENS  (JWT refresh token rotation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`          CHAR(36)     NOT NULL,
  `user_id`     CHAR(36)     NOT NULL,
  `token_hash`  VARCHAR(255) NOT NULL,          -- bcrypt hash of the raw token
  `jti`         CHAR(36)     NOT NULL,           -- JWT ID claim, must be unique
  `user_agent`  VARCHAR(500) NULL DEFAULT NULL,
  `ip_address`  VARCHAR(45)  NULL DEFAULT NULL,
  `expires_at`  TIMESTAMP    NOT NULL,
  `revoked_at`  TIMESTAMP    NULL DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_tokens_jti_unique` (`jti`),
  KEY `refresh_tokens_user_id_index` (`user_id`),
  CONSTRAINT `fk_refresh_tokens_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. PRESCRIBER PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `prescriber_profiles` (
  `id`               CHAR(36)     NOT NULL,
  `user_id`          CHAR(36)     NOT NULL,
  `gphc_number`      CHAR(7)      NOT NULL,
  `gphc_verified`    TINYINT(1)   NOT NULL DEFAULT 0,
  `gphc_verified_at` TIMESTAMP    NULL DEFAULT NULL,
  `specialisation`   VARCHAR(200) NULL DEFAULT NULL,
  `organisation`     VARCHAR(200) NULL DEFAULT NULL,
  `indemnity_ref`    VARCHAR(100) NULL DEFAULT NULL,
  `indemnity_expiry` DATE         NULL DEFAULT NULL,
  `created_at`       TIMESTAMP    NULL DEFAULT NULL,
  `updated_at`       TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prescriber_profiles_user_id_unique`    (`user_id`),
  UNIQUE KEY `prescriber_profiles_gphc_number_unique` (`gphc_number`),
  CONSTRAINT `fk_prescriber_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. CATEGORIES  (self-referential parent/child)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         CHAR(36)     NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `slug`       VARCHAR(110) NOT NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `parent_id`  CHAR(36)     NULL DEFAULT NULL,
  `created_at` TIMESTAMP    NULL DEFAULT NULL,
  `updated_at` TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_slug_unique` (`slug`),
  KEY `categories_parent_id_index` (`parent_id`),
  CONSTRAINT `fk_categories_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. QUESTIONNAIRES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `questionnaires` (
  `id`          CHAR(36)     NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `description` TEXT         NULL DEFAULT NULL,
  `schema`      JSON         NOT NULL,          -- question definitions
  `version`     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_by`  CHAR(36)     NULL DEFAULT NULL,
  `created_at`  TIMESTAMP    NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `questionnaires_is_active_index` (`is_active`),
  CONSTRAINT `fk_questionnaires_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. PRODUCTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id`                    CHAR(36)     NOT NULL,
  `category_id`           CHAR(36)     NULL DEFAULT NULL,
  `questionnaire_id`      CHAR(36)     NULL DEFAULT NULL,
  `name`                  VARCHAR(200) NOT NULL,
  `slug`                  VARCHAR(220) NOT NULL,
  `description`           TEXT         NULL DEFAULT NULL,
  `bnf_code`              VARCHAR(20)  NULL DEFAULT NULL,
  `medicine_type`         ENUM('POM','P','GSL') NOT NULL DEFAULT 'GSL',
  `requires_prescription` TINYINT(1)   NOT NULL DEFAULT 0,
  `requires_questionnaire` TINYINT(1)  NOT NULL DEFAULT 0,
  `price_pence`           INT UNSIGNED NOT NULL,            -- e.g. 2500 = £25.00
  `s3_image_key`          VARCHAR(500) NULL DEFAULT NULL,   -- never in responses
  `status`                ENUM('ACTIVE','INACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `stock_count`           INT UNSIGNED NULL DEFAULT NULL,   -- NULL = unlimited
  `created_at`            TIMESTAMP    NULL DEFAULT NULL,
  `updated_at`            TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_slug_unique` (`slug`),
  KEY `products_category_id_index`           (`category_id`),
  KEY `products_questionnaire_id_index`      (`questionnaire_id`),
  KEY `products_medicine_type_index`         (`medicine_type`),
  KEY `products_requires_prescription_index` (`requires_prescription`),
  KEY `products_status_index`                (`status`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. QUESTIONNAIRE RESPONSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS `questionnaire_responses` (
  `id`                     CHAR(36)      NOT NULL,
  `user_id`                CHAR(36)      NOT NULL,
  `questionnaire_id`       CHAR(36)      NOT NULL,
  `questionnaire_version`  TINYINT UNSIGNED NOT NULL,
  `answers`                JSON          NOT NULL,
  `is_eligible`            TINYINT(1)    NULL DEFAULT NULL,
  `ineligibility_reasons`  JSON          NULL DEFAULT NULL,
  `submitted_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `qr_user_id_index`          (`user_id`),
  KEY `qr_questionnaire_id_index` (`questionnaire_id`),
  KEY `qr_submitted_at_index`     (`submitted_at`),
  CONSTRAINT `fk_qr_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qr_questionnaire`
    FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. PRESCRIPTION REQUESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `prescription_requests` (
  `id`                       CHAR(36)  NOT NULL,
  `customer_id`              CHAR(36)  NOT NULL,
  `product_id`               CHAR(36)  NOT NULL,
  `questionnaire_response_id` CHAR(36) NULL DEFAULT NULL,
  `delivery_address_id`      CHAR(36)  NULL DEFAULT NULL,

  -- State machine
  `status` ENUM(
    'DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED',
    'DISPENSING','FULFILLED','REJECTED','CANCELLED','EXPIRED'
  ) NOT NULL DEFAULT 'DRAFT',

  -- Eligibility (set after questionnaire review)
  `eligibility_status`  ENUM('PASS','FLAG','FAIL') NULL DEFAULT NULL,
  `eligibility_notes`   JSON NULL DEFAULT NULL,

  -- Clinical (prescriber-populated)
  `prescriber_id`       CHAR(36) NULL DEFAULT NULL,
  `dispenser_id`        CHAR(36) NULL DEFAULT NULL,
  `prescribed_date`     DATE     NULL DEFAULT NULL,
  `expiry_date`         DATE     NULL DEFAULT NULL,
  `dosage_instructions` TEXT     NULL DEFAULT NULL,
  `quantity_dispensed`  SMALLINT UNSIGNED NULL DEFAULT NULL,
  `rejection_reason`    TEXT     NULL DEFAULT NULL,
  `prescriber_note`     TEXT     NULL DEFAULT NULL,

  -- Customer
  `customer_note`       TEXT     NULL DEFAULT NULL,

  -- Lifecycle timestamps (de-normalised for SLA reporting)
  `submitted_at`        TIMESTAMP NULL DEFAULT NULL,
  `reviewed_at`         TIMESTAMP NULL DEFAULT NULL,
  `approved_at`         TIMESTAMP NULL DEFAULT NULL,
  `dispensing_started_at` TIMESTAMP NULL DEFAULT NULL,
  `fulfilled_at`        TIMESTAMP NULL DEFAULT NULL,
  `cancelled_at`        TIMESTAMP NULL DEFAULT NULL,

  -- Fulfilment tracking
  `tracking_number`     VARCHAR(100) NULL DEFAULT NULL,
  `courier_name`        VARCHAR(100) NULL DEFAULT NULL,

  `created_at`          TIMESTAMP NULL DEFAULT NULL,
  `updated_at`          TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `pr_customer_id_index`    (`customer_id`),
  KEY `pr_product_id_index`     (`product_id`),
  KEY `pr_status_index`         (`status`),
  KEY `pr_eligibility_index`    (`eligibility_status`),
  KEY `pr_prescriber_id_index`  (`prescriber_id`),
  KEY `pr_dispenser_id_index`   (`dispenser_id`),
  CONSTRAINT `fk_pr_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pr_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. PRESCRIPTION DOCUMENTS  (S3 references — key never returned to clients)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `prescription_documents` (
  `id`                      CHAR(36)     NOT NULL,
  `prescription_request_id` CHAR(36)     NOT NULL,
  `uploader_id`             CHAR(36)     NOT NULL,
  `document_type`  ENUM('ID_PROOF','NHS_EXEMPTION','PRESCRIPTION_SCAN','OTHER') NOT NULL,
  `s3_key`                  VARCHAR(500) NOT NULL,   -- AES-256 server-side encrypted
  `original_filename`       VARCHAR(255) NOT NULL,
  `mime_type`               VARCHAR(100) NOT NULL,
  `file_size_bytes`         INT UNSIGNED NOT NULL,
  `scan_status`    ENUM('PENDING','CLEAN','INFECTED') NOT NULL DEFAULT 'PENDING',
  `scan_completed_at`       TIMESTAMP    NULL DEFAULT NULL,
  `uploaded_at`             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pd_prescription_request_id_index` (`prescription_request_id`),
  KEY `pd_uploader_id_index`             (`uploader_id`),
  KEY `pd_scan_status_index`             (`scan_status`),
  CONSTRAINT `fk_pd_prescription`
    FOREIGN KEY (`prescription_request_id`)
      REFERENCES `prescription_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pd_uploader`
    FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id`                       CHAR(36)     NOT NULL,
  `prescription_request_id`  CHAR(36)     NOT NULL,
  `payment_method`  ENUM('CARD','NHS_VOUCHER','EXEMPT') NOT NULL,
  `status`          ENUM(
    'PENDING','AUTHORISED','CAPTURED','FAILED',
    'REFUNDED','PARTIALLY_REFUNDED','VOIDED'
  ) NOT NULL DEFAULT 'PENDING',
  `amount_pence`             INT UNSIGNED NOT NULL,
  `currency`                 CHAR(3)      NOT NULL DEFAULT 'GBP',
  `refunded_amount_pence`    INT UNSIGNED NOT NULL DEFAULT 0,
  `payment_method_token`     VARCHAR(255) NULL DEFAULT NULL,  -- never in responses
  `idempotency_key`          CHAR(36)     NOT NULL,
  `provider_payment_id`      VARCHAR(255) NULL DEFAULT NULL,
  `provider_charge_id`       VARCHAR(255) NULL DEFAULT NULL,
  `provider_refund_id`       VARCHAR(255) NULL DEFAULT NULL,
  `failure_code`             VARCHAR(100) NULL DEFAULT NULL,
  `failure_message`          VARCHAR(500) NULL DEFAULT NULL,
  `authorized_at`            TIMESTAMP    NULL DEFAULT NULL,
  `captured_at`              TIMESTAMP    NULL DEFAULT NULL,
  `refunded_at`              TIMESTAMP    NULL DEFAULT NULL,
  `raw_provider_response`    JSON         NULL DEFAULT NULL,  -- never in responses
  `last_webhook_event_id`    VARCHAR(255) NULL DEFAULT NULL,
  `created_at`               TIMESTAMP    NULL DEFAULT NULL,
  `updated_at`               TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_idempotency_key_unique` (`idempotency_key`),
  KEY `payments_prescription_request_id_index` (`prescription_request_id`),
  KEY `payments_status_index`                  (`status`),
  CONSTRAINT `fk_payments_prescription`
    FOREIGN KEY (`prescription_request_id`)
      REFERENCES `prescription_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 11. AUDIT LOGS  (INSERT-only, never updated or deleted)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`           CHAR(36)     NOT NULL,
  `actor_id`     CHAR(36)     NOT NULL,
  `gphc_number`  CHAR(7)      NULL DEFAULT NULL,
  `actor_role`   VARCHAR(20)  NULL DEFAULT NULL,
  `action`       VARCHAR(100) NOT NULL,
  `entity_type`  VARCHAR(100) NOT NULL,
  `entity_id`    CHAR(36)     NULL DEFAULT NULL,
  `before_state` JSON         NULL DEFAULT NULL,
  `after_state`  JSON         NULL DEFAULT NULL,
  `metadata`     JSON         NULL DEFAULT NULL,
  `ip_address`   VARCHAR(45)  NULL DEFAULT NULL,
  `user_agent`   VARCHAR(500) NULL DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_actor_id_index`    (`actor_id`),
  KEY `audit_logs_actor_role_index`  (`actor_role`),
  KEY `audit_logs_action_index`      (`action`),
  KEY `audit_logs_entity_type_index` (`entity_type`),
  KEY `audit_logs_entity_id_index`   (`entity_id`),
  KEY `audit_logs_created_at_index`  (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. SESSIONS  (Laravel database session driver)
--     Switch SESSION_DRIVER=database in .env to use this.
--     Default is 'file' — this table is only needed if you change the driver.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`            VARCHAR(255) NOT NULL,
  `user_id`       CHAR(36)     NULL DEFAULT NULL,
  `ip_address`    VARCHAR(45)  NULL DEFAULT NULL,
  `user_agent`    TEXT         NULL DEFAULT NULL,
  `payload`       LONGTEXT     NOT NULL,
  `last_activity` INT          NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index`       (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. CACHE  (Laravel database cache driver — optional)
--     Only needed if CACHE_STORE=database in .env.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `cache` (
  `key`        VARCHAR(255) NOT NULL,
  `value`      MEDIUMTEXT   NOT NULL,
  `expiration` INT          NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key`        VARCHAR(255) NOT NULL,
  `owner`      VARCHAR(255) NOT NULL,
  `expiration` INT          NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Re-enable foreign key checks
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SEED DATA — safe to run repeatedly (INSERT IGNORE skips existing rows)
-- =============================================================================

-- ── Root categories ──────────────────────────────────────────────────────────
INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `sort_order`, `parent_id`, `created_at`, `updated_at`) VALUES
  ('cat-mens-00000-0000-0000-000000000001', 'Men\'s Health',   'mens-health',   1, NULL, NOW(), NOW()),
  ('cat-womns-00000-0000-0000-000000000002', 'Women\'s Health', 'womens-health', 2, NULL, NOW(), NOW()),
  ('cat-genrl-00000-0000-0000-000000000003', 'General Health',  'general-health',3, NULL, NOW(), NOW());

-- ── Sub-categories (Men's) ───────────────────────────────────────────────────
INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `sort_order`, `parent_id`, `created_at`, `updated_at`) VALUES
  ('cat-ed000-00000-0000-0000-000000000010', 'Erectile Dysfunction', 'erectile-dysfunction', 1, 'cat-mens-00000-0000-0000-000000000001', NOW(), NOW()),
  ('cat-hair0-00000-0000-0000-000000000011', 'Hair Loss',            'hair-loss',            2, 'cat-mens-00000-0000-0000-000000000001', NOW(), NOW()),
  ('cat-pe000-00000-0000-0000-000000000012', 'Premature Ejaculation','premature-ejaculation',3, 'cat-mens-00000-0000-0000-000000000001', NOW(), NOW());

-- ── Sub-categories (Women's) ─────────────────────────────────────────────────
INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `sort_order`, `parent_id`, `created_at`, `updated_at`) VALUES
  ('cat-cont0-00000-0000-0000-000000000020', 'Contraception',       'contraception',        1, 'cat-womns-00000-0000-0000-000000000002', NOW(), NOW()),
  ('cat-meno0-00000-0000-0000-000000000021', 'Menopause',           'menopause',            2, 'cat-womns-00000-0000-0000-000000000002', NOW(), NOW()),
  ('cat-uti00-00000-0000-0000-000000000022', 'UTI Treatment',       'uti-treatment',        3, 'cat-womns-00000-0000-0000-000000000002', NOW(), NOW());

-- ── Example questionnaire (ED consultation) ──────────────────────────────────
INSERT IGNORE INTO `questionnaires` (`id`, `title`, `description`, `schema`, `version`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
(
  'qst-ed000-00000-0000-0000-000000000001',
  'ED Consultation',
  'Standard erectile dysfunction consultation questionnaire',
  '{
    "questions": [
      {
        "id": "q_age_confirm",
        "type": "BOOLEAN",
        "text": "Are you aged 18 or over?",
        "isRequired": true,
        "options": [
          {"value": "1", "label": "Yes"},
          {"value": "0", "label": "No", "disqualifying": true}
        ]
      },
      {
        "id": "q_cardiovascular",
        "type": "BOOLEAN",
        "text": "Have you been told by a doctor not to have sexual activity due to heart problems?",
        "isRequired": true,
        "options": [
          {"value": "1", "label": "Yes", "disqualifying": true},
          {"value": "0", "label": "No"}
        ]
      },
      {
        "id": "q_nitrates",
        "type": "BOOLEAN",
        "text": "Do you currently take nitrates (e.g. GTN spray, isosorbide) for chest pain?",
        "isRequired": true,
        "options": [
          {"value": "1", "label": "Yes", "disqualifying": true},
          {"value": "0", "label": "No"}
        ]
      },
      {
        "id": "q_severity",
        "type": "SINGLE_CHOICE",
        "text": "How would you describe the severity of your symptoms?",
        "isRequired": true,
        "options": [
          {"value": "mild",     "label": "Mild — occasional difficulty"},
          {"value": "moderate", "label": "Moderate — difficulty most of the time"},
          {"value": "severe",   "label": "Severe — unable to achieve erection"}
        ]
      },
      {
        "id": "q_duration",
        "type": "SINGLE_CHOICE",
        "text": "How long have you experienced these symptoms?",
        "isRequired": true,
        "options": [
          {"value": "lt3m",  "label": "Less than 3 months"},
          {"value": "3to12", "label": "3–12 months"},
          {"value": "gt12m", "label": "More than 12 months"}
        ]
      },
      {
        "id": "q_other_meds",
        "type": "BOOLEAN",
        "text": "Are you currently taking any other prescription medications?",
        "isRequired": true,
        "options": [
          {"value": "1", "label": "Yes"},
          {"value": "0", "label": "No"}
        ]
      },
      {
        "id": "q_other_meds_detail",
        "type": "TEXT",
        "text": "Please list the medications you are taking:",
        "isRequired": true,
        "showIf": {"questionId": "q_other_meds", "operator": "eq", "value": "1"}
      }
    ]
  }',
  1,
  1,
  NULL,
  NOW(),
  NOW()
);

-- ── Example products ─────────────────────────────────────────────────────────
INSERT IGNORE INTO `products`
  (`id`, `category_id`, `questionnaire_id`, `name`, `slug`, `description`,
   `bnf_code`, `medicine_type`, `requires_prescription`, `requires_questionnaire`,
   `price_pence`, `status`, `stock_count`, `created_at`, `updated_at`)
VALUES
(
  'prd-sild0-00000-0000-0000-000000000001',
  'cat-ed000-00000-0000-0000-000000000010',
  'qst-ed000-00000-0000-0000-000000000001',
  'Sildenafil 50mg Tablets',
  'sildenafil-50mg',
  'Sildenafil is a PDE5 inhibitor used to treat erectile dysfunction. It helps increase blood flow to the penis to achieve and maintain an erection when sexually stimulated.',
  '0701022A0AAAAAA',
  'POM',
  1,
  1,
  2500,    -- £25.00
  'ACTIVE',
  NULL,
  NOW(),
  NOW()
),
(
  'prd-fina0-00000-0000-0000-000000000002',
  'cat-hair0-00000-0000-0000-000000000011',
  NULL,
  'Finasteride 1mg Tablets',
  'finasteride-1mg',
  'Finasteride 1mg is used to treat male pattern baldness (androgenetic alopecia) in men. It works by reducing DHT levels in the scalp.',
  '0604011F0AAAAAA',
  'POM',
  1,
  1,
  1800,    -- £18.00
  'ACTIVE',
  NULL,
  NOW(),
  NOW()
),
(
  'prd-pill0-00000-0000-0000-000000000003',
  'cat-cont0-00000-0000-0000-000000000020',
  NULL,
  'Combined Oral Contraceptive Pill',
  'combined-pill',
  'The combined oral contraceptive pill contains synthetic versions of the hormones oestrogen and progesterone. When taken correctly it is over 99% effective at preventing pregnancy.',
  NULL,
  'POM',
  1,
  1,
  1200,    -- £12.00
  'ACTIVE',
  NULL,
  NOW(),
  NOW()
);

-- =============================================================================
-- ADDITIONAL CATEGORIES
-- =============================================================================

INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `sort_order`, `parent_id`, `created_at`, `updated_at`) VALUES
  ('cat-wlos0-00000-0000-0000-000000000030', 'Weight Loss',      'weight-loss',     1, NULL, NOW(), NOW()),
  ('cat-skin0-00000-0000-0000-000000000031', 'Skin Health',      'skin-health',     2, NULL, NOW(), NOW()),
  ('cat-mntl-00000-0000-0000-000000000032', 'Mental Wellbeing', 'mental-wellbeing', 3, NULL, NOW(), NOW()),
  ('cat-sxhl-00000-0000-0000-000000000033', 'Sexual Health',    'sexual-health',    4, NULL, NOW(), NOW());

-- =============================================================================
-- ADDITIONAL PRODUCTS
-- =============================================================================

-- ── Weight Loss ──────────────────────────────────────────────────────────────

INSERT IGNORE INTO `products`
  (`id`, `category_id`, `questionnaire_id`, `name`, `slug`, `description`,
   `bnf_code`, `medicine_type`, `requires_prescription`, `requires_questionnaire`,
   `price_pence`, `status`, `stock_count`, `created_at`, `updated_at`)
VALUES
(
  'prd-sema0-00000-0000-0000-000000000010',
  'cat-wlos0-00000-0000-0000-000000000030',
  NULL,
  'Semaglutide Injection (Wegovy)',
  'semaglutide-injection',
  'Semaglutide is a GLP-1 receptor agonist approved for chronic weight management in adults with a BMI of 30+ (or 27+ with a weight-related condition). Administered as a once-weekly injection, it helps reduce appetite and caloric intake. Our prescribers review your health history before approving treatment.',
  '0601023AD',
  'POM',
  1, 1,
  19900,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-tirz0-00000-0000-0000-000000000011',
  'cat-wlos0-00000-0000-0000-000000000030',
  NULL,
  'Tirzepatide (Mounjaro)',
  'tirzepatide-mounjaro',
  'Tirzepatide is a dual GIP and GLP-1 receptor agonist for long-term weight management. Clinical trials show up to 22% body weight reduction. Once-weekly self-injection, reviewed and prescribed by a UK-registered prescriber.',
  '0601023AJ',
  'POM',
  1, 1,
  22900,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-orli0-00000-0000-0000-000000000012',
  'cat-wlos0-00000-0000-0000-000000000030',
  NULL,
  'Orlistat 120mg Capsules (Xenical)',
  'orlistat-120mg',
  'Orlistat 120mg (Xenical) prevents approximately one third of dietary fat from being absorbed. Suitable for adults with a BMI of 28+. Taken with meals three times daily. Prescription required.',
  '0401020G0BCAAAA',
  'POM',
  1, 1,
  4900,
  'ACTIVE', NULL, NOW(), NOW()
);

-- ── Hair Loss (extra products) ───────────────────────────────────────────────

INSERT IGNORE INTO `products`
  (`id`, `category_id`, `questionnaire_id`, `name`, `slug`, `description`,
   `bnf_code`, `medicine_type`, `requires_prescription`, `requires_questionnaire`,
   `price_pence`, `status`, `stock_count`, `created_at`, `updated_at`)
VALUES
(
  'prd-mino0-00000-0000-0000-000000000020',
  'cat-hair0-00000-0000-0000-000000000011',
  NULL,
  'Minoxidil 5% Solution',
  'minoxidil-5-percent',
  'Minoxidil 5% topical solution is applied directly to the scalp to stimulate hair growth and slow hair loss in male pattern baldness. Applied twice daily. Available as a pharmacy medicine.',
  '1303020A0AAABAB',
  'P',
  0, 0,
  1800,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-duta0-00000-0000-0000-000000000021',
  'cat-hair0-00000-0000-0000-000000000011',
  NULL,
  'Dutasteride 0.5mg Capsules',
  'dutasteride-0-5mg',
  'Dutasteride inhibits both type I and type II 5-alpha reductase, giving greater DHT suppression than Finasteride. Used off-label for male pattern hair loss when Finasteride has been insufficient. Prescription required.',
  '0604011E0AAAAAA',
  'POM',
  1, 1,
  3200,
  'ACTIVE', NULL, NOW(), NOW()
);

-- ── Erectile Dysfunction (extra products) ────────────────────────────────────

INSERT IGNORE INTO `products`
  (`id`, `category_id`, `questionnaire_id`, `name`, `slug`, `description`,
   `bnf_code`, `medicine_type`, `requires_prescription`, `requires_questionnaire`,
   `price_pence`, `status`, `stock_count`, `created_at`, `updated_at`)
VALUES
(
  'prd-tada0-00000-0000-0000-000000000030',
  'cat-ed000-00000-0000-0000-000000000010',
  NULL,
  'Tadalafil 10mg Tablets',
  'tadalafil-10mg',
  'Tadalafil 10mg is a long-acting PDE5 inhibitor for erectile dysfunction, effective for up to 36 hours. Taken as needed, approximately 30 minutes before sexual activity. Prescription required.',
  '0701022B0AAAAAA',
  'POM',
  1, 1,
  2200,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-tad5-00000-0000-0000-000000000031',
  'cat-ed000-00000-0000-0000-000000000010',
  NULL,
  'Tadalafil 5mg Daily Tablets',
  'tadalafil-5mg-daily',
  'Tadalafil 5mg taken once daily provides continuous readiness for sexual activity without needing to plan ahead. Suitable for men who prefer a spontaneous approach. Prescription required.',
  '0701022B0AAACAC',
  'POM',
  1, 1,
  2800,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-sild100-0000-0000-0000-000000000032',
  'cat-ed000-00000-0000-0000-000000000010',
  NULL,
  'Sildenafil 100mg Tablets',
  'sildenafil-100mg',
  'Sildenafil 100mg is the highest standard dose of this PDE5 inhibitor, suitable for men who have not had sufficient response at 50mg. Taken 30–60 minutes before sexual activity. Prescription required.',
  '0701022A0AAABAB',
  'POM',
  1, 1,
  3200,
  'ACTIVE', NULL, NOW(), NOW()
);

-- ── Skin Health ───────────────────────────────────────────────────────────────

INSERT IGNORE INTO `products`
  (`id`, `category_id`, `questionnaire_id`, `name`, `slug`, `description`,
   `bnf_code`, `medicine_type`, `requires_prescription`, `requires_questionnaire`,
   `price_pence`, `status`, `stock_count`, `created_at`, `updated_at`)
VALUES
(
  'prd-tret0-00000-0000-0000-000000000040',
  'cat-skin0-00000-0000-0000-000000000031',
  NULL,
  'Tretinoin 0.025% Cream',
  'tretinoin-0-025-cream',
  'Tretinoin (a retinoid derived from vitamin A) is prescribed for acne and photoageing. It promotes skin cell turnover and collagen production. Applied topically at night. Prescription required — our prescribers assess suitability before issuing.',
  '1302010AB',
  'POM',
  1, 1,
  3500,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-azel0-00000-0000-0000-000000000041',
  'cat-skin0-00000-0000-0000-000000000031',
  NULL,
  'Azelaic Acid 20% Cream (Skinoren)',
  'azelaic-acid-20-cream',
  'Azelaic acid 20% is used for the treatment of mild to moderate acne and rosacea. It reduces the growth of acne-causing bacteria and helps unclog pores. Applied twice daily. Prescription required.',
  '1302010AA',
  'POM',
  1, 1,
  2800,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-clind-00000-0000-0000-000000000042',
  'cat-skin0-00000-0000-0000-000000000031',
  NULL,
  'Clindamycin 1% Topical Gel',
  'clindamycin-1-gel',
  'Clindamycin 1% topical gel is an antibiotic used to treat acne. It reduces the bacteria that cause spots and inflammation. Applied to clean, dry skin once or twice daily. Prescription required.',
  '1302020AD',
  'POM',
  1, 1,
  2200,
  'ACTIVE', NULL, NOW(), NOW()
);

-- =============================================================================
-- DIGESTIVE HEALTH CATEGORY + PRODUCTS
-- =============================================================================

INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `sort_order`, `parent_id`, `created_at`, `updated_at`) VALUES
  ('cat-dige0-00000-0000-0000-000000000034', 'Digestive Health', 'digestive-health', 5, NULL, NOW(), NOW());

INSERT IGNORE INTO `products`
  (`id`, `category_id`, `questionnaire_id`, `name`, `slug`, `description`,
   `bnf_code`, `medicine_type`, `requires_prescription`, `requires_questionnaire`,
   `price_pence`, `status`, `stock_count`, `created_at`, `updated_at`)
VALUES
(
  'prd-mebe0-00000-0000-0000-000000000050',
  'cat-dige0-00000-0000-0000-000000000034',
  NULL,
  'Mebeverine 135mg Tablets (IBS)',
  'mebeverine-135mg',
  'Mebeverine 135mg is an antispasmodic used to relieve the symptoms of irritable bowel syndrome (IBS), including cramping, bloating, and abdominal pain. Taken three times daily before meals. Prescription required.',
  '0102010B0AAAAAA',
  'POM',
  1, 1,
  1800,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-ome0-00000-0000-0000-000000000051',
  'cat-dige0-00000-0000-0000-000000000034',
  NULL,
  'Omeprazole 20mg Capsules (Acid Reflux)',
  'omeprazole-20mg',
  'Omeprazole 20mg is a proton pump inhibitor (PPI) used to treat acid reflux, heartburn, and gastro-oesophageal reflux disease (GORD). Reduces the amount of acid the stomach produces. Taken once daily before food. Prescription required.',
  '0103050E0AAAAAA',
  'POM',
  1, 1,
  1500,
  'ACTIVE', NULL, NOW(), NOW()
),
(
  'prd-buse0-00000-0000-0000-000000000052',
  'cat-dige0-00000-0000-0000-000000000034',
  NULL,
  'Buscopan (Hyoscine) 10mg Tablets',
  'buscopan-10mg',
  'Hyoscine butylbromide (Buscopan) 10mg relieves the pain and discomfort of stomach cramps and IBS. It works by relaxing the muscle spasms in the gut. Prescription-strength dose available following consultation.',
  '0102010A0BCAAAA',
  'POM',
  1, 1,
  1200,
  'ACTIVE', NULL, NOW(), NOW()
);

-- =============================================================================
-- ADD YOUR OWN QUERIES BELOW THIS LINE
-- Each statement is independent — you can run just the new lines.
-- Tips:
--   • New table:   CREATE TABLE IF NOT EXISTS `my_table` ( ... );
--   • New product: INSERT IGNORE INTO `products` (...) VALUES (...);
--   • New category:INSERT IGNORE INTO `categories` (...) VALUES (...);
--   • Schema change: ALTER TABLE `products` ADD COLUMN `weight_g` SMALLINT NULL;
-- =============================================================================
