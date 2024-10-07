--Prod user for the SteenBudgetSystem database
GRANT ALL PRIVILEGES ON SteenBudgetSystemPROD.* TO 'admin'@'192.168.50.%' IDENTIFIED BY 'your_admin_password';
FLUSH PRIVILEGES;

--Test user for the SteenBudgetSystem database
CREATE USER 'test_user'@'192.168.50.18' IDENTIFIED BY 'ffff';

GRANT SELECT, INSERT, UPDATE, DELETE ON SteenBudgetSystemTEST.* TO 'test_user'@'192.168.50.18';

FLUSH PRIVILEGES;