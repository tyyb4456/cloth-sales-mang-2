// whatsapp-server/server.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

let isReady = false;

// QR Code for authentication
client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Client ready
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isReady = true;
});

// Client disconnected
client.on('disconnected', () => {
    console.log('WhatsApp client disconnected');
    isReady = false;
});

// Initialize client
client.initialize();

// API endpoint to send messages
app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!isReady) {
            return res.status(503).json({ 
                success: false, 
                error: 'WhatsApp client not ready' 
            });
        }
        
        if (!phone || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and message are required' 
            });
        }
        
        // Format phone number (remove + and add @c.us)
        const chatId = phone.replace('+', '') + '@c.us';
        
        await client.sendMessage(chatId, message);
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        ready: isReady,
        uptime: process.uptime()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WhatsApp server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});