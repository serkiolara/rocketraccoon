# 🔗 GUÍA DE CONEXIÓN MULTIJUGADOR

## ❌ **PROBLEMA IDENTIFICADO**
El sistema P2P no está funcionando porque necesita configuración específica y los IDs de los peers deben conocerse mutuamente.

## ✅ **SOLUCIÓN TEMPORAL - PRUEBA LOCAL**

### **1. 🧪 Prueba Individual**
Abre: `http://localhost/rocketraccoon/client/test_minesweeper.html`
- ✅ Juego completamente funcional
- ✅ Chat local funciona
- ✅ Todas las mecánicas del buscaminas
- ✅ No requiere conexión P2P

### **2. 🔧 Configuración para Multijugador Real**

Para que funcione la conexión entre navegadores:

#### **Paso 1: Configurar usuarios únicos**
En cada navegador, abre la consola (F12) y ejecuta:
```javascript
// Navegador 1:
sessionStorage.setItem('user', JSON.stringify({username: 'Player1', id: 1}));

// Navegador 2:
sessionStorage.setItem('user', JSON.stringify({username: 'Player2', id: 2}));
```

#### **Paso 2: Usar el sistema de lobby**
1. **Navegador 1:**
   - Ir a: `http://localhost/rocketraccoon/client/lobby.html`
   - Crear cuenta como "Player1"
   - Crear nueva partida (obtienes código de 6 dígitos)

2. **Navegador 2:**
   - Ir a: `http://localhost/rocketraccoon/client/lobby.html` 
   - Crear cuenta como "Player2"
   - Unirse con el código del Player1

## 🔧 **SOLUCIÓN DEFINITIVA**

He identificado que el problema está en la configuración de PeerJS. Voy a crear una versión simplificada:

### **Servidor de Señalización Local**
Necesitamos un servidor intermedio para que los peers se encuentren.

### **Alternativa: Sistema Híbrido**
- Base de datos para crear salas ✅
- WebSockets simples para comunicación
- Menos dependiente de P2P

## 🎮 **INSTRUCCIONES INMEDIATAS**

### **Para probar AHORA mismo:**
1. **Abre:** `http://localhost/rocketraccoon/client/test_minesweeper.html`
2. **Haz clic:** "Nueva Partida"
3. **Juega:** Buscaminas completamente funcional
4. **Prueba chat:** Escribe mensajes (funciona localmente)

### **Para multijugador:**
1. **Verifica XAMPP:** Apache y MySQL activos
2. **Abre lobby:** `http://localhost/rocketraccoon/client/lobby.html`
3. **Crea usuario:** Sistema de registro funcionando
4. **Crea partida:** Genera código automáticamente

## 📋 **PRÓXIMOS PASOS**

1. ✅ **Juego individual funciona perfectamente**
2. 🔧 **Implementar WebSockets simples** (en lugar de P2P complejo)
3. 🔧 **Usar base de datos para sincronización** 
4. 🔧 **Sistema de polling cada 2 segundos** para updates

## 💡 **RECOMENDACIÓN**

**Para pruebas inmediatas:** Usa `test_minesweeper.html` - funciona al 100%

**Para desarrollo:** Implementemos un sistema más simple con WebSockets o polling de base de datos en lugar de P2P directo.

¿Quieres que implemente la versión con WebSockets simples?
