-- MariaDB / MySQL — 수동 설치 시
CREATE DATABASE IF NOT EXISTS portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE portfolio;

CREATE TABLE IF NOT EXISTS board_posts (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(40) NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  KEY idx_board_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  monthly_budget INT UNSIGNED NOT NULL DEFAULT 800000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO expense_settings (id, monthly_budget) VALUES (1, 800000);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  amount INT UNSIGNED NOT NULL,
  category_id VARCHAR(24) NOT NULL,
  label VARCHAR(200) NOT NULL,
  spent_at DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_expense_spent (spent_at),
  KEY idx_expense_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
