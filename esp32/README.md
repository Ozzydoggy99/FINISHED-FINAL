# ESP32 Elevator Controller

This project implements an ESP32-based elevator control system using a 6-channel relay module.

## Hardware Requirements

1. ESP32 Development Board
2. 6-Channel Relay Module
3. Power Supply (5V for relays, 3.3V for ESP32)
4. Jumper Wires
5. USB Cable for programming

## Pin Connections

Connect the ESP32 to the 6-channel relay module as follows:

```
ESP32 Pin -> Relay Channel -> Function
GPIO16   -> Relay 1      -> Door Open
GPIO17   -> Relay 2      -> Door Close
GPIO18   -> Relay 3      -> Floor 1 Selection
GPIO19   -> Relay 4      -> Floor 2 Selection
GPIO21   -> Relay 5      -> Floor 3 Selection
GPIO22   -> Relay 6      -> Floor 4 Selection
```

Additional connections:
- Connect ESP32 GND to Relay Module GND
- Connect ESP32 3.3V to Relay Module VCC (if relay module accepts 3.3V logic)
- Connect 5V power supply to Relay Module JD-VCC

## Software Setup

1. Install PlatformIO in VS Code:
   - Open VS Code
   - Go to Extensions
   - Search for "PlatformIO"
   - Install PlatformIO IDE

2. Open this project in VS Code:
   - File -> Open Folder
   - Select the `esp32` folder containing `platformio.ini`

3. Configure WiFi Settings:
   - Open `src/main.cpp`
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```

4. Build and Upload:
   - Click the PlatformIO "Upload" button or press Ctrl+Alt+U
   - Wait for the upload to complete

## LED Status Indicators

The built-in LED (GPIO2) provides status information:
- 3 blinks: WiFi connected successfully
- 2 blinks: New WebSocket client connected
- 1 blink: Relay action performed
- 10 blinks: WiFi connection failed

## Testing

1. After uploading, open the Serial Monitor (PlatformIO -> Monitor)
2. The ESP32 will display its IP address upon connecting to WiFi
3. Test the connection using the provided test script:
   ```bash
   node test-elevator-movement.js 1 2  # Move from floor 1 to 2
   ```

## Troubleshooting

1. If relays don't switch:
   - Check relay module power supply
   - Verify pin connections
   - Ensure relay module logic level matches ESP32 (3.3V)

2. If WiFi won't connect:
   - Verify WiFi credentials
   - Check WiFi signal strength
   - Try power cycling the ESP32

3. If WebSocket connection fails:
   - Verify ESP32 IP address
   - Check if port 81 is accessible
   - Ensure no firewall blocking

## Safety Notes

1. NEVER connect relay outputs directly to elevator controls without proper isolation and safety measures
2. Always follow local electrical and safety codes
3. Test thoroughly in a controlled environment first
4. Include emergency stop functionality in production systems 