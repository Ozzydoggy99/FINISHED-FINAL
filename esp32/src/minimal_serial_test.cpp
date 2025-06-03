#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial1.begin(115200);
  Serial.println("Serial test");
  Serial1.println("Serial1 test");
}

void loop() {} 