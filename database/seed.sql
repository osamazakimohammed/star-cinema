USE star_cinema;
INSERT INTO users (name,email,password_hash) VALUES
('User','user@domain.com','$2a$12$j/747ZczCjLUnbt85m0tKeDt7pn8/npp6dVj0RWHTlxxER3A.Jgba') AS incoming
ON DUPLICATE KEY UPDATE name=incoming.name, password_hash=incoming.password_hash;

INSERT INTO movies (id,title,description,genre,duration_minutes,rating,poster_url,release_year,catalog_source) VALUES
(1,'Interstellar','A team travels beyond this galaxy to discover whether mankind has a future among the stars.','Sci-Fi · Adventure',169,8.7,'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',2014,'sample'),
(2,'Inception','A skilled thief enters dreams to steal secrets, then faces one final impossible job.','Sci-Fi · Thriller',148,8.8,'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',2010,'sample'),
(3,'The Dark Knight','Batman faces a criminal mastermind who pushes Gotham into chaos.','Action · Crime',152,9.0,'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',2008,'sample'),
(4,'Dune: Part Two','Paul Atreides unites with the Fremen while seeking revenge and confronting destiny.','Sci-Fi · Adventure',166,8.5,'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',2024,'sample'),
(5,'Spider-Man: Across the Spider-Verse','Miles Morales journeys through the multiverse and meets a new team of Spider-People.','Animation · Action',140,8.6,'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',2023,'sample'),
(6,'The Grand Budapest Hotel','A legendary concierge and his lobby boy become entangled in a stolen painting and family fortune.','Comedy · Drama',99,8.1,'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',2014,'sample') AS incoming
ON DUPLICATE KEY UPDATE title=incoming.title, poster_url=incoming.poster_url, catalog_source='sample';

INSERT INTO showtimes (id,movie_id,starts_at,screen_name,ticket_price) VALUES
(1,1,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY),'Screen 1',180.00),
(2,1,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY) + INTERVAL 3 HOUR,'Screen 2',200.00),
(3,2,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY),'Screen 3',170.00),
(4,2,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 DAY),'Screen 1',170.00),
(5,3,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY) + INTERVAL 5 HOUR,'Screen 4',190.00),
(6,4,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 DAY),'Screen 2',220.00),
(7,5,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY) + INTERVAL 2 HOUR,'Screen 5',160.00),
(8,6,DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 DAY),'Screen 3',150.00) AS incoming
ON DUPLICATE KEY UPDATE screen_name=incoming.screen_name;
