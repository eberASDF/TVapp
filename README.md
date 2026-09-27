# TVapp

Checador móvil y pantalla TV hechos en React Native. La pantalla conserva el tablero 70/30 y muestra los registros del día en tiempo real. Esta versión escolar usa **solo empleados ficticios**.

## Flujo

1. En el móvil, pulsa **Registrar entrada** o **Registrar salida**.
2. Confirma con la biometría local del teléfono. Si falla o se cancela, no se abre la identificación ni se registra nada.
3. Escribe el nombre y la clave del empleado ficticio creado manualmente en Firestore.
4. Firestore verifica el hash de la clave en un documento privado y guarda la asistencia con hora del servidor. La TV la recibe con `onSnapshot`.
5. El móvil toma una foto con la cámara frontal y la conserva solo en el teléfono, en **Capturas**. El nombre y la clave se borran del formulario al terminar.

No se guardan huellas ni rostros. No se utiliza Firebase Authentication, correo, Cloud Functions ni servicios de pago. El horario es 07:00–15:00, con cinco minutos de tolerancia en `America/Phoenix`.

## Ejecutar

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run android:mobile
npm.cmd run android:tv
```

Instala una vez cada Development Build con `android:mobile` en el Redmi conectado por USB y `android:tv` en el emulador Android TV. Después, en **tres terminales separadas**, mantén activos:

```powershell
npm.cmd run local:server
npm.cmd run mobile
npm.cmd run tv
```

WebRTC requiere código nativo y no funciona en Expo Go. La compilación local necesita Android SDK. El Redmi y la PC deben estar en la misma red local; la biometría se solicita solo en el móvil.

Si tu Android Studio trae Java 25, en la terminal de compilación ejecuta antes:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:JAVA_TOOL_OPTIONS = '--enable-native-access=ALL-UNNAMED'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

Para evitar que Expo elija otro dispositivo cuando el Redmi y el emulador estén conectados, instala primero con solo el Redmi conectado y luego inicia el emulador e instala la TV. El Redmi puede desconectarse del USB tras la instalación. Permite a las Development Builds acceder a Metro por la red local.

Los APK de depuración ya compilados se encuentran en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (ARM64) y `apps/tv/android/app/build/outputs/apk/debug/app-debug.apk` (x86_64). Si quieres instalarlos sin recompilar, conecta un dispositivo a la vez y ejecuta `adb install -r RUTA-DEL-APK`.

Ambas apps necesitan sus archivos `.env` apuntando al mismo proyecto Firebase. En `apps/mobile/.env` agrega `EXPO_PUBLIC_LOCAL_SERVER_URL=ws://IP-DE-TU-PC:8083` usando una de las direcciones impresas por `local:server`; el emulador Android TV usa `ws://10.0.2.2:8083` sin configuración adicional. Reinicia Metro tras editar `.env`. Sigue [la guía de Firestore](docs/FIREBASE.md) para los empleados ficticios. La zona izquierda de la TV muestra la cámara al pulsar **Iniciar cámara en TV** en el Redmi. **Limpiar historial** oculta en la TV los registros anteriores y conserva asistencias y capturas; los nuevos aparecen normalmente.

La transmisión usa WebRTC punto a punto en la red local. La PC solo intercambia mensajes de conexión por WebSocket; no recibe el video. Firestore se usa para asistencia, nunca para video ni señalización. La PC guarda el corte visual de la TV en `runtime/display-state.json`; tampoco borra documentos. Al tomar la foto de asistencia, la transmisión libera la cámara y se reanuda después. Las fotos siguen siendo locales con `expo-camera` y `expo-file-system`. Si se pierde la conexión de video, detén y vuelve a iniciar la cámara en el móvil. Permite el puerto TCP 8083 en el firewall de Windows para la red privada si el Redmi no alcanza la PC.

## Validación y límites

`npm.cmd run check` ejecuta TypeScript y las pruebas de negocio, biometría y voz. Las reglas se prueban en Firestore Emulator como indica [la guía](docs/FIREBASE.md). Los [resultados](docs/RESULTADOS.md) distinguen las pruebas automatizadas de las pendientes en dispositivos.

El retraso se calcula desde el timestamp del servidor y el horario conservado en cada asistencia. Se permite una entrada y una salida por empleado y día; la salida requiere entrada previa. Las apps no pueden editar ni borrar registros.

**Seguridad del prototipo:** la lectura de asistencias es pública en esta demo escolar. Usa solo nombres ficticios. Los perfiles y hashes no se pueden leer desde el cliente. El servicio local acepta conexiones de la red para esta demostración; úsalo solo en una red de confianza. Firestore no puede demostrar que un cliente modificado usó el sensor biométrico ni limitar intentos de clave sin otro servicio. No uses esta versión para asistencia real.
