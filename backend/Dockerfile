# Test-/productie-achtige stack: Apache + mod_php op PHP 8.0 (= de host-versie).
# De code wordt als volume gemount (zie docker-compose.yml), dus codewijzigingen
# zijn meteen actief — geen rebuild nodig.
FROM php:8.0-apache

# DB-extensie + URL-rewriting (de Slim-router draait via .htaccess) en
# unzip/git zodat Composer pakketten kan uitpakken. opcache voorkomt dat elke
# request alle bronbestanden opnieuw compileert (zie docker/opcache.ini).
# Xdebug (opt-in functietracing, zie docker/xdebug.ini) wordt via PECL gebouwd —
# daarvoor is $PHPIZE_DEPS (compiler/autoconf) nodig. Xdebug 3.3 is de laatste
# serie die PHP 8.0 ondersteunt.
RUN apt-get update \
 && apt-get install -y --no-install-recommends $PHPIZE_DEPS unzip git \
 && docker-php-ext-install pdo_mysql \
 && pecl install xdebug-3.3.2 \
 && docker-php-ext-enable opcache xdebug \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*

# opcache-instellingen (dev-vriendelijk: live-reload behouden via revalidate_freq).
COPY docker/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini

# Xdebug-instellingen (zz- zodat ze ná de door docker-php-ext-enable gegenereerde
# extensie-ini laden). Tracing staat standaard uit; zie docker/xdebug.ini.
COPY docker/xdebug.ini /usr/local/etc/php/conf.d/zz-xdebug.ini

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
# NB: check op vendor/autoload.php, niet op de map zelf — vendor/ is een named
# volume (zie docker-compose.yml) en bestaat dus al als lege map bij de eerste
# start; alleen de afwezigheid van autoload.php betekent "nog niet geïnstalleerd".
# TRACE=1 in de omgeving → Xdebug-functietracing aan (XDEBUG_MODE=trace) en de
# trace-map aanmaken. Zonder TRACE=1 blijft xdebug.mode op "off" (geen overhead).
CMD ["bash", "-c", "[ -f vendor/autoload.php ] || composer install --no-interaction --no-progress; php bin/init-db.php || true; if [ \"$TRACE\" = \"1\" ] && [ -z \"$XDEBUG_MODE\" ]; then export XDEBUG_MODE=trace; mkdir -p logs/xdebug; chmod -R 777 logs/xdebug; echo 'Xdebug-functietracing AAN → backend/logs/xdebug/ (schrijfbaar voor www-data)'; fi; exec apache2-foreground"]
