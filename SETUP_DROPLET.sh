#!/bin/bash
# SETUP COMPLETO PARA GANESHA EN DIGITALOCEAN
# Ejecutar en el Droplet: ssh root@209.38.111.153

echo "=== ACTUALIZANDO SISTEMA ==="
apt update && apt upgrade -y

echo "=== INSTALANDO PostgreSQL ==="
apt install -y postgresql postgresql-contrib

# Iniciar servicio
systemctl start postgresql
systemctl enable postgresql

echo "=== CREANDO BASE DE DATOS ==="
sudo -u postgres psql << EOF
-- Crear usuario
CREATE USER ganesha WITH PASSWORD 'Ganesha_Admin_2026_Secure';
ALTER USER ganesha CREATEDB;

-- Crear base de datos
CREATE DATABASE ganesha_db OWNER ganesha;

-- Conectar a la BD
\c ganesha_db

-- Crear tablas (copiar del workflow n8n)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    duracion_minutos INT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL
);

INSERT INTO servicios (nombre, duracion_minutos, precio) VALUES
('Depilación', 30, 8000),
('Uñas', 90, 15000),
('Estética Corporal', 60, 20000),
('Pestañas', 120, 18000);

CREATE TABLE turnos (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    servicio_id INT REFERENCES servicios(id),
    fecha_hora TIMESTAMP NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    seña_pagada DECIMAL(10, 2) DEFAULT 0,
    UNIQUE (servicio_id, fecha_hora)
);

CREATE TABLE contabilidad_general (
    id SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    concepto VARCHAR(255) NOT NULL,
    tipo_movimiento VARCHAR(10) NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO')),
    monto DECIMAL(10, 2) NOT NULL,
    turno_id INT REFERENCES turnos(id) NULL
);

EOF

echo "=== CONFIGURANDO POSTGRESQL PARA ACCESO REMOTO ==="
# Editar postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '0.0.0.0'/" /etc/postgresql/*/main/postgresql.conf

# Editar pg_hba.conf para permitir acceso de n8n
echo "host    all             all             10.10.0.0/16            md5" >> /etc/postgresql/*/main/pg_hba.conf
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/*/main/pg_hba.conf

systemctl restart postgresql

echo "=== INSTALANDO n8n ==="
apt install -y nodejs npm

npm install -g n8n

echo "=== CREANDO SERVICIO SYSTEMD PARA n8n ==="
cat > /etc/systemd/system/n8n.service << 'SYSTEMD'
[Unit]
Description=n8n Workflow Automation
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
ExecStart=/usr/local/bin/n8n start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable n8n
systemctl start n8n

echo "=== INSTALANDO FIREWALL Y ABRIENDO PUERTOS ==="
ufw allow 22/tcp     # SSH
ufw allow 5432/tcp   # PostgreSQL
ufw allow 5678/tcp   # n8n
ufw --force enable

echo ""
echo "==========================================="
echo "✅ SETUP COMPLETADO"
echo "==========================================="
echo "PostgreSQL:"
echo "  - Host: 209.38.111.153"
echo "  - Usuario: ganesha"
echo "  - Contraseña: Ganesha_Admin_2026_Secure"
echo "  - Base de datos: ganesha_db"
echo ""
echo "n8n:"
echo "  - URL: http://209.38.111.153:5678"
echo "  - Configurar webhook en Settings"
echo ""
echo "Espera 2-3 minutos para que n8n arranque completamente"
