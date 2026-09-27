# Resultados de validación

Verificado localmente el 26 de septiembre de 2026:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` | TypeScript de ambas apps y 16 pruebas aprobadas, incluido el corte visual persistente |
| Firestore Emulator | 9 pruebas aprobadas; se rechaza el borrado de asistencia y el acceso a las antiguas rutas de cámara/corte |
| Registro real del código móvil | Transacción de entrada y salida aceptada con `serverTimestamp()` |
| TV en tiempo real | `onSnapshot` recibió la entrada creada por el móvil |
| Reglas | Rechazan clave incorrecta, perfil inactivo, duplicados, salida sin entrada, campos alterados y todo borrado cliente de registros |
| Datos privados | `empleados` y `comprobaciones` no admiten lectura cliente |
| Publicación de reglas | Complemento Firebase publicó las reglas en `tvapp-951f9`; lectura posterior confirmó el bloqueo de borrado y de las antiguas rutas de cámara/corte |
| Expo Go | Los scripts de Mobile y TV usan `expo start --go`; Metro inició en 8091 y 8092, se exportaron ambos bundles Android y la TV web sin WebRTC |
| Creador de empleado | `node scripts/new-employee.mjs` generó ID y hash de un ejemplo ficticio |

Pendiente: probar en el Redmi 13C y la pantalla TV la foto automática, la biometría y la limpieza visual. Usa solo empleados ficticios; la lectura de asistencia es pública para esta demo escolar. Firestore no puede verificar que un cliente modificado haya usado el sensor biométrico.
