#!/bin/bash

# Crear carpeta temporal
TEMP_DIR=cerater-export
mkdir -p $TEMP_DIR

# Copiar archivos del proyecto
echo "Copiando archivos del proyecto..."
cp -r client server shared components.json drizzle.config.ts package.json package-lock.json postcss.config.js tailwind.config.ts tsconfig.json vite.config.ts README.md .env.example backup.sql $TEMP_DIR/

# Eliminar node_modules y archivos innecesarios
echo "Limpiando archivos temporales y dependencias..."
rm -rf $TEMP_DIR/client/dist $TEMP_DIR/node_modules

# Crear el archivo ZIP
echo "Creando archivo ZIP del proyecto..."
zip -r cerater-project.zip $TEMP_DIR

# Eliminar carpeta temporal
rm -rf $TEMP_DIR

echo "¡Exportación completada!"
echo "El proyecto ha sido exportado a: cerater-project.zip"
echo "Para instalar en tu computadora local:"
echo "1. Descomprime el archivo ZIP"
echo "2. Crea un archivo .env basado en .env.example"
echo "3. Configura y crea la base de datos PostgreSQL"
echo "4. Restaura la estructura de la base de datos con: psql -U [usuario] -d [basededatos] -f backup.sql"
echo "5. Ejecuta 'npm install' para instalar dependencias"
echo "6. Ejecuta 'npm run dev' para iniciar la aplicación"