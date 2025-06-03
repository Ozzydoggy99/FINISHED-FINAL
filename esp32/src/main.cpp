#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// WiFi credentials - these should be updated with your network details
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// WebSocket server port
const int webSocketPort = 81;

// Relay pin definitions - adjust based on your wiring
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

// Status LED pin
const int STATUS_LED_PIN = 2;  // Built-in LED on most ESP32 boards

// WebSocket server instance
WebSocketsServer webSocket = WebSocketsServer(webSocketPort);

// JSON document for messages
StaticJsonDocument<200> doc;

// Function declarations
void handleWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
void sendRelayStates();
void setupPins();
void setupWiFi();
void blinkLED(int times);

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    Serial.println("\nElevator Control System Starting...");

    // Setup pins
    setupPins();

    // Setup WiFi
    setupWiFi();
    
    // Start WebSocket server
    webSocket.begin();
    webSocket.onEvent(handleWebSocketEvent);
    Serial.println("WebSocket server started on port " + String(webSocketPort));
}

void loop() {
    webSocket.loop();
}

void setupPins() {
    // Setup status LED
    pinMode(STATUS_LED_PIN, OUTPUT);
    digitalWrite(STATUS_LED_PIN, LOW);

    // Setup relay pins
    for (int i = 0; i < NUM_RELAYS; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH); // Relays are typically active LOW
    }
    Serial.println("Pins initialized");
}

void setupWiFi() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected");
        Serial.println("IP address: " + WiFi.localIP().toString());
        blinkLED(3); // Success indication
    } else {
        Serial.println("\nWiFi connection failed!");
        blinkLED(10); // Error indication
    }
}

void handleWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[%u] Disconnected!\n", num);
            break;
            
        case WStype_CONNECTED:
            {
                IPAddress ip = webSocket.remoteIP(num);
                Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
                blinkLED(2); // Connection indication
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
                        blinkLED(1); // Action indication
                        
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

void blinkLED(int times) {
    for (int i = 0; i < times; i++) {
        digitalWrite(STATUS_LED_PIN, HIGH);
        delay(100);
        digitalWrite(STATUS_LED_PIN, LOW);
        delay(100);
    }
} 