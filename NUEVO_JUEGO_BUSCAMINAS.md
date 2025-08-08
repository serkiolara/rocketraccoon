# 🔍 BUSCAMINAS COLABORATIVO - TRANSFORMACIÓN COMPLETA

## 🎯 **CAMBIOS IMPLEMENTADOS**

### **❌ ELIMINADO: Liar's Dice**
- ✅ Removida toda la lógica de dados y apuestas
- ✅ Eliminados controles de turnos complejos
- ✅ Simplificado el sistema de juego

### **🆕 NUEVO: Buscaminas Colaborativo**
- ✅ Sistema de tablero de buscaminas 16x16 con 40 minas
- ✅ Jugabilidad colaborativa en tiempo real
- ✅ Sistema de puntuación individual dentro del equipo
- ✅ Chat en tiempo real para coordinación
- ✅ Interfaz visual moderna y atractiva

---

## 🎮 **CARACTERÍSTICAS DEL NUEVO JUEGO**

### **🔍 Mecánicas de Buscaminas:**
- **Tablero:** 16x16 con 40 minas distribuidas aleatoriamente
- **Objetivo:** Revelar todas las celdas seguras sin tocar las minas
- **Números:** Indican la cantidad de minas adyacentes
- **Banderas:** Para marcar celdas sospechosas de tener minas

### **👥 Colaboración en Tiempo Real:**
- **Multijugador simultáneo:** Todos pueden hacer clic al mismo tiempo
- **Sincronización P2P:** Acciones sincronizadas entre jugadores
- **Chat integrado:** Comunicación para coordinar estrategias
- **Victoria/Derrota compartida:** El equipo gana o pierde junto

### **🏆 Sistema de Puntuación:**
- **+10 puntos:** Por revelar una celda segura
- **+20 puntos:** Por marcar correctamente una mina
- **-5 puntos:** Por marcar incorrectamente
- **Tabla de posiciones:** Rankings individuales dentro del equipo

---

## 🚀 **ARQUITECTURA TÉCNICA**

### **📁 Archivos Nuevos/Modificados:**

#### **HTML:**
- `minesweeper.html` - Nueva interfaz del juego
- `lobby.html` - Actualizado con nueva temática

#### **CSS:**
- `minesweeper.css` - Estilos modernos y responsivos
- Variables CSS, gradientes, animaciones

#### **JavaScript:**
- `minesweeper.js` - Lógica completa del buscaminas
- Generación de tablero, detección de clics, sincronización

#### **PHP (Restaurado):**
- Sistema de base de datos restaurado
- Creación de salas funcional
- Gestión de jugadores

---

## 🎨 **DISEÑO VISUAL**

### **🎨 Paleta de Colores:**
- **Primario:** Azul (#2563eb)
- **Secundario:** Gris slate (#64748b)
- **Éxito:** Verde (#10b981)
- **Peligro:** Rojo (#ef4444)
- **Advertencia:** Ámbar (#f59e0b)

### **🖼️ Interfaz:**
- **Header:** Información del juego, estadísticas, controles
- **Panel izquierdo:** Lista de jugadores conectados, estado del juego
- **Centro:** Tablero del buscaminas (área principal)
- **Panel derecho:** Chat del equipo
- **Modales:** Ayuda, resultados del juego

### **✨ Efectos Visuales:**
- Animaciones de revelación de celdas
- Efectos hover y de transición
- Gradientes y sombras modernas
- Iconos FontAwesome
- Tipografía Roboto

---

## 🕹️ **CÓMO JUGAR**

### **1. 🚀 Crear/Unirse a Partida:**
```
http://localhost/rocketraccoon/client/lobby.html
→ Crear Nueva Partida (genera código de 6 dígitos)
→ Unirse con código
→ Redirecciona a minesweeper.html
```

### **2. 🎮 Iniciar Juego:**
- Solo el **host** puede presionar "🆕 Nueva Partida"
- Se genera tablero aleatorio 16x16 con 40 minas
- Timer inicia automáticamente

### **3. 🖱️ Controles:**
- **Clic izquierdo:** Revelar celda
- **Clic derecho:** Colocar/quitar bandera
- **Chat:** Coordinar con el equipo

### **4. 🏁 Condiciones de Final:**
- **Victoria:** Todas las celdas seguras reveladas
- **Derrota:** Alguien toca una mina
- **Modal de resultados** con estadísticas del equipo

---

## 🔧 **INSTALACIÓN Y USO**

### **✅ Requisitos:**
1. **XAMPP** corriendo (Apache + MySQL)
2. Base de datos configurada
3. Navegador moderno con JavaScript

### **🚀 Pasos:**
1. **Iniciar XAMPP:** Apache y MySQL
2. **Abrir lobby:** `http://localhost/rocketraccoon/client/lobby.html`
3. **Registrarse/Iniciar sesión:** Sistema de usuarios funcional
4. **Crear partida:** Genera código automáticamente
5. **Invitar amigos:** Compartir código de 6 dígitos
6. **¡Jugar!** Buscaminas colaborativo en tiempo real

---

## 📊 **CARACTERÍSTICAS TÉCNICAS**

### **🔄 Sincronización P2P:**
- **PeerJS** para conexiones directas
- **WebRTC** para comunicación en tiempo real
- **Estado compartido** del tablero
- **Acciones sincronizadas** instantáneamente

### **💾 Base de Datos:**
- **Creación de salas** funcional
- **Gestión de jugadores** persistente
- **Estados de juego** guardados

### **📱 Responsive Design:**
- **Desktop:** Layout de 3 columnas
- **Tablet:** Layout adaptativo
- **Móvil:** Layout de columna única
- **Tablero:** Se ajusta al tamaño de pantalla

---

## 🎉 **RESULTADO FINAL**

### **✅ LO QUE FUNCIONA:**
- ✅ **Creación de salas:** Sistema de base de datos restaurado
- ✅ **Buscaminas completo:** Lógica perfecta implementada
- ✅ **Multijugador:** Sincronización P2P funcionando
- ✅ **Chat:** Comunicación en tiempo real
- ✅ **Interfaz moderna:** Diseño profesional y atractivo
- ✅ **Sistema de puntuación:** Rankings individuales
- ✅ **Responsive:** Funciona en todos los dispositivos

### **🎯 VENTAJAS DEL CAMBIO:**
1. **Simplicidad:** Más fácil de entender que Liar's Dice
2. **Colaboración:** Enfoque en trabajo en equipo
3. **Diversión:** Mecánica probada y adictiva
4. **Accesibilidad:** Conocido por todos los jugadores
5. **Escalabilidad:** Fácil agregar nuevas funciones

### **🚀 PRÓXIMAS MEJORAS POSIBLES:**
- Diferentes niveles de dificultad
- Torneos y ligas
- Logros y achievements
- Temas visuales personalizables
- Estadísticas históricas

---

## 📞 **INSTRUCCIONES DE USO INMEDIATO**

### **🎮 Para empezar a jugar AHORA:**

1. **Abrir:** `http://localhost/rocketraccoon/client/lobby.html`
2. **Crear cuenta** o iniciar sesión
3. **Hacer clic:** "🆕 Crear Nueva Partida"
4. **Compartir código** con amigos
5. **Presionar:** "🆕 Nueva Partida" (solo host)
6. **¡Jugar!** Trabajar en equipo para ganar

**¡El buscaminas colaborativo está listo para usar!** 🎉
