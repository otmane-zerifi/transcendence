FROM debian:bookworm

RUN apt-get update -y && apt-get upgrade -y && apt-get install iputils-ping -y && apt-get install curl -y \
    && apt-get install nginx -y && mkdir -p /etc/nginx/ssl && \
    apt-get install openssl -y &&     openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/front.key -out /etc/nginx/ssl/front.crt \
    -subj "/C=US/ST=State/L=City/O=MyOrg/OU=MyOrgUnit/CN=localhost"

RUN mkdir -p /var/run/nginx

# Remove default nginx configuration
RUN rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

COPY ./app /app/

COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]