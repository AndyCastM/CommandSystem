# Sistema de Gestión de Comandas (SaaS Multi-Tenant)

Plataforma web para gestión de pedidos en restaurantes con soporte multi-sucursal y procesamiento en tiempo real.

## Features

- Arquitectura multi-tenant (empresas con múltiples sucursales)
- Procesamiento de comandas en tiempo real
- Dashboard con métricas (tiempos de preparación y ventas)
- Integración con Amazon Alexa
- Generación automática de tickets (impresoras térmicas)

## Arquitectura

- Backend: NestJS
- Frontend: Angular
- Base de datos: MySQL

## Multi-tenant

Cada empresa funciona como un tenant independiente, con aislamiento lógico de datos mediante su id.

## Métricas

- Tiempo promedio de preparación
- Tiempo de entrega
- Ventas por día/semana/mes
