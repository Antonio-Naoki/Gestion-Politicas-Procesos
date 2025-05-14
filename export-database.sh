#!/bin/bash

# Exportar la estructura y datos de la base de datos
echo "Exportando estructura y datos de la base de datos..."
pg_dump --no-owner --clean --if-exists -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE > database-full.sql

# Exportar solo la estructura (para backup.sql)
echo "Exportando estructura de la base de datos..."
pg_dump --no-owner --clean --if-exists --schema-only -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE > backup.sql

echo "Exportación completa!"
echo "Puedes encontrar los archivos:"
echo "- database-full.sql: Estructura y datos completos"
echo "- backup.sql: Solo estructura de la base de datos"