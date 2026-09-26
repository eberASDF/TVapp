# Resultados de validación

Verificado localmente el 25 de septiembre de 2026:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` | TypeScript de ambas apps y 14 pruebas aprobadas |
| Firestore Emulator | 6 pruebas aprobadas con reglas sin Authentication |
| Registro real del código móvil | Transacción de entrada y salida aceptada con `serverTimestamp()` |
| TV en tiempo real | `onSnapshot` recibió la entrada creada por el móvil |
| Reglas | Rechazan clave incorrecta, perfil inactivo, duplicados, salida sin entrada, campos alterados y edición de registros |
| Datos privados | `empleados` y `comprobaciones` no admiten lectura cliente |
| Publicación de reglas | `firebase deploy --only firestore:rules` compiló y publicó en `tvapp-951f9` |
| Paquetes Android | Expo exportó correctamente los bundles móvil y TV |
| Creador de empleado | `node scripts/new-employee.mjs` generó ID y hash de un ejemplo ficticio |

Pendiente: prueba física de la nueva identificación en el teléfono y prueba de la pantalla TV conectada al proyecto real. Usa solo empleados ficticios; la lectura de asistencia es pública por decisión de esta versión escolar. Firestore no puede verificar que un cliente modificado haya usado el sensor biométrico.
