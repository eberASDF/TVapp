# Firestore para TVapp escolar

El proyecto es `tvapp-951f9`, con Firestore Standard en `us-central1` y plan Spark. Esta versión no usa Firebase Authentication, Cloud Functions ni Storage para el checador. Usa únicamente empleados ficticios porque `asistencias` se lee públicamente para mostrarla en la TV.

## Configurar las apps

En `apps/mobile/.env` y `apps/tv/.env` coloca la misma configuración pública de la app web del proyecto. Copia los nombres de variables de cada `.env.example`:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=valor-de-Firebase
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tvapp-951f9
EXPO_PUBLIC_FIREBASE_APP_ID=valor-de-Firebase
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_EMULATOR_HOST=
```

`API_KEY`, `PROJECT_ID` y `APP_ID` son necesarios. `STORAGE_BUCKET` puede quedar vacío. En `apps/mobile/.env` agrega `EXPO_PUBLIC_LOCAL_SERVER_URL=ws://IP-DE-TU-PC:8083`, con la IP LAN que imprime `npm.cmd run local:server`. La TV emulada usa `ws://10.0.2.2:8083` automáticamente. Reinicia Metro tras cambiar `.env`. No pongas claves de empleado ni credenciales administrativas en variables `EXPO_PUBLIC_*`.

## Crear un empleado ficticio

Desde `C:\Users\eberh\TVapp`, ejecuta:

```powershell
node scripts/new-employee.mjs
```

Escribe el nombre exacto que se usará en el móvil (máximo 15 caracteres) y una clave de 6 a 15 caracteres. El script no muestra la clave y entrega el ID del documento y el hash SHA-256. En **Firebase Console → Firestore Database → Datos**, crea la colección `empleados` y un documento con ese ID. Agrega exactamente:

| Campo | Tipo | Valor |
| --- | --- | --- |
| `nombre` | string | Nombre mostrado por el script |
| `activo` | boolean | `true` |
| `claveHash` | string | Hash mostrado por el script |

No guardes el campo `clave` en Firestore. Para desactivar un empleado, cambia `activo` a `false` en la consola. Los nombres deben ser únicos después de quitar acentos y convertir espacios en guiones; por ejemplo, `Ana López` usa el ID `ana-lopez`. Si cambias el nombre, genera un nuevo ID y hash.

`config/horario` ya existe en `tvapp-951f9` con 07:00–15:00, cinco minutos, `America/Phoenix` y desfase UTC −7. Refleja el horario fijado en el código y las reglas; editar solo el documento no cambia el cálculo. No necesitas crear `asistencias` ni `comprobaciones`: el primer registro crea ambas colecciones de manera atómica. `comprobaciones` es privado; contiene el hash presentado en cada intento correcto. Antes de abrir la cámara se verifica nombre y clave mediante una lectura autorizada por reglas en `validaciones`; no se crea ningún documento ahí. `asistencias` contiene `{empleadoId, nombre, tipo, timestamp, dia, zonaHoraria, entradaEsperada, salidaEsperada, toleranciaMinutos, fotoMiniatura}`. La miniatura JPEG tiene un máximo de 40 000 caracteres base64 y no se indexa; la foto capturada solo queda en el teléfono. El estado y minutos de retardo se calculan desde el timestamp del servidor y ese horario guardado.

La zona de Avisos en la TV muestra la miniatura del nuevo registro durante tres segundos y después vuelve al estado vacío. Esta versión Expo Go no transmite video en vivo. El código actual no consulta `tablero`.

## Probar reglas antes de publicar

Desde PowerShell, con Java de Android Studio disponible:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\node_modules\.bin\firebase.cmd emulators:exec --project demo-tvapp --only firestore "node --test tests/firestore.rules.test.mjs"
```

La suite prueba validación previa de nombre/clave, miniatura pequeña obligatoria, transacción real de entrada/salida, duplicados, salida sin entrada, alteraciones de campos, denegación de borrado y lectura en vivo con `onSnapshot`. También confirma que las antiguas rutas de limpieza y señalización no son accesibles. Usa el proyecto de demostración; no toca datos reales. Tras pasarla, publica solo las reglas e índices de Firestore:

```powershell
.\node_modules\.bin\firebase.cmd deploy --project tvapp-951f9 --only firestore
```

El móvil usa `serverTimestamp()` y la TV filtra por día local, ordena por timestamp y muestra hasta 100 registros. El cálculo considera a tiempo hasta las 07:05:00; a partir de las 07:05:01 se marca retardo. La salida anterior a las 15:00 se marca anticipada.

Las reglas protegen perfiles, claves y escrituras de asistencia; bloquean el borrado de `asistencias` y `comprobaciones`. **Limpiar historial** guarda un corte visual en el servidor local de la PC; la TV solo presenta asistencias posteriores. No hay transmisión de video. Las miniaturas de asistencia son públicamente legibles para la TV: usa únicamente fotos de prueba con permiso. Sin un backend de confianza, Firestore no puede comprobar remotamente que se usó biometría ni imponer un límite de intentos de clave. Úsalo solo con datos ficticios.
