# TVapp

Checador móvil y pantalla TV hechos en React Native. La pantalla conserva el tablero 70/30 y muestra los registros del día en tiempo real. Esta versión escolar usa **solo empleados ficticios**.

## Flujo

1. En el móvil, pulsa **Registrar entrada** o **Registrar salida**.
2. Confirma con la biometría local del teléfono. Si falla o se cancela, no se abre la identificación ni se registra nada.
3. Escribe el nombre y la clave del empleado ficticio creado manualmente en Firestore. Se validan antes de abrir la cámara.
4. El móvil toma una foto frontal, guarda la imagen capturada en **Capturas** y genera una miniatura JPEG de hasta 40 000 caracteres base64.
5. Firestore guarda la asistencia, la miniatura y la hora del servidor. La TV recibe el registro con `onSnapshot`, muestra foto, nombre, tipo y hora durante tres segundos y vuelve al historial.

No se guardan huellas ni plantillas biométricas: la validación de huella ocurre solo en Android. Sí se conserva la foto capturada en el teléfono y su miniatura en Firestore. No se utiliza Firebase Authentication, correo, Cloud Functions ni servicios de pago. El horario es 07:00–15:00, con cinco minutos de tolerancia en `America/Phoenix`.

## Ejecutar con Expo Go

Instala las dependencias una vez con `npm.cmd ci`. Después, en tres terminales dentro de `C:\Users\eberh\TVapp`, ejecuta:

```powershell
npm.cmd run local:server
npm.cmd run mobile
npm.cmd run tv
```

Cada comando permanece abierto en su propia terminal. Abre el QR de **Mobile** con Expo Go en el Redmi. El servidor de TV usa el puerto 8082 y también inicia en modo Expo Go; la TV puede abrirse en el navegador con `npm.cmd run web -w @tvapp/tv`. El servidor `local:server` solo sincroniza **Limpiar historial**: la asistencia se lee directamente de Firestore aunque ese servidor no esté disponible. El Redmi y la PC deben estar en la misma red local. Si 8081 o 8082 están ocupados, cierra los servidores Metro anteriores antes de reiniciar.

Ambas apps necesitan sus archivos `.env` apuntando al mismo proyecto Firebase. En `apps/mobile/.env` agrega `EXPO_PUBLIC_LOCAL_SERVER_URL=ws://IP-DE-TU-PC:8083` usando la dirección que imprime `local:server`; la TV usa `ws://10.0.2.2:8083` en Android emulado y `ws://localhost:8083` en navegador. Reinicia Metro tras editar `.env`. Sigue [la guía de Firestore](docs/FIREBASE.md) para los empleados ficticios.

**Limpiar historial** oculta en la TV los registros anteriores y conserva asistencias y capturas. La PC guarda el corte visual en `runtime/display-state.json` y no borra documentos de Firebase. La foto capturada permanece en el teléfono; solo su miniatura se envía a Firestore. La zona de Avisos muestra cada nuevo registro tres segundos, sin video en vivo. Si el Redmi no alcanza el servidor local, permite el puerto TCP 8083 en el firewall de Windows para la red privada.

## Validación y límites

`npm.cmd run check` ejecuta TypeScript y las pruebas de negocio, biometría y voz. Las reglas se prueban en Firestore Emulator como indica [la guía](docs/FIREBASE.md). Los [resultados](docs/RESULTADOS.md) distinguen las pruebas automatizadas de las pendientes en dispositivos.

El retraso se calcula desde el timestamp del servidor y el horario conservado en cada asistencia. Se permite una entrada y una salida por empleado y día; la salida requiere entrada previa. Las apps no pueden editar ni borrar registros.

**Seguridad del prototipo:** la lectura de asistencias y sus miniaturas es pública en esta demo escolar. Usa solo nombres y fotos de prueba con permiso. Los perfiles y hashes no se pueden leer desde el cliente. El servicio local acepta conexiones de la red para esta demostración; úsalo solo en una red de confianza. Firestore no puede demostrar que un cliente modificado usó el sensor biométrico ni limitar intentos de clave sin otro servicio. No uses esta versión para asistencia real.
