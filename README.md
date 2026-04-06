# CRM SaaS - Sistema de Gestión de Leads

CRM multi-tenant para agencias de generación de leads y ventas, construido con InsForge, PostgreSQL, Redis y Next.js.

## 🚀 Inicio Rápido

### 1. Configurar InsForge

```bash
# Vincular el proyecto (ya hecho)
npx @insforge/cli link --project-id d2ac8737-96b0-452a-a20f-7fed71816e6c

# Desplegar el esquema de base de datos
npx @insforge/cli db import database/schema.sql
```

### 2. Configurar Frontend

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con tus credenciales
# NEXT_PUBLIC_INSFORGE_URL=https://gedn635p.us-east.insforge.app
# NEXT_PUBLIC_INSFORGE_ANON_KEY=tu-anon-key
```

### 3. Configurar Autenticación

Configurar OAuth providers en el dashboard de InsForge:

1. Ir a Auth > Providers
2. Habilitar Google OAuth
3. Habilitar Facebook OAuth
4. Configurar URLs de callback: `http://localhost:3000/auth/callback`

### 4. Desplegar Funciones

```bash
# Desplegar funciones de backend
npx @insforge/cli functions deploy lead-created
npx @insforge/cli functions deploy api/leads
npx @insforge/cli functions deploy api/deals
npx @insforge/cli functions deploy api/tasks
```

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
crm/
├── database/
│   └── schema.sql          # Esquema completo de PostgreSQL
├── docs/
│   └── ARCHITECTURE.md     # Documentación de arquitectura
├── insforge/
│   └── functions/
│       ├── lead-created/   # Automatización de leads
│       └── api/
│           ├── leads/      # API de leads
│           ├── deals/      # API de deals
│           └── tasks/      # API de tareas
├── src/
│   ├── app/                # Páginas de Next.js
│   ├── components/         # Componentes React
│   ├── hooks/              # Hooks de datos
│   ├── lib/                # Utilidades y clientes
│   └── types/              # Tipos TypeScript
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🗄️ Modelo de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `tenants` | Organizaciones (multi-tenant) |
| `users` | Usuarios del sistema |
| `leads` | Contactos/prospectos |
| `deals` | Oportunidades del pipeline |
| `tasks` | Tareas y seguimientos |
| `notes` | Notas y comentarios |
| `activities` | Log de auditoría |
| `assignment_rules` | Reglas de asignación |

### Roles de Usuario

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso completo, gestión de usuarios |
| `closer` | Ver todos los leads, gestionar pipeline |
| `setter` | Leads asignados únicamente |

## 🔧 Funcionalidades

### Gestión de Leads
- Crear, editar, eliminar leads
- Campos: nombre, email, teléfono, empresa, estado, fuente, valor, notas
- Historial de interacciones
- Filtros y búsqueda

### Pipeline de Ventas (Kanban)
- Etapas: Lead → Contactado → Calificado → Agendado → Ganado/Perdido
- Drag & drop para mover deals
- Vista de pipeline con valores totales

### Automatizaciones
- Asignación automática (round robin)
- Creación de tareas de seguimiento
- Notificaciones en tiempo real

### Multi-tenant
- Aislamiento completo de datos por tenant
- RLS policies en PostgreSQL
- Autenticación con roles

## 🔐 Autenticación

El sistema soporta:
- Email/Contraseña con verificación OTP
- Google OAuth
- Facebook OAuth

## 📡 API Endpoints

### Leads
```
GET    /api/leads           # Listar leads
GET    /api/leads/:id       # Obtener lead
POST   /api/leads           # Crear lead
PUT    /api/leads/:id       # Actualizar lead
DELETE /api/leads/:id       # Eliminar lead
```

### Deals
```
GET    /api/deals           # Listar deals (pipeline)
GET    /api/deals/:id       # Obtener deal
POST   /api/deals           # Crear deal
PUT    /api/deals/:id       # Actualizar deal
PUT    /api/deals/:id?stage # Cambiar etapa
DELETE /api/deals/:id       # Eliminar deal
```

### Tasks
```
GET    /api/tasks           # Listar tareas
GET    /api/tasks/:id       # Obtener tarea
POST   /api/tasks           # Crear tarea
PUT    /api/tasks/:id       # Actualizar tarea
PUT    /api/tasks/:id?complete # Completar tarea
DELETE /api/tasks/:id       # Eliminar tarea
```

## 🚢 Despliegue a Producción

### Frontend (VPS / Vercel)

```bash
# Build de producción
npm run build

# Desplegar con InsForge
npx @insforge/cli deployments deploy ./dist
```

### Variables de Entorno (Producción)

```env
NEXT_PUBLIC_INSFORGE_URL=https://gedn635p.us-east.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=tu-anon-key-producción
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

## 📈 Escalabilidad

El sistema está diseñado para escalar:

1. **Base de datos**: Índices optimizados, RLS policies eficientes
2. **Cache**: Redis para colas y caché de sesión
3. **Workers**: Funciones serverless para procesamiento async
4. **Multi-tenant**: Aislamiento de datos por tenant

## 🔧 Mantenimiento

### Backup de Base de Datos

```bash
npx @insforge/cli db export --output backup.sql
```

### Ver Logs

```bash
npx @insforge/cli logs postgres.logs
npx @insforge/cli logs function.logs
```

## 📝 Licencia

MIT