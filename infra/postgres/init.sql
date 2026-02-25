-- Creates all 5 logical databases for the IUT Cafeteria microservices.
-- Mounted at /docker-entrypoint-initdb.d/init.sql in the postgres container.

CREATE DATABASE identity_db;
CREATE DATABASE order_db;
CREATE DATABASE stock_db;
CREATE DATABASE kitchen_db;
CREATE DATABASE notify_db;
