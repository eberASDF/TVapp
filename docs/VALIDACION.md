# Validación

`npm.cmd run check` comprueba TypeScript en móvil y TV, clasificación de retardos, secuencia de entrada/salida, rechazo de biometría fallida o cancelada y comportamiento de voz. La suite de Firestore Emulator descrita en [FIREBASE.md](FIREBASE.md) comprueba las reglas y la actualización de la TV por `onSnapshot`.

Para probar en dispositivos:

1. Crea un empleado ficticio en Firestore con `node scripts/new-employee.mjs` y abre móvil y TV contra el mismo proyecto.
2. En el móvil, pulsa **Registrar entrada** y cancela la huella: no debe abrirse el menú ni aparecer un registro.
3. Confirma la huella, escribe un nombre o clave incorrectos: no debe aparecer registro. Repite con datos correctos: debe verse la entrada en el móvil, Firestore y la TV.
4. Intenta repetir la entrada. Después registra la salida; verifica que antes de una entrada, la salida se rechaza.
5. Desconecta la red y comprueba que no se confirma un registro. Reconecta y verifica que la TV se actualiza.
6. Desactiva el empleado en Firestore y confirma que ya no puede registrar.

La prueba automatizada del sensor no sustituye una prueba física en el teléfono. La vista TV en Expo Go sirve para la interfaz; una instalación Android TV nativa y la voz local requieren prueba aparte.
