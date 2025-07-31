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
- Los botones se habilitan/deshabilitan correctamente

#### Desafío:
- El jugador que NO tiene el turno puede presionar "¡Mentiroso!"
- Se revelan todos los dados
- Se determina quién pierde un dado
- Se inicia una nueva ronda

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

### 5. Posibles Problemas y Soluciones

**Problema**: Error "Acción no válida"
- **Solución**: Verifica que `lobby.php` esté actualizado correctamente

**Problema**: Los dados no se muestran
- **Solución**: Verifica que la función `displayMyDice()` se esté llamando

**Problema**: Los jugadores no se sincronizan
- **Solución**: Verifica la conexión P2P y que `broadcastGameState()` funcione

**Problema**: Error en la base de datos
- **Solución**: Ejecuta el script SQL para agregar la columna `game_state`

### 6. Características del Juego

- **Dados Comodín**: Los dados con valor 1 cuentan como cualquier valor
- **Turnos**: Los jugadores apuestan en orden
- **Apuestas Crecientes**: Cada apuesta debe ser mayor que la anterior
- **Desafíos**: Solo se puede desafiar cuando NO es tu turno
- **Eliminación**: Perder todos los dados elimina al jugador
- **Victoria**: El último jugador restante gana
