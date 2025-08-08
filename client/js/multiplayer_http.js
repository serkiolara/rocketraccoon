// Sistema de comunicación multiplayer usando polling HTTP
class MultiplayerClient {
    constructor(roomId, username) {
        this.roomId = roomId;
        this.username = username;
        this.lastMessageId = 0;
        this.lastActionId = 0;
        this.pollInterval = 1000; // 1 segundo
        this.presenceInterval = 5000; // 5 segundos
        this.isPolling = false;
        this.baseUrl = '/rocketraccoon/server/multiplayer.php';
        
        this.onMessage = null;
        this.onGameAction = null;
        this.onUsersUpdate = null;
        this.onConnectionStatus = null;
        
        console.log('🚀 MultiplayerClient inicializado');
        console.log(`Sala: ${roomId}, Usuario: ${username}`);
    }
    
    // Conectar a la sala
    async connect() {
        try {
            console.log('🔄 Conectando a la sala...');
            
            const response = await this.makeRequest('POST', {
                action: 'join_room',
                room_id: this.roomId,
                username: this.username
            });
            
            if (response.success) {
                console.log('✅ Conectado exitosamente a la sala');
                this.startPolling();
                this.startPresenceUpdates();
                
                if (this.onConnectionStatus) {
                    this.onConnectionStatus('connected');
                }
                
                return true;
            } else {
                console.error('❌ Error al conectar:', response.error);
                if (this.onConnectionStatus) {
                    this.onConnectionStatus('error', response.error);
                }
                return false;
            }
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            if (this.onConnectionStatus) {
                this.onConnectionStatus('error', error.message);
            }
            return false;
        }
    }
    
    // Iniciar polling para mensajes y acciones
    startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        console.log('🔄 Iniciando polling...');
        
        this.pollMessages();
        this.pollActions();
        this.pollUsers();
    }
    
    // Polling para mensajes de chat
    async pollMessages() {
        if (!this.isPolling) return;
        
        try {
            const response = await this.makeRequest('GET', {
                action: 'get_messages',
                room_id: this.roomId,
                last_id: this.lastMessageId
            });
            
            if (response.messages && response.messages.length > 0) {
                response.messages.forEach(message => {
                    if (this.onMessage) {
                        this.onMessage(message.username, message.message, message.timestamp);
                    }
                    this.lastMessageId = Math.max(this.lastMessageId, message.id);
                });
            }
        } catch (error) {
            console.error('Error al obtener mensajes:', error);
        }
        
        setTimeout(() => this.pollMessages(), this.pollInterval);
    }
    
    // Polling para acciones de juego
    async pollActions() {
        if (!this.isPolling) return;
        
        try {
            const response = await this.makeRequest('GET', {
                action: 'get_actions',
                room_id: this.roomId,
                last_id: this.lastActionId
            });
            
            if (response.actions && response.actions.length > 0) {
                response.actions.forEach(action => {
                    // Ignorar nuestras propias acciones
                    if (action.username !== this.username && this.onGameAction) {
                        this.onGameAction(action.username, action.action_type, JSON.parse(action.action_data));
                    }
                    this.lastActionId = Math.max(this.lastActionId, action.id);
                });
            }
        } catch (error) {
            console.error('Error al obtener acciones:', error);
        }
        
        setTimeout(() => this.pollActions(), this.pollInterval);
    }
    
    // Polling para lista de usuarios
    async pollUsers() {
        if (!this.isPolling) return;
        
        try {
            const response = await this.makeRequest('GET', {
                action: 'get_users',
                room_id: this.roomId
            });
            
            if (response.users && this.onUsersUpdate) {
                this.onUsersUpdate(response.users);
            }
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
        }
        
        setTimeout(() => this.pollUsers(), 3000); // Cada 3 segundos
    }
    
    // Actualizar presencia periódicamente
    startPresenceUpdates() {
        const updatePresence = async () => {
            try {
                await this.makeRequest('POST', {
                    action: 'update_presence',
                    room_id: this.roomId,
                    username: this.username
                });
            } catch (error) {
                console.error('Error al actualizar presencia:', error);
            }
            
            if (this.isPolling) {
                setTimeout(updatePresence, this.presenceInterval);
            }
        };
        
        updatePresence();
    }
    
    // Enviar mensaje de chat
    async sendMessage(message) {
        try {
            console.log('📤 Enviando mensaje:', message);
            
            const response = await this.makeRequest('POST', {
                action: 'send_message',
                room_id: this.roomId,
                username: this.username,
                message: message
            });
            
            if (response.success) {
                console.log('✅ Mensaje enviado');
                return true;
            } else {
                console.error('❌ Error al enviar mensaje:', response.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error al enviar mensaje:', error);
            return false;
        }
    }
    
    // Enviar acción de juego
    async sendGameAction(actionType, actionData) {
        try {
            console.log('🎮 Enviando acción de juego:', actionType, actionData);
            
            const response = await this.makeRequest('POST', {
                action: 'send_action',
                room_id: this.roomId,
                username: this.username,
                action_type: actionType,
                action_data: JSON.stringify(actionData)
            });
            
            if (response.success) {
                console.log('✅ Acción enviada');
                return true;
            } else {
                console.error('❌ Error al enviar acción:', response.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error al enviar acción:', error);
            return false;
        }
    }
    
    // Realizar petición HTTP
    async makeRequest(method, data) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        
        let url = this.baseUrl;
        
        if (method === 'POST') {
            options.body = new URLSearchParams(data).toString();
        } else {
            url += '?' + new URLSearchParams(data).toString();
        }
        
        const response = await fetch(url, options);
        return await response.json();
    }
    
    // Desconectar
    disconnect() {
        console.log('🔌 Desconectando...');
        this.isPolling = false;
        
        if (this.onConnectionStatus) {
            this.onConnectionStatus('disconnected');
        }
    }
}

// Exportar para uso global
window.MultiplayerClient = MultiplayerClient;
