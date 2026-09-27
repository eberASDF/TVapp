# Resultados de validación

Verificado localmente el 26 de septiembre de 2026:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` | TypeScript de ambas apps y 16 pruebas aprobadas, incluido el corte visual persistente |
| Firestore Emulator | 10 pruebas aprobadas; incluye validación previa de nombre/clave y límite de miniatura JPEG |
| Registro real del código móvil | Transacción de entrada y salida aceptada con miniatura y `serverTimestamp()` |
| TV en tiempo real | `onSnapshot` recibió la entrada y miniatura creadas por el móvil |
| Reglas | Rechazan clave incorrecta, perfil inactivo, miniatura ausente o grande, duplicados, salida sin entrada, campos alterados y todo borrado cliente de registros |
| Datos privados | `empleados` y `comprobaciones` no admiten lectura cliente |
| Publicación de reglas | Complemento Firebase publicó reglas e índice de miniaturas en `tvapp-951f9`; lectura posterior confirmó el campo y la validación previa |
| Expo Go | Los scripts de Mobile y TV usan `expo start --go`; se exportaron ambos bundles Android sin WebRTC y `expo install --check` aprobó SDK 57 |
| Creador de empleado | `node scripts/new-employee.mjs` generó ID y hash de un ejemplo ficticio |

Pendiente: probar en el Redmi 13C y la pantalla TV la foto automática, su visualización de tres segundos, la biometría y la limpieza visual. Usa solo empleados y fotos de prueba con permiso; la lectura de asistencia y miniaturas es pública para esta demo escolar. Firestore no puede verificar que un cliente modificado haya usado el sensor biométrico.
