#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Skytech Automated Solutions";
const char* password = "Skytech123wtf!";

// WebSocket server port
const int webSocketPort = 81;

// Relay pins (adjust according to your wiring)
const int RELAY_PINS[] = {
    16,  // GPIO16 - Relay 1: Door Open
    17,  // GPIO17 - Relay 2: Door Close
    18,  // GPIO18 - Relay 3: Floor 1 Selection
    19,  // GPIO19 - Relay 4: Floor 2 Selection
    21,  // GPIO21 - Relay 5: Floor 3 Selection
    22   // GPIO22 - Relay 6: Floor 4 Selection
};
const int NUM_RELAYS = 6;

// Relay names for JSON communication
const char* RELAY_NAMES[] = {
    "doorOpen",
    "doorClose",
    "floor1",
    "floor2",
    "floor3",
    "floor4"
};

// WebSocket server
WebSocketsServer webSocket = WebSocketsServer(webSocketPort);

// JSON document for messages
StaticJsonDocument<200> doc;

void setup() {
    Serial.begin(115200);
    
    // Initialize relay pins
    for (int i = 0; i < NUM_RELAYS; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH); // Relays are typically active LOW
    }
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("Local IP address: ");
    Serial.println(WiFi.localIP());
    
    // Start WebSocket server
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.println("WebSocket server started");
}

void loop() {
    webSocket.loop();
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[%u] Disconnected!\n", num);
            break;
            
        case WStype_CONNECTED:
            {
                IPAddress ip = webSocket.remoteIP(num);
                Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
                
                // Send current relay states
                sendRelayStates();
            }
            break;
            
        case WStype_TEXT:
            {
                // Parse JSON message
                DeserializationError error = deserializeJson(doc, payload);
                
                if (error) {
                    Serial.print("deserializeJson() failed: ");
                    Serial.println(error.c_str());
                    return;
                }
                
                // Handle message
                const char* type = doc["type"];
                if (strcmp(type, "set_relay") == 0) {
                    const char* relay = doc["relay"];
                    bool state = doc["state"];
                    
                    // Find relay index
                    int relayIndex = -1;
                    for (int i = 0; i < NUM_RELAYS; i++) {
                        if (strcmp(relay, RELAY_NAMES[i]) == 0) {
                            relayIndex = i;
                            break;
                        }
                    }
                    
                    if (relayIndex >= 0) {
                        // Set relay state (inverted because relays are active LOW)
                        digitalWrite(RELAY_PINS[relayIndex], !state);
                        
                        // Send updated states
                        sendRelayStates();
                    }
                }
            }
            break;
    }
}

void sendRelayStates() {
    StaticJsonDocument<512> stateDoc;
    stateDoc["type"] = "relay_state";
    JsonObject states = stateDoc.createNestedObject("states");
    
    // Add all relay states
    for (int i = 0; i < NUM_RELAYS; i++) {
        // Invert because relays are active LOW
        states[RELAY_NAMES[i]] = !digitalRead(RELAY_PINS[i]);
    }
    
    // Serialize and send
    String message;
    serializeJson(stateDoc, message);
    webSocket.broadcastTXT(message);
} 