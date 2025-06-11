# ESP32-S3 Elevator Controller

This project implements an ESP32-S3-based elevator control system using a 6-channel relay module.

## Hardware Requirements

1. ESP32-S3 DevKitC-1 Board
2. 6-Channel Relay Module (Active LOW)
3. Power Supply:
   - 5V for relays (JD-VCC)
   - 3.3V for ESP32-S3 logic
4. Jumper Wires
5. USB-C Cable for programming

## Pin Connections

Connect the ESP32-S3 to the 6-channel relay module as follows:

```
ESP32-S3 Pin -> Relay Channel -> Function
GPIO16      -> Relay 1      -> Door Open
GPIO17      -> Relay 2      -> Door Close
GPIO18      -> Relay 3      -> Floor 1 Selection
GPIO19      -> Relay 4      -> Floor 2 Selection
GPIO21      -> Relay 5      -> Floor 3 Selection
GPIO22      -> Relay 6      -> Floor 4 Selection
```

Additional connections:
- Connect ESP32-S3 GND to Relay Module GND
- Connect ESP32-S3 3.3V to Relay Module VCC (logic power)
- Connect 5V power supply to Relay Module JD-VCC (relay power)

## Software Setup in Cursor

1. Install PlatformIO Core:
   ```bash
   pip install platformio
   ```

2. Install Required VS Code Extensions:
   - PlatformIO IDE
   - C/C++
   - C/C++ Extension Pack

3. Open Project in Cursor:
   - File -> Open Folder
   - Select the `esp32` folder

4. Configure WiFi Settings:
   - Open `src/main.cpp`
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```

5. Build and Upload:
   - Click the PlatformIO "Build" button or press Ctrl+Alt+B
   - Click the PlatformIO "Upload" button or press Ctrl+Alt+U
   - Open Serial Monitor with PlatformIO "Monitor" button or Ctrl+Alt+S

## LED Status Indicators

The built-in LED (GPIO2) provides status information:
- 3 blinks: WiFi connected successfully
- 2 blinks: New WebSocket client connected
- 1 blink: Relay action performed
- 10 blinks: WiFi connection failed

## Testing

1. After uploading, open Serial Monitor (115200 baud)
2. The ESP32-S3 will display its IP address upon connecting to WiFi
3. Use `test-relay-only.js` to test the relay functionality:
   ```bash
   node test-relay-only.js 1 3  # Test movement from floor 1 to 3
   ```

## Troubleshooting

1. Connection Issues:
   - Verify WiFi credentials
   - Check USB connection
   - Try pressing the BOOT button while uploading

2. Relay Issues:
   - Verify 5V power supply connection
   - Check relay module jumper settings
   - Listen for relay clicking sounds
   - Monitor LED status indicators

3. Serial Monitor Issues:
   - Check baud rate (115200)
   - Try different USB ports
   - Verify USB cable is data-capable

## Project Structure

```
esp32/
├── platformio.ini        # PlatformIO configuration
├── src/
│   └── main.cpp         # Main ESP32 code
└── README.md            # This file
```

## Safety Notes

1. NEVER connect relay outputs directly to elevator controls without proper isolation and safety measures
2. Always follow local electrical and safety codes
3. Test thoroughly in a controlled environment first
4. Include emergency stop functionality in production systems 