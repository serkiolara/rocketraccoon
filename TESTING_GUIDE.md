# Guía de Pruebas - Liar's Dice Completo

## Pasos para Probar el Juego Completo

### 1. Configuración Inicial
- Ejecuta el script SQL en phpMyAdmin: `database/update_games_table.sql`
- Asegúrate de que XAMPP esté ejecutándose (Apache y MySQL)

### 2. Prueba con Dos Jugadores

#### Jugador 1 (Host):
1. Abre el navegador en `http://localhost/rocketraccoon/client/index.html`
2. Regístrate o inicia sesión como "Jugador1"
3. Ve al lobby (`lobby.html`)
4. Crea una nueva partida
5. Anota el código de la partida

#### Jugador 2:
1. Abre otra ventana/navegador en `http://localhost/rocketraccoon/client/index.html`
2. Regístrate o inicia sesión como "Jugador2"
3. Ve al lobby
4. Únete a la partida usando el código

### 3. Flujo del Juego a Probar

#### Inicio del Juego:
- Verifica que ambos jugadores aparecen en la lista
- Verifica que cada jugador ve sus 5 dados
- Verifica que se indica quién tiene el turno

#### Apuestas:
- El jugador con el turno puede apostar
- Las apuestas deben ser crecientes (mayor cantidad o mayor valor)
- Los jugadores pueden pasar su turno (solo si ya hay una apuesta)
- Los botones se habilitan/deshabilitan correctamente
- Se reproducen sonidos al realizar acciones

#### Desafío:
- El jugador que NO tiene el turno puede presionar "¡Mentiroso!"
- Se muestra una pantalla modal con los resultados detallados
- Se revelan todos los dados
- Se determina quién pierde un dado
- Se inicia una nueva ronda con animaciones

#### Fin del Juego:
- Cuando un jugador pierde todos sus dados, es eliminado
- El último jugador restante gana

### 4. Funcionalidades a Verificar

✅ Conexión P2P entre jugadores
✅ Sincronización del estado del juego
✅ Chat en tiempo real
✅ Turnos alternados
✅ Validación de apuestas
✅ Lógica de desafío
✅ Eliminación de jugadores
✅ Declaración de ganador
✅ Acción "Pasar" turno
✅ Animaciones de dados
✅ Efectos de sonido
✅ Pantalla modal de resultados
✅ Manejo de desconexiones
✅ Persistencia del estado en servidor

### 5. Posibles Problemas y Soluciones

**Problema**: Error "Acción no válida"
- **Solución**: Verifica que `lobby.php` esté actualizado correctamente

**Problema**: Los dados no se muestran
- **Solución**: Verifica que la función `displayMyDice()` se esté llamando

**Problema**: No se reproducen sonidos
- **Solución**: Verifica que el navegador permita Web Audio API (requiere interacción del usuario)

**Problema**: Los jugadores no se sincronizan
- **Solución**: Verifica la conexión P2P y que `broadcastGameState()` funcione

**Problema**: Error en la base de datos
- **Solución**: Ejecuta el script SQL para agregar la columna `game_state`

**Problema**: Los botones no se habilitan/deshabilitan correctamente
- **Solución**: Verifica que `updateGameUI()` se llame después de cada cambio de estado

### 6. Características del Juego

- **Dados Comodín**: Los dados con valor 1 cuentan como cualquier valor
- **Turnos**: Los jugadores apuestan en orden
- **Apuestas Crecientes**: Cada apuesta debe ser mayor que la anterior
- **Pasar Turno**: Los jugadores pueden pasar si ya hay una apuesta previa
- **Desafíos**: Solo se puede desafiar cuando NO es tu turno
- **Eliminación**: Perder todos los dados elimina al jugador
- **Victoria**: El último jugador restante gana
- **Animaciones**: Dados con efectos visuales suaves
- **Sonidos**: Efectos de audio para cada acción
- **Resultados**: Modal detallado después de cada desafío
- **Desconexiones**: Manejo automático de jugadores que abandonan

### 7. Nuevas Funcionalidades del Paso 8

#### 🎮 Acción "Pasar"
- Botón naranja "Pasar" disponible cuando es tu turno
- Solo se puede pasar si ya hay una apuesta previa
- Útil para estrategias conservadoras

#### 🎬 Animaciones
- Dados aparecen con efecto de escala suave
- Transiciones fluidas al perder dados
- Destacado visual del jugador actual

#### 🔊 Efectos de Sonido
- Sonido distintivo para cada acción (apostar, pasar, desafiar)
- Generados con Web Audio API
- Se activan automáticamente durante el juego

#### 📋 Pantalla de Resultados
- Modal detallado después de cada desafío
- Muestra dados encontrados vs apostados
- Identifica claramente ganador y perdedor

#### 🔌 Manejo de Desconexiones
- Detecta cuando jugadores abandonan la partida
- Actualiza automáticamente la lista de jugadores
- Continúa el juego con los jugadores restantes
