# 🎲 Liar's Dice - Proyecto Completo 

## 📋 Resumen del Proyecto

**Liar's Dice** es un juego multijugador en tiempo real implementado con tecnologías web modernas. Los jugadores compiten apostando sobre la cantidad de dados con valores específicos que hay en la mesa, sin poder ver los dados de los demás.

## 🚀 Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos responsivos y animaciones
- **JavaScript ES6+** - Lógica del juego
- **PeerJS** - Comunicación P2P en tiempo real
- **Web Audio API** - Efectos de sonido

### Backend
- **PHP** - Lógica del servidor
- **MySQL** - Base de datos
- **PDO** - Acceso seguro a datos

### Infraestructura
- **XAMPP** - Entorno de desarrollo local
- **Git** - Control de versiones

## 🎮 Características del Juego

### Funcionalidades Core
- ✅ **Autenticación**: Registro e inicio de sesión
- ✅ **Lobby**: Crear y unirse a partidas
- ✅ **Juego en Tiempo Real**: Comunicación P2P
- ✅ **Chat Integrado**: Mensajes entre jugadores
- ✅ **Lógica Completa**: Turnos, apuestas, desafíos

### Características Avanzadas
- ✅ **Animaciones**: Efectos visuales suaves
- ✅ **Efectos de Sonido**: Audio contextual
- ✅ **Acción "Pasar"**: Estrategia opcional
- ✅ **Pantalla de Resultados**: Modal informativo
- ✅ **Manejo de Desconexiones**: Robustez del sistema
- ✅ **Persistencia**: Estado guardado en servidor

## 📁 Estructura del Proyecto

```
rocketraccoon/
├── client/                 # Frontend
│   ├── index.html         # Página de login
│   ├── lobby.html         # Lobby de partidas
│   ├── game.html          # Interfaz del juego
│   ├── css/
│   │   ├── auth.css       # Estilos de autenticación
│   │   ├── lobby.css      # Estilos del lobby
│   │   └── game.css       # Estilos del juego
│   └── js/
│       ├── auth.js        # Lógica de autenticación
│       ├── lobby.js       # Lógica del lobby
│       ├── game.js        # Lógica principal del juego
│       └── webrtc.js      # Comunicación P2P
├── server/                # Backend
│   ├── auth.php          # API de autenticación
│   ├── lobby.php         # API del lobby
│   ├── game.php          # API del juego
│   └── database.php      # Configuración de BD
├── database/             # Scripts SQL
│   ├── schema.sql        # Estructura inicial
│   └── update_games_table.sql # Actualizaciones
├── README.md             # Documentación principal
└── TESTING_GUIDE.md      # Guía de pruebas
```

## 🎯 Reglas del Juego

### Objetivo
Ser el último jugador con dados en la mesa.

### Mecánicas
1. **Inicio**: Cada jugador recibe 5 dados
2. **Turnos**: Los jugadores apuestan en orden
3. **Apuestas**: Deben ser crecientes (mayor cantidad o valor)
4. **Dados Comodín**: Los 1s cuentan como cualquier valor
5. **Desafío**: Gritar "¡Mentiroso!" si dudas de la apuesta
6. **Resolución**: Se cuentan los dados reales
7. **Penalización**: El perdedor pierde un dado
8. **Eliminación**: Sin dados = fuera del juego
9. **Victoria**: Último jugador restante gana

### Opciones de Turno
- **Apostar**: Incrementar la apuesta actual
- **Pasar**: Ceder turno (solo si hay apuesta previa)
- **Desafiar**: Llamar "¡Mentiroso!" (solo si NO es tu turno)

## 🔧 Instalación y Configuración

### Prerrequisitos
- XAMPP (Apache + MySQL + PHP)
- Navegador moderno (Chrome, Firefox, Safari)
- Git (opcional)

### Pasos
1. **Clonar proyecto** (o descargar ZIP)
2. **Mover a htdocs**: `C:\xampp\htdocs\rocketraccoon\`
3. **Iniciar XAMPP**: Apache y MySQL
4. **Crear base de datos**: Ejecutar `database/schema.sql`
5. **Actualizar tabla**: Ejecutar `database/update_games_table.sql`
6. **Abrir en navegador**: `http://localhost/rocketraccoon/client/`

## 🧪 Pruebas

### Flujo de Prueba Básico
1. **Registro**: Crear dos usuarios diferentes
2. **Lobby**: Usuario 1 crea partida, Usuario 2 se une
3. **Juego**: Realizar apuestas, pasar turnos, desafiar
4. **Finalización**: Verificar eliminación y victoria

### Casos de Prueba Avanzados
- Desconexiones durante el juego
- Múltiples rondas consecutivas
- Validaciones de apuestas inválidas
- Comportamiento en diferentes navegadores

## 🎨 Diseño y UX

### Paleta de Colores
- **Primario**: Gradiente azul-rojo-dorado
- **Secundario**: Dorado (#FFD700)
- **Acentos**: Verde (#4CAF50), Rojo (#f44336)
- **Fondo**: Negro semi-transparente

### Tipografía
- **Principal**: Segoe UI
- **Tamaños**: Responsivos (1em - 2.8rem)

### Animaciones
- **Dados**: Escala suave y rotación
- **Transiciones**: Cubic-bezier para suavidad
- **Hover**: Efectos sutiles en botones

## 🔊 Audio

### Efectos de Sonido
- **Apostar**: Do alto (523.25 Hz)
- **Pasar turno**: Mi (659.25 Hz)
- **Desafiar**: Fa (349.23 Hz, duración extendida)

### Implementación
- Web Audio API nativa
- Osciladores triangulares
- Control de volumen automático

## 🌐 Comunicación P2P

### Tecnología
- **PeerJS**: Simplifica WebRTC
- **Servidor**: 0.peerjs.com (gratuito)
- **Protocolo**: Intercambio directo de datos

### Tipos de Mensajes
- `chat`: Mensajes de chat
- `state`: Estado completo del juego
- `bet`: Apuestas individuales
- `hello`: Saludo inicial
- `player-left`: Notificación de desconexión

## 📊 Base de Datos

### Tabla `users`
```sql
id INT PRIMARY KEY AUTO_INCREMENT
username VARCHAR(50) UNIQUE
password VARCHAR(255)
peer_id VARCHAR(100)
created_at TIMESTAMP
```

### Tabla `games`
```sql
id VARCHAR(6) PRIMARY KEY
host_id INT
players JSON
status ENUM('waiting', 'playing', 'finished')
game_state TEXT
created_at TIMESTAMP
```

## 🚀 Deployment

### Producción
Para desplegar en producción:
1. **Servidor Web**: Apache/Nginx + PHP
2. **Base de Datos**: MySQL/MariaDB
3. **SSL**: Certificado para HTTPS (requerido por WebRTC)
4. **Dominio**: Configurar DNS apropiadamente

### Consideraciones
- **HTTPS**: Obligatorio para WebRTC en producción
- **STUN/TURN**: Servidores para NAT traversal
- **Escalabilidad**: Considerar servidor PeerJS propio

## 🐛 Debugging

### Problemas Comunes
- **"Acción no válida"**: Verificar estructura PHP
- **Conexión P2P fallida**: Revisar firewall/NAT
- **Estados desincronizados**: Verificar broadcastGameState()
- **Sonidos no funcionan**: Requiere interacción del usuario

### Herramientas
- **Console.log**: Debug de JavaScript
- **Network Tab**: Monitorear peticiones AJAX
- **phpMyAdmin**: Inspeccionar base de datos

## 📈 Futuras Mejoras

### Funcionalidades Adicionales
- 🔄 **Reconexión Automática**: Reanudar partidas
- 👥 **Espectadores**: Modo observador
- 📱 **PWA**: Aplicación web progresiva
- 🏆 **Rankings**: Sistema de puntuación
- 🎪 **Torneos**: Partidas eliminatorias
- 🎨 **Temas**: Personalizaciones visuales

### Optimizaciones Técnicas
- 🚀 **Caching**: Mejorar rendimiento
- 🔒 **Seguridad**: Validaciones adicionales
- 📊 **Analytics**: Métricas de uso
- ⚡ **Performance**: Optimizar JavaScript

## 👥 Créditos

**Desarrollador Principal**: [Tu Nombre]
**Tecnologías**: HTML5, CSS3, JavaScript, PHP, MySQL, PeerJS
**Inspiración**: Juego tradicional de dados "Liar's Dice"

---

## 🎉 ¡Proyecto Completado!

Tu juego **Liar's Dice** está ahora completamente funcional con todas las características modernas de un juego web multijugador. ¡Disfruta jugando con amigos! 🎲✨
