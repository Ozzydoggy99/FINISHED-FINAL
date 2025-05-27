class RobotConfig {
    constructor(config) {
        this.serialNumber = config.serialNumber;
        this.secret = '667a51a4d948433081a272c78d10a8a4'; // Default secret for testing
        this.publicIp = '47.180.91.99'; // Default public IP
        this.localIp = '192.168.1.100'; // Default local IP
    }

    getBaseUrl() {
        return `http://${this.publicIp}:8090`;
    }

    getWebSocketUrl() {
        return `ws://${this.publicIp}:8090`;
    }

    getHeaders() {
        return {
            'APPCODE': this.secret,
            'Content-Type': 'application/json'
        };
    }
}

module.exports = RobotConfig; 