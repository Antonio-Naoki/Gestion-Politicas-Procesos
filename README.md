# Cerater - Sistema de Gestión de Procesos y Políticas

## Descripción

Cerater es una aplicación web desarrollada para gestionar procesos internos y políticas de la empresa Cerater, dedicada a la fabricación de productos cerámicos. El sistema facilita la gestión de documentos, flujos de aprobación jerárquicos, asignación de tareas, y administración de políticas empresariales.

## Características Principales

- **Autenticación y Autorización**: Sistema de roles (admin, manager, coordinator, analyst, operator) con diferentes niveles de acceso.
- **Gestión de Documentos**: Creación, edición, almacenamiento y versionado de documentos.
- **Flujos de Aprobación**: Flujos de trabajo para la revisión y aprobación de documentos.
- **Gestión de Tareas**: Asignación y seguimiento de tareas relacionadas con documentos y procesos.
- **Políticas Empresariales**: Publicación de políticas con seguimiento de aceptación por parte de los empleados.
- **Registro de Actividad**: Seguimiento de todas las acciones realizadas en el sistema.
- **Panel de Control**: Vista centralizada con estadísticas y actividades relevantes.

## Tecnologías Utilizadas

- **Frontend**: React, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form
- **Backend**: Node.js, Express
- **Base de Datos**: PostgreSQL
- **ORM**: Drizzle ORM
- **Autenticación**: Passport.js, express-session
- **Bundler**: Vite

## Requisitos Previos

- Node.js v18 o superior
- npm v8 o superior
- PostgreSQL v14 o superior

## Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd cerater-app
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar la Base de Datos

#### A. Configurar PostgreSQL

1. Crea una base de datos en PostgreSQL:

```bash
psql -U postgres
CREATE DATABASE cerater;
\q
```

2. Configura las variables de entorno:

Crea un archivo `.env` en la raíz del proyecto:

```
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/cerater
SESSION_SECRET=tu-secreto-seguro-para-sesiones
```

#### B. Inicializar la Base de Datos

```bash
# Aplicar esquema de la base de datos
npm run db:push

# Alternativamente, puedes restaurar desde el backup
psql -U postgres -d cerater -f backup.sql
```

### 4. Iniciar la Aplicación

```bash
# Iniciar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar en modo producción
npm run start
```

La aplicación estará disponible en: `http://localhost:5000`

## Estructura del Proyecto

```
cerater-app/
├── client/               # Código del frontend
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilidades compartidas
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── App.tsx       # Configuración principal de la app
│   │   └── main.tsx      # Punto de entrada
├── server/               # Código del backend
│   ├── auth.ts           # Configuración de autenticación
│   ├── db.ts             # Configuración de la base de datos
│   ├── index.ts          # Punto de entrada del servidor
│   ├── routes.ts         # Rutas de la API
│   ├── storage.ts        # Operaciones de almacenamiento
│   └── vite.ts           # Configuración de Vite para el servidor
├── shared/               # Código compartido entre cliente y servidor
│   └── schema.ts         # Esquema de la base de datos
└── ... archivos de configuración
```

## Usuarios Predeterminados

- **Admin**: 
  - Usuario: admin
  - Contraseña: admin123

## API Endpoints

### Autenticación

- `POST /api/register` - Registrar nuevo usuario
- `POST /api/login` - Iniciar sesión
- `POST /api/logout` - Cerrar sesión
- `GET /api/user` - Obtener usuario autenticado

### Documentos

- `GET /api/documents` - Listar documentos
- `GET /api/documents/:id` - Obtener un documento
- `POST /api/documents` - Crear documento
- `PATCH /api/documents/:id` - Actualizar documento
- `DELETE /api/documents/:id` - Eliminar documento

### Aprobaciones

- `GET /api/approvals` - Listar aprobaciones
- `GET /api/approvals/:id` - Obtener una aprobación
- `POST /api/approvals` - Crear aprobación
- `PATCH /api/approvals/:id` - Actualizar aprobación

### Tareas

- `GET /api/tasks` - Listar tareas
- `GET /api/tasks/:id` - Obtener una tarea
- `POST /api/tasks` - Crear tarea
- `PATCH /api/tasks/:id` - Actualizar tarea

### Políticas

- `GET /api/policies` - Listar políticas
- `POST /api/policies/:id/accept` - Aceptar política

## Scripts Disponibles

- `npm run dev` - Iniciar en modo desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar en modo producción
- `npm run db:push` - Aplicar cambios al esquema de la base de datos

## Desarrollo

### Añadir un Nuevo Modelo de Datos

1. Actualiza `shared/schema.ts` para definir el nuevo modelo
2. Ejecuta `npm run db:push` para aplicar los cambios a la base de datos
3. Actualiza `server/storage.ts` para incluir métodos CRUD para el nuevo modelo
4. Crea los endpoints necesarios en `server/routes.ts`
5. Implementa los componentes y hooks necesarios en el cliente

## Licencia

Este proyecto es propiedad de Cerater y está protegido por derechos de autor.

## Contacto

Para más información, contactar al departamento de IT de Cerater.