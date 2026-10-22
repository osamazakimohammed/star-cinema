CREATE DATABASE IF NOT EXISTS star_cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE star_cinema;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  genre VARCHAR(100) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
  poster_url VARCHAR(500) NOT NULL,
  release_year SMALLINT UNSIGNED NOT NULL,
  catalog_source ENUM('sample','custom') NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS showtimes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  movie_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  screen_name VARCHAR(60) NOT NULL,
  ticket_price DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  INDEX idx_showtimes_movie_time (movie_id, starts_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  showtime_id BIGINT UNSIGNED NOT NULL,
  seat_code VARCHAR(8) NOT NULL,
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  active_seat_code VARCHAR(8) GENERATED ALWAYS AS (CASE WHEN status='confirmed' THEN seat_code ELSE NULL END) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (showtime_id) REFERENCES showtimes(id),
  UNIQUE KEY uq_active_seat_per_showtime (showtime_id, active_seat_code),
  INDEX idx_bookings_user (user_id, created_at)
) ENGINE=InnoDB;
