# Test-/productie-achtige stack: Apache + mod_php op PHP 8.0 (= de host-versie).
# De code wordt als volume gemount (zie docker-compose.yml), dus codewijzigingen
# zijn meteen actief — geen rebuild nodig.
FROM php:8.0-apache

# DB-extensie + URL-rewriting (de Slim-router draait via .htaccess) en
# unzip/git zodat Composer pakketten kan uitpakken.
RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip git \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install pdo_mysql \
 && a2enmod rewrite

# Composer (alleen nodig als vendor/ ontbreekt; zie de CMD hieronder).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Docroot -> backend/public en .htaccess toestaan.
RUN set -eux; \
    docroot=/var/www/html/backend/public; \
    sed -ri "s!/var/www/html!$docroot!g" /etc/apache2/sites-available/000-default.conf; \
    { echo "<Directory $docroot>"; echo "  AllowOverride All"; echo "  Require all granted"; echo "</Directory>"; } \
      > /etc/apache2/conf-available/zwembad.conf; \
    a2enconf zwembad

WORKDIR /var/www/html/backend

# Installeer dependencies als ze ontbreken, zorg dat het DB-schema bestaat
# (runInitSql via bin/init-db.php — idempotent), draai daarna Apache.
CMD ["bash", "-c", "[ -d vendor ] || composer install --no-interaction --no-progress; php bin/init-db.php || true; exec apache2-foreground"]
