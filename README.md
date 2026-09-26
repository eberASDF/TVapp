# TVapp

Checador móvil y pantalla TV hechos en React Native. La pantalla conserva el tablero 70/30 y muestra los registros del día en tiempo real. Esta versión escolar usa **solo empleados ficticios**.

## Flujo

1. En el móvil, pulsa **Registrar entrada** o **Registrar salida**.
2. Confirma con la biometría local del teléfono. Si falla o se cancela, no se abre la identificación ni se registra nada.
3. Escribe el nombre y la clave del empleado ficticio creado manualmente en Firestore.
4. Firestore verifica el hash de la clave en un documento privado y guarda la asistencia con hora del servidor. La TV la recibe con `onSnapshot`.

No se guardan huellas ni rostros. No se utiliza Firebase Authentication, correo, Cloud Functions ni servicios de pago. El horario es 07:00–15:00, con cinco minutos de tolerancia en `America/Phoenix`.

## Ejecutar

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run mobile
npm.cmd run tv
```

Ejecuta móvil y TV en terminales separadas. Abre cada QR con Expo Go. No necesitas Android Studio para ver la pantalla en un teléfono Android; colócalo horizontalmente para la vista TV. La biometría se solicita solo en la app móvil. Para compilar una APK o instalar en un emulador Android sí se requiere el SDK nativo.

Ambas apps necesitan sus archivos `.env` apuntando al mismo proyecto Firebase. Sigue [la guía de Firestore](docs/FIREBASE.md) para crear empleados ficticios y configurar las aplicaciones. La pantalla mostrará “Sin avisos por mostrar” hasta que agregues un aviso en `tablero`; los registros aparecen en cuanto el móvil registra.

## Validación y límites

`npm.cmd run check` ejecuta TypeScript y las pruebas de negocio, biometría y voz. Las reglas se prueban en Firestore Emulator como indica [la guía](docs/FIREBASE.md). Los [resultados](docs/RESULTADOS.md) distinguen las pruebas automatizadas de las pendientes en dispositivos.

El retraso se calcula desde el timestamp del servidor y el horario conservado en cada asistencia. Se permite una entrada y una salida por empleado y día; la salida requiere entrada previa. Los registros son inmutables para las apps.

**Seguridad del prototipo:** la lectura de asistencias es pública para que la TV funcione sin cuenta; usa solo nombres ficticios. Los perfiles y hashes no se pueden leer desde el cliente. Firestore no puede demostrar que el sensor biométrico se usó en un cliente modificado ni limitar intentos de clave sin otro servicio. No uses esta versión para asistencia real.
