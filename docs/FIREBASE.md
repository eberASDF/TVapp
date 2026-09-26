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

`API_KEY`, `PROJECT_ID` y `APP_ID` son necesarios. `STORAGE_BUCKET` puede quedar vacío para el checador y los avisos de texto. Reinicia Metro tras cambiar `.env`. No pongas claves de empleado ni credenciales administrativas en variables `EXPO_PUBLIC_*`.

## Crear un empleado ficticio

Desde `C:\Users\eberh\TVapp`, ejecuta:

```powershell
node scripts/new-employee.mjs
```

Escribe el nombre exacto que se usará en el móvil y una clave de al menos 8 caracteres. El script no muestra la clave y entrega el ID del documento y el hash SHA-256. En **Firebase Console → Firestore Database → Datos**, crea la colección `empleados` y un documento con ese ID. Agrega exactamente:

| Campo | Tipo | Valor |
| --- | --- | --- |
| `nombre` | string | Nombre mostrado por el script |
| `activo` | boolean | `true` |
| `claveHash` | string | Hash mostrado por el script |

No guardes el campo `clave` en Firestore. Para desactivar un empleado, cambia `activo` a `false` en la consola. Los nombres deben ser únicos después de quitar acentos y convertir espacios en guiones; por ejemplo, `Ana López` usa el ID `ana-lopez`. Si cambias el nombre, genera un nuevo ID y hash.

No necesitas crear `asistencias`, `comprobaciones` ni un documento de horario: el primer registro crea las dos primeras colecciones de manera atómica, y el horario escolar está fijado en el código y las reglas. `comprobaciones` es privado; contiene el hash presentado en cada intento correcto. `asistencias` contiene `{empleadoId, nombre, tipo, timestamp, dia, zonaHoraria, entradaEsperada, salidaEsperada, toleranciaMinutos}`. El estado y minutos de retardo se calculan desde el timestamp del servidor y ese horario guardado.

Opcionalmente, crea un aviso de texto en `tablero/{id}` con `titulo`, `texto`, `tipo: "aviso"`, `storagePath: ""`, `activo: true`, `orden: 0` y `duracionSegundos: 10`. La TV muestra los registros aunque no haya avisos.

## Probar reglas antes de publicar

Desde PowerShell, con Java de Android Studio disponible:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\node_modules\.bin\firebase.cmd emulators:exec --project demo-tvapp --only firestore "node --test tests/firestore.rules.test.mjs"
```

La suite prueba clave incorrecta, perfil privado, transacción real de entrada/salida, duplicados, salida sin entrada, alteraciones de campos y la lectura en vivo con `onSnapshot`. Usa el proyecto de demostración; no toca datos reales. Tras pasarla, publica solo las reglas e índices de Firestore:

```powershell
.\node_modules\.bin\firebase.cmd deploy --project tvapp-951f9 --only firestore
```

El móvil usa `serverTimestamp()` y la TV filtra por día local, ordena por timestamp y muestra hasta 100 registros. El cálculo considera a tiempo hasta las 07:05:00; a partir de las 07:05:01 se marca retardo. La salida anterior a las 15:00 se marca anticipada.

Las reglas protegen perfiles, claves y escrituras de asistencia, pero sin Authentication ni servidor no pueden comprobar remotamente que se usó biometría ni imponer un límite de intentos de clave. La biometría sigue siendo una condición de la app móvil oficial. Úsalo solo con datos ficticios.
