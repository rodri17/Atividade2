FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libpq-dev \
    librabbitmq-dev \
    curl \
    zip \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_pgsql sockets pcntl \
    && pecl install redis amqp \
    && docker-php-ext-enable redis amqp \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY apache-config.conf /etc/apache2/sites-available/000-default.conf
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf
RUN a2enmod rewrite headers

COPY . /var/www/html/

WORKDIR /var/www/html/
RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /var/www/html

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/health || exit 1