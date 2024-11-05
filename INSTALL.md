Installation Notes for SteenBudgetSolution
1. Prerequisites

Ensure the following are installed on your Linux server:

    Nginx (or another web server) for serving the frontend.
    Dovecot (or another SMTP server) for handling outgoing emails.
    MariaDB (or MySQL) for database storage.
    Fail2Ban and UFW for enhanced SSH and SMTP security.
    .NET 8 SDK and Runtime for the backend application.

2. Environment Variables

Set the following environment variables for secure handling of sensitive data:

    JWT_SECRET_KEY: Secret key for JSON Web Token authentication.
    DB_CONNECTION_STRING: Connection string for the MariaDB database.
    SMTP_PASSWORD: Password for the no-reply@mydomain.com SMTP user (used for user verification and notifications).
    RECAPTCHA_SECRET_KEY: Secret key for Google reCAPTCHA verification.
    SMTP_PASSWORD_INFO: Password for the info@mydomain.com SMTP user (for contact and support purposes).

Configure the environment variables in /etc/environment.d/steenbudget.conf or use another secure location that is referenced by /etc/systemd/system/steenbudget.service for environment loading.
3. Security Tips
SSH Configuration

    Use SSH keys instead of password-based authentication.
    Modify /etc/ssh/sshd_config to disable password-based login and enforce key-based authentication.

UFW Firewall

    Allow only necessary ports (typically 22 for SSH (or even better, a random port), 80/443 for HTTP/HTTPS, and the port for your SMTP server).

    Enable UFW with sudo ufw enable.

    Example configuration:

    bash

    sudo ufw allow OpenSSH
    sudo ufw allow "Nginx Full"
    sudo ufw allow 587  # if using SMTP over TLS

Fail2Ban

    Configure Fail2Ban to monitor and restrict malicious login attempts on SSH and SMTP.
    Place configuration files in /etc/fail2ban/jail.local.

4. Database Setup

Run the database scripts included with SteenBudgetSolution to set up your MariaDB tables and relationships.

    Log into MariaDB:

    bash

sudo mysql -u root -p

Create the database and run the scripts CreateTables.sql and CreateUser.sql: 
(The script CreateTable automaticly creates Test or Prod version depending on flags, please read for running)
sql
    
    CREATE DATABASE steenbudgetPROD; -- or steenbudgetTEST 
    USE steenbudgetPROD; -- or steenbudgetTEST
    SOURCE Backend\SqlCode\MariaDB\CreateTables.sql;
    SOURCE Backend\SqlCode\MariaDB\CreateUser.sql;

5. Nginx Setup

For serving the frontend:

    Configure Nginx to proxy requests to the backend and serve the React frontend.

    Use a configuration like this (adjust paths and server names as necessary):

    nginx

    server {
        listen 80;
        server_name mydomain.com;

        location / {
            root /path/to/frontend/build;
            try_files $uri /index.html;
        }

        location /api/ {
            proxy_pass http://localhost:5000;  # or your backend URL
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

6. Starting the Application

    Ensure all environment variables are loaded and accessible to the service.

    Start and enable the service to run on boot:

    bash

    sudo systemctl start steenbudget.service
    sudo systemctl enable steenbudget.service

7. Setting Up Graylog for Logging (Optional)

To enable centralized logging with Graylog, follow these steps to set up Graylog along with MongoDB and Elasticsearch using Docker. This setup is optional but highly recommended for enhanced monitoring and logging.
Step 1: Install Docker (if not already installed)

To install Docker on your system:

bash

sudo apt update
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker

Step 2: Set Up MongoDB and Elasticsearch with Docker

Graylog requires MongoDB and Elasticsearch. Use Docker to create instances of each:

    MongoDB: Run the following command to start MongoDB.

    bash

docker run --name mongodb -d mongo:4.2

Elasticsearch: Run the following command to start Elasticsearch.

bash

    docker run --name elasticsearch -e "discovery.type=single-node" -d docker.elastic.co/elasticsearch/elasticsearch:7.10.2

Step 3: Run Graylog in Docker

Now, start Graylog and connect it to MongoDB and Elasticsearch.

bash

docker run --name graylog --link mongo:mongo --link elasticsearch:elasticsearch -p 9000:9000 -d graylog/graylog:4.0

Graylog will be accessible on your private network at http://<your-server-ip>:9000.
Step 4: Configure Graylog Sink in Program.cs (Optional)

To enable Graylog logging in your SteenBudgetSolution, uncomment the Graylog configuration in Program.cs:

csharp

/*
.WriteTo.Graylog(new GraylogSinkOptions
{
    HostnameOrAddress = "<your-server-ip>",
    Port = <graylog-port>
})
*/

Replace <your-server-ip> with the IP address of your server and <graylog-port> with the Graylog listening port (default is 12201).
Step 5: Restart SteenBudget Solution

After making changes, restart the application to apply the Graylog logging configuration:

bash

sudo systemctl restart steenbudget.service

Step 6: Log In to Graylog

Access Graylog from your browser at http://<your-server-ip>:9000. Log in with the default credentials (admin / admin). You can create dashboards, set up alerts, and monitor logs from here.   

8. Domain, DNS, and Email Configuration Optional

For users who wish to make SteenBudgetSolution accessible publicly and ensure secure, authenticated email delivery, follow these optional steps:

    DNS Configuration with Cloudflare
        Add DNS Records: In your Cloudflare account (or another DNS provider), create DNS records to point your domain to your server's IP address. For example:
            A record for @ pointing to your server's IP (e.g., 123.45.67.89)
            A or CNAME record for www pointing to @ or your server’s IP.
        Set Up Subdomains (if needed): Add records for any subdomains, such as api.yourdomain.com.

    SPF and DKIM for Email Authentication
        SPF Record: Add an SPF record to authenticate emails sent from your domain. This record helps reduce spam and protects your domain’s reputation:
            Example: v=spf1 ip4:123.45.67.89 include:_spf.google.com ~all
            Replace 123.45.67.89 with your server’s IP and adjust if you’re using third-party email services.
        DKIM (DomainKeys Identified Mail): Configure DKIM to sign emails, adding another layer of security and helping prevent email spoofing.
            You’ll need to generate a DKIM key pair and add the public key as a TXT record in your DNS settings. Many email servers, like Postfix, support DKIM signing through plugins like OpenDKIM.

    SSL Certificates
        Generate SSL Certificates: Secure your domain with SSL to enable HTTPS. You can use Let’s Encrypt for free SSL certificates:
            Install Certbot (sudo apt install certbot) and run: sudo certbot --nginx (or --apache if you’re using Apache).
        Renew SSL Automatically: Configure Certbot to renew certificates automatically by adding a cron job: 0 0,12 * * * /usr/bin/certbot renew --quiet

    Once SSL is set up, update your web server configuration to redirect HTTP requests to HTTPS for added security.

9. Final Security and Maintenance

    SSH: Ensure your SSH access is secured as mentioned.
    Database Security: Restrict database access to only the necessary IPs or local requests.
    Regular Updates: Keep your system updated with sudo apt update && sudo apt upgrade.
    Monitoring Logs: Periodically check logs for errors or suspicious activity, especially from Fail2Ban and UFW.
