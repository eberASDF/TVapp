# Validación

`npm.cmd run check` comprueba TypeScript en móvil y TV, clasificación de retardos, secuencia de entrada/salida, rechazo de biometría fallida o cancelada y comportamiento de voz. La suite de Firestore Emulator descrita en [FIREBASE.md](FIREBASE.md) comprueba las reglas y la actualización de la TV por `onSnapshot`.

Para probar en dispositivos:

1. Crea un empleado ficticio en Firestore con `node scripts/new-employee.mjs` y abre móvil y TV contra el mismo proyecto.
2. En el móvil, pulsa **Registrar entrada** y cancela la huella: no debe abrirse el menú ni aparecer un registro.
3. Confirma la huella, escribe un nombre o clave incorrectos: no debe abrirse la cámara ni aparecer registro. Repite con datos correctos: se abre la cámara frontal, se toma la foto y se registra la entrada con miniatura en Firestore.
4. Intenta repetir la entrada. Después registra la salida; verifica que antes de una entrada, la salida se rechaza.
5. Desconecta la red y comprueba que no se confirma un registro. Reconecta y verifica que la TV se actualiza.
6. Desactiva el empleado en Firestore y confirma que ya no puede registrar.
7. Inicia `npm.cmd run local:server` en la PC. Configura la IP LAN impresa en `apps/mobile/.env`; la TV emulada usa `10.0.2.2`. Pulsa **Limpiar historial**: la TV queda sin registros visibles, pero `asistencias` y las fotos de **Capturas** permanecen. Un registro posterior aparece en la TV. Reinicia la TV y verifica que el corte visual persiste.
8. Abre Mobile en Expo Go, registra una entrada o salida y comprueba que la foto capturada queda en **Capturas**. La zona de Avisos de la TV debe mostrarla con nombre, tipo y hora durante tres segundos, después volver al historial. Firestore debe contener solo `fotoMiniatura`, no la foto capturada.

La prueba automatizada del sensor no sustituye una prueba física en el teléfono. Mobile y TV arrancan en modo Expo Go; la foto y la voz local requieren prueba en los dispositivos.
