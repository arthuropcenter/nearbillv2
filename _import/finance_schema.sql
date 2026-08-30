-- NearBill v2 - Modul Keuangan (import dari Google Sheets)
CREATE TABLE IF NOT EXISTS tbl_expense_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('Operasional', 'Lainnya') NOT NULL DEFAULT 'Lainnya',
  UNIQUE KEY uq_cat_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ref_no VARCHAR(50) DEFAULT NULL,
  expense_date DATE NOT NULL,
  category_id INT DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  method VARCHAR(50) DEFAULT NULL,
  paid_to VARCHAR(150) DEFAULT NULL,
  expense_type ENUM('Operasional', 'Lainnya') DEFAULT 'Lainnya',
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_expense_date (expense_date),
  KEY idx_expense_cat (category_id),
  KEY idx_expense_ref (ref_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_no VARCHAR(50) DEFAULT NULL,
  customer_ref VARCHAR(50) DEFAULT NULL,
  customer_name VARCHAR(150) DEFAULT NULL,
  plan_ref VARCHAR(50) DEFAULT NULL,
  plan_name VARCHAR(100) DEFAULT NULL,
  period_month INT DEFAULT NULL,
  period_year INT DEFAULT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status ENUM('Lunas', 'Belum Bayar', 'Sebagian') NOT NULL DEFAULT 'Belum Bayar',
  bill_date DATE DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bill_no (bill_no),
  KEY idx_bill_customer (customer_ref),
  KEY idx_bill_period (period_year, period_month),
  KEY idx_bill_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_fin_income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pay_no VARCHAR(50) DEFAULT NULL,
  bill_no VARCHAR(50) DEFAULT NULL,
  customer_ref VARCHAR(50) DEFAULT NULL,
  customer_name VARCHAR(150) DEFAULT NULL,
  pay_date DATE DEFAULT NULL,
  method VARCHAR(50) DEFAULT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  note VARCHAR(255) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pay_no (pay_no),
  KEY idx_income_date (pay_date),
  KEY idx_income_customer (customer_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
