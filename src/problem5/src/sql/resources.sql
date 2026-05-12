-- Run this yourself in MySQL Workbench (or any client) against the `problem5` database before first API use.
-- The Node app does not execute this file.

CREATE TABLE IF NOT EXISTS resources (
  id          CHAR(36)                      NOT NULL PRIMARY KEY,
  name        VARCHAR(255)                  NOT NULL,
  description TEXT,
  status      ENUM('active', 'inactive')    NOT NULL DEFAULT 'active',
  version     INT                           NOT NULL DEFAULT 0,
  created_at  DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_name   (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
