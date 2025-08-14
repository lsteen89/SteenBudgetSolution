-- ##################################################################
-- # DEPRECATED - DO NOT USE
-- ##################################################################
-- # This script is no longer maintained.
-- ##################################################################

-- Prod user for the SteenBudgetSystem database
GRANT ALL PRIVILEGES ON SteenBudgetSystemPROD.* TO 'admin'@'192.168.50.%' IDENTIFIED BY 'your_admin_password';
/*The above is fine well the project is in active development*/
-- Prod user for the SteenBudgetSystem database
CREATE USER 'admin'@'192.168.50.%' IDENTIFIED BY 'your_admin_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON SteenBudgetSystemPROD.* TO 'admin'@'192.168.50.%';
FLUSH PRIVILEGES;

-- Test user for the SteenBudgetSystem database
CREATE USER 'test_user'@'192.168.50.18' IDENTIFIED BY 'ffff';
GRANT ALL PRIVILEGES ON steenbudgetsystemtest.* TO 'test_user'@'192.168.50.18' IDENTIFIED BY 'ffff';
FLUSH PRIVILEGES;