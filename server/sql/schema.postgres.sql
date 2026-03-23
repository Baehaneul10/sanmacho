-- Supabase / PostgreSQL — SQL Editor에 붙여 넣어 한 번 실행해도 되고,
-- 서버 기동 시 ensureSchema()가 없으면 자동 생성합니다.

CREATE TABLE IF NOT EXISTS board_posts (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(40) NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_board_created ON board_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS expense_settings (
  id SMALLINT PRIMARY KEY,
  monthly_budget INTEGER NOT NULL DEFAULT 800000
);

INSERT INTO expense_settings (id, monthly_budget)
VALUES (1, 800000)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  category_id VARCHAR(24) NOT NULL,
  label VARCHAR(200) NOT NULL,
  spent_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_spent ON expenses (spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_category ON expenses (category_id);
