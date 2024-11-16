Installation Guide for SteenBudgetSolution

This guide provides detailed instructions for installing and configuring SteenBudgetSolution on both Linux (e.g., Raspberry Pi OS Bookworm) and Windows systems. The guide covers both production and development setups, with notes indicating steps that are specific to production environments.
Table of Contents

    Prerequisites
    Environment Variables
    Security Configuration (Production Only)
    Database Setup
    Building and Running the Backend
    Building and Running the Frontend
    Web Server Configuration (Production Only)
    Setting Up Graylog for Logging (Optional)
    Domain, DNS, and Email Configuration (Optional)
    Final Security and Maintenance
    Conclusion

1. Prerequisites
Operating System

    Linux: Raspberry Pi OS Bookworm (without GUI) with SSH access for production.
    Windows: For development and testing environments.

Software Requirements

Ensure the following software is installed on your system:

    .NET 8 SDK and Runtime

        Linux:

            Install using the script for Raspberry Pi: dotnet8pi

            Verify installation:

            dotnet --version

        Windows:
            Download and install from Microsoft .NET Downloads.

    SQL Database
        Production: MariaDB.
        Development/Test: MariaDB or SQL Server Management Studio (SSMS).
        Run the database scripts under /Backend/SQL/ for table creation.
            Two script folders are available:
                MariaDB/
                SSMS/

    Web Server (Production Only)
        Nginx (recommended) or another web server.

    Mail Server (Production Only)
        Dovecot or another SMTP server for handling outgoing emails.
        Configure with virtual users and set up DNS records (DMARC, DKIM, SPF) using Cloudflare or another DNS provider.
        Install OpenDKIM for DKIM signing.
        Use SSL certificates to enhance security.

    Security Tools (Production Only)
        Fail2Ban: To monitor and restrict malicious login attempts.
        UFW (Uncomplicated Firewall): To manage firewall rules.

    Optional Software
        Graylog, MongoDB, and Elasticsearch: For centralized logging (optional).

2. Environment Variables

Set the following environment variables to securely handle sensitive data.
Required for All Environments

    JWT_SECRET_KEY: Secret key for JSON Web Token authentication.
    DB_CONNECTION_STRING: Connection string for the MariaDB database.
    RECAPTCHA_SECRET_KEY: Secret key for Google reCAPTCHA verification.

Production Only

    SMTP_PASSWORD: Password for the no-reply@yourdomain.com SMTP user (used for user verification and notifications).
    SMTP_PASSWORD_INFO: Password for the info@yourdomain.com SMTP user (used for contact and support purposes).

Configuring Environment Variables

    Linux:
        Create a file at /etc/environment.d/steenbudget.conf and add your environment variables.
        Alternatively, include them directly in the systemd service file.

    Windows:
        Set environment variables via System Properties or using PowerShell.

3. Security Configuration (Production Only)
SSH Configuration

    Disable Password Authentication:

    Edit /etc/ssh/sshd_config:

        PasswordAuthentication no

        Enable SSH Key Authentication:

        Ensure PubkeyAuthentication is set to yes.

Restart SSH Service:

    sudo systemctl restart sshd

UFW Firewall

Install UFW:

    sudo apt update
    sudo apt install ufw

Allow Necessary Ports:

    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw allow 587  # SMTP over TLS

Enable UFW:

    sudo ufw enable

Fail2Ban

    Install Fail2Ban:

    sudo apt install fail2ban

Configure Fail2Ban:

Create /etc/fail2ban/jail.local:

    [sshd]
    enabled = true
    port    = ssh
    filter  = sshd
    logpath = /var/log/auth.log
    maxretry = 5

Restart Fail2Ban:

    sudo systemctl restart fail2ban

4. Database Setup
Install MariaDB

    Linux:

        sudo apt update
        sudo apt install mariadb-server

    Windows:
        Download and install from the official website.

Secure MariaDB Installation (Linux Only)

    sudo mysql_secure_installation

Follow the prompts to set the root password and remove anonymous users.
Create Database and Run Scripts

Log into MariaDB:

    sudo mysql -u root -p

Create Database:

    CREATE DATABASE steenbudgetPROD;  -- For production
    CREATE DATABASE steenbudgetTEST;  -- For testing

Use Database:

    USE steenbudgetPROD;  -- Or steenbudgetTEST

Run Scripts:

    SOURCE /path/to/Backend/SQL/MariaDB/CreateTables.sql;
    SOURCE /path/to/Backend/SQL/MariaDB/CreateUser.sql;  -- Optional

The CreateTables.sql script automatically creates test or production versions based on flags.
Read the script comments for detailed instructions.

5. Building and Running the Backend
Clone the Repository

    Clone from GitHub:

        git clone https://github.com/yourusername/SteenBudgetSolution.git

Navigate to the Backend Directory:

    cd SteenBudgetSolution/Backend/

Build the Project For Production (Linux):

    

    dotnet publish Backend.csproj -c Release -o /var/www/backend

Ensure /var/www/backend exists and has appropriate permissions.

For Development/Test:

    dotnet build

Configure Systemd Service (Linux Production Only)

Create Service File:

    sudo nano /etc/systemd/system/steenbudget.service

Service File Content:

    [Unit]
    Description=SteenBudget Backend Service
    After=network.target
    
    [Service]
    WorkingDirectory=/var/www/backend
    ExecStart=/usr/bin/dotnet /var/www/backend/Backend.dll
    Restart=always
    RestartSec=10
    KillSignal=SIGINT
    SyslogIdentifier=steenbudget
    User=www-data
    Environment=ASPNETCORE_ENVIRONMENT=Production
    EnvironmentFile=/etc/environment.d/steenbudget.conf
    
    [Install]
    WantedBy=multi-user.target

Reload Systemd and Start Service:

    sudo systemctl daemon-reload
    sudo systemctl start steenbudget.service
    sudo systemctl enable steenbudget.service

Running the Backend (Development/Test)

Run Application:

    dotnet run

The backend will be accessible at http://localhost:5000 by default.

6. Building and Running the Frontend
Install Dependencies

    Navigate to Frontend Directory:

        cd SteenBudgetSolution/frontend/

Install Dependencies:

    npm install

Build the Frontend

    Set Environment Variables:
        REACT_APP_RECAPTCHA_SITE_KEY: Your Google reCAPTCHA site key.
        REACT_APP_API_URL: The URL of your backend API.

    Build Command:

    REACT_APP_RECAPTCHA_SITE_KEY=$REACT_APP_RECAPTCHA_SITE_KEY REACT_APP_API_URL=$REACT_APP_API_URL npm run build

        For Production: Set REACT_APP_API_URL to https://yourdomain.com.
        For Development/Test: Set REACT_APP_API_URL to http://localhost:5000.

    Build Output:
        The build artifacts will be located in the build/ directory.

Running the Frontend (Development Only)

    Start Development Server:

    npm start

    Access the frontend at http://localhost:3000.

7. Web Server Configuration (Production Only)
    Install Nginx
        
        sudo apt update
        sudo apt install nginx

Configure Nginx

Create Nginx Configuration File:

    sudo nano /etc/nginx/sites-available/steenbudget

Example Configuration:

    server {
            listen 80;
            server_name yourdomain.com www.yourdomain.com;
    
        location / {
            root /path/to/frontend/build;
            try_files $uri /index.html;
        }
    
        location /api/ {
            proxy_pass http://localhost:5000;  # Backend URL
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

Enable Configuration:

    sudo ln -s /etc/nginx/sites-available/steenbudget /etc/nginx/sites-enabled/

Test and Restart Nginx:

    sudo nginx -t
    sudo systemctl restart nginx

SSL Configuration (Optional)

    Install Certbot:

    sudo apt install certbot python3-certbot-nginx

Obtain SSL Certificate:

    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

    Auto-renewal:

    Certbot installs a cron job for automatic renewal.

8. Setting Up Graylog for Logging (Optional)
Install Docker

        sudo apt update
        sudo apt install docker.io
        sudo systemctl start docker
        sudo systemctl enable docker

Set Up MongoDB and Elasticsearch

MongoDB:

    docker run --name mongodb -d mongo:4.2

Elasticsearch:

    docker run --name elasticsearch -e "discovery.type=single-node" -d docker.elastic.co/elasticsearch/elasticsearch:7.10.2

Run Graylog

    docker run --name graylog --link mongodb:mongo --link elasticsearch:elasticsearch -p 9000:9000 -d graylog/graylog:4.0

    Access Graylog at http://your-server-ip:9000.

Configure Graylog in Program.cs

Uncomment and Configure:

    .WriteTo.Graylog(new GraylogSinkOptions
    {
        HostnameOrAddress = "your-server-ip",
        Port = 12201  // Default Graylog port
    })

Restart Service:

    sudo systemctl restart steenbudget.service

Note

Graylog consumes significant resources.
Ensure your server has adequate capacity.

9. Domain, DNS, and Email Configuration (Optional)
DNS Configuration with Cloudflare

    Add DNS Records:
        A Record for @ pointing to your server's IP.
        A Record or CNAME for www pointing to @ or your server's IP.
        Subdomains (if needed): e.g., api.yourdomain.com.

SPF, DKIM, and DMARC Records

SPF Record:

    v=spf1 ip4:your-server-ip ~all

DKIM:

    Install and configure OpenDKIM.
    Generate keys and add the public key to your DNS as a TXT record.

DMARC Record:

    v=DMARC1; p=none; rua=mailto:postmaster@yourdomain.com

SSL Certificates

    Generate SSL Certificates with Let's Encrypt:

    sudo certbot --nginx

    Auto-renewal:

    Certbot sets up automatic renewal via cron.

10. Final Security and Maintenance

    SSH Security:
        Use SSH keys.
        Change default SSH port (optional).
        Regularly update and manage user access.

    Database Security:
        Restrict access to necessary IPs or localhost.
        Use strong passwords and limited privileges for database users.

    Regular Updates:

        sudo apt update && sudo apt upgrade -y

    Monitoring Logs:
        Check logs for unusual activity.
        Use tools like Fail2Ban and UFW for added security.

    Backups:
        Implement regular backups of databases and critical files.

    Performance Monitoring:
        Use tools like htop or top to monitor system resources.

11. Conclusion

You have successfully installed and configured SteenBudgetSolution. Remember to:

    Keep your system and dependencies updated.
    Regularly monitor your application's performance and security.
    Take security seriously, especially if running a mail server or exposing services to the internet.

Note: This installation guide is designed to be comprehensive. If you encounter any issues or have suggestions for improvements, please contribute to the project by submitting an issue or pull request on GitHub.
