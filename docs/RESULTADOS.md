# Resultados de validación

Verificado localmente el 26 de septiembre de 2026:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` | TypeScript de ambas apps y 15 pruebas aprobadas |
| Firestore Emulator | 8 pruebas aprobadas; borrado emparejado y TV vacía tras limpiar historial |
| Registro real del código móvil | Transacción de entrada y salida aceptada con `serverTimestamp()` |
| TV en tiempo real | `onSnapshot` recibió la entrada creada por el móvil |
| Reglas | Rechazan clave incorrecta, perfil inactivo, duplicados, salida sin entrada, campos alterados, edición y borrado aislado de registros |
| Datos privados | `empleados` y `comprobaciones` no admiten lectura cliente |
| Publicación de reglas | Complemento Firebase publicó las reglas e índices en `tvapp-951f9`; lectura posterior confirmó el borrado emparejado |
| Paquetes Android | Expo exportó correctamente los bundles móvil y TV con la interfaz nueva |
| Creador de empleado | `node scripts/new-employee.mjs` generó ID y hash de un ejemplo ficticio |

Pendiente: probar en un teléfono la foto automática y la pantalla TV conectada al proyecto real. Usa solo empleados ficticios; la lectura y el borrado emparejado de asistencia son públicos por decisión de esta versión escolar. Firestore no puede verificar que un cliente modificado haya usado el sensor biométrico. La cámara en vivo teléfono→TV queda pendiente por la limitación de Expo Go.
