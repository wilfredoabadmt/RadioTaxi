FROM alpine:3.19

RUN apk update && \
    apk add --no-cache \
    asterisk \
    asterisk-sample-config \
    asterisk-sounds-en \
    asterisk-speex \
    asterisk-srtp \
    curl \
    bash \
    sox

# Directorios de configuración y grabaciones
RUN mkdir -p /etc/asterisk /var/spool/asterisk/monitor /var/log/asterisk

# Copiar configuraciones
COPY config/ /etc/asterisk/

# Permisos
RUN chown -R asterisk:asterisk /etc/asterisk /var/spool/asterisk /var/log/asterisk /var/run/asterisk

EXPOSE 5060/udp 5060/tcp 8088/tcp 10000-10100/udp

USER asterisk

CMD ["asterisk", "-f", "-vvv"]
