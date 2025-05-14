#!/bin/bash

# Verificar si se instalaron las dependencias
if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias..."
  npm install
fi

# Verificar si existe el archivo .env
if [ ! -f ".env" ]; then
  echo "Creando archivo .env a partir de .env.example..."
  cp .env.example .env
  echo "Por favor, edita el archivo .env con tus credenciales de base de datos"
  echo "Presiona Enter para continuar cuando hayas terminado..."
  read
fi

# Preguntar si debe restaurar la base de datos
echo "¿Deseas restaurar la base de datos? (s/n)"
read restaurar

if [ "$restaurar" = "s" ] || [ "$restaurar" = "S" ]; then
  echo "Restaurando la base de datos..."
  
  # Obtener información de conexión del archivo .env
  source .env
  
  # Preguntar si desea restaurar la estructura o los datos completos
  echo "¿Qué deseas restaurar?"
  echo "1) Solo la estructura de la base de datos (backup.sql)"
  echo "2) Estructura y datos completos (database-full.sql)"
  read opcion
  
  if [ "$opcion" = "1" ]; then
    psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f backup.sql
  elif [ "$opcion" = "2" ]; then
    psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f database-full.sql
  else
    echo "Opción no válida. Saltando restauración de la base de datos."
  fi
fi

# Iniciar la aplicación
echo "Iniciando la aplicación..."
npm run dev