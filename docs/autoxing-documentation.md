# AutoXing Documentation

This document contains documentation and specifications for the AutoXing robot system.

## Table of Contents
1. [Getting Started](#getting-started)
   - [Connect to Robot](#connect-to-robot)
   - [Authentication](#authentication)
   - [First Request: Query Device Info](#first-request-query-device-info)
2. [Robot Movement](#robot-movement)
   - [Prerequisites](#prerequisites)
   - [Setting a Map](#setting-a-map)
   - [Coordinates System](#coordinates-system)
   - [Setting Initial Pose](#setting-initial-pose)
   - [Starting Movement](#starting-movement)
   - [Planning State](#planning-state)
3. [WebSocket Communication](#websocket-communication)
   - [Overview](#overview)
   - [Getting Robot Pose](#getting-robot-pose)
   - [Remote Control](#remote-control)
4. [REST API Principles](#rest-api-principles)
   - [Overview](#overview-1)
   - [Targets](#targets)
   - [Actions](#actions)
   - [Status Codes](#status-codes)
   - [Data Format](#data-format)
5. [Map API](#map-api)
   - [Map Fields](#map-fields)
   - [Map List](#map-list)
   - [Get Map Detail](#get-map-detail)
   - [Create Map](#create-map)
   - [Modify Map](#modify-map)
   - [Delete Map](#delete-map)
6. [Move API](#move-api)
   - [Create Move Action](#create-move-action)
   - [Jack Device Operations](#jack-device-operations)
   - [Point-to-Area Move](#point-to-area-move)
   - [Area-to-Area Move](#area-to-area-move)
   - [Follow Given Route](#follow-given-route)
   - [Follow Target](#follow-target)
   - [Get Move Action Detail](#get-move-action-detail)
   - [Move Action List](#move-action-list)
   - [Move State Feedback](#move-state-feedback)
   - [Cancel Current Move](#cancel-current-move)
   - [Move Fail Reasons](#move-fail-reasons)
7. [Current Map and Pose API](#current-map-and-pose-api)
   - [Set Current Map](#set-current-map)
   - [Get Current Map](#get-current-map)
   - [Set Pose](#set-pose)
   - [Pose Feedback](#pose-feedback)
8. [Map Overlays](#map-overlays)
   - [Overview](#overview-2)
   - [Virtual Walls/Regions](#virtual-wallsregions)
   - [Free Space](#free-space)
   - [Charger](#charger)
   - [Auto Door](#auto-door)
   - [Cargo Point](#cargo-point)
   - [Barcode](#barcode)
   - [Lidar Deceitful Area](#lidar-deceitful-area)
   - [Landmarks](#landmarks)
9. [Mapping API](#mapping-api)
   - [Overview](#overview-3)
   - [Start Mapping](#start-mapping)
   - [Visualization](#visualization)
   - [Finish/Cancel Mapping](#finishcancel-mapping)
   - [Mapping List](#mapping-list)
   - [Mapping Detail](#mapping-detail)
   - [Get Mapping Trajectory](#get-mapping-trajectory)
   - [Save Mapping Artifacts](#save-mapping-artifacts)
   - [Delete Mapping Tasks](#delete-mapping-tasks)
   - [Get Landmarks](#get-landmarks)
   - [Piece-by-Piece Mapping](#piece-by-piece-mapping)
10. [Service API](#service-api)
    - [IMU Calibration](#imu-calibration)
    - [Control Mode](#control-mode)
    - [Emergency Stop](#emergency-stop)
    - [Service Management](#service-management)
    - [Device Management](#device-management)
    - [Error Handling](#error-handling)
    - [Hardware Control](#hardware-control)
    - [Network Setup](#network-setup)
    - [System Management](#system-management)
    - [Navigation Services](#navigation-services)
    - [Camera Services](#camera-services)
    - [Cargo Services](#cargo-services)
    - [Time Management](#time-management)
    - [Utility Services](#utility-services)
11. [IoT Devices](#iot-devices)
    - [Overview](#overview-4)
    - [Auto Door and Gateway](#auto-door-and-gateway)
    - [Bluetooth API](#bluetooth-api)
12. [Device Information API](#device-information-api)
    - [Device Information](#device-information)
    - [Network Information](#network-information)
    - [USB Devices](#usb-devices)
    - [Boot Progress](#boot-progress)
    - [Time Configuration](#time-configuration)
    - [Sensor List](#sensor-list)
13. [System Settings](#system-settings)
    - [Overview](#overview-5)
    - [Schema](#schema)
    - [Default Settings](#default-settings)
    - [User Settings](#user-settings)
    - [Effective Settings](#effective-settings)
    - [Setting Options](#setting-options)
14. [App Store API](#app-store-api)
    - [Overview](#overview-6)
    - [Refresh App Store](#refresh-app-store)
    - [List Packages](#list-packages)
    - [Download Packages](#download-packages)
    - [Install Packages](#install-packages)
    - [Install Local Package](#install-local-package)
    - [Task Management](#task-management)
15. [Host Name API](#host-name-api)
    - [Overview](#overview-7)
    - [List Available Names](#list-available-names)
    - [Add Hostname](#add-hostname)
    - [Get Hostname](#get-hostname)
    - [Delete Hostname](#delete-hostname)
16. [Landmarks](#landmarks)
    - [Overview](#overview-8)
    - [Deploying Landmarks](#deploying-landmarks)
    - [Collecting Landmarks](#collecting-landmarks)
    - [Using Landmarks](#using-landmarks)
17. [WebSocket Reference](#websocket-reference)
    - [Overview](#overview-9)
    - [Topic Management](#topic-management)
    - [Map Topics](#map-topics)
    - [Robot State Topics](#robot-state-topics)
    - [Sensor Topics](#sensor-topics)
    - [Control Topics](#control-topics)
    - [Debug Topics](#debug-topics)

## Getting Started

### Connect to Robot
To control the robot, first we must establish a connection.

There are two ways to connect to the robot:

1. Connect to the robot with Ethernet RJ45 port. Use `http://192.168.25.25:8090`
2. Connect to the AP of the robot. Use `http://192.168.12.1:8090`

In this document, we shall connect to the robot and use `192.168.25.25:8090`.

### Authentication
A secure local network is assumed, so we only have a simple HTTP header based authentication. All HTTP requests must have a header `Secret`.

But for simplicity, in this tutorial, we will not repeat it everywhere.

### First Request: Query Device Info
The following command uses curl to make a HTTP request, and use jq to format the output:

```bash
# The secret is hidden. The real one must be requested.
curl -H "Secret: XXXXXXXXXXXXXXXXX" http://192.168.25.25:8090/device/info | jq
```

**TIP**: Requests from the following IPs don't require a secret:
- `192.168.25.*` (added since 2.7.1)
- `172.16.*` (added since 2.7.1)

Example response:
```json
{
  "rosversion": "1.15.11",
  "rosdistro": "noetic",
  "axbot_version": "1.8.8-rc4-pi64",
  "device": {
    "model": "hygeia",
    "sn": "718xxxxxxx",
    "name": "718xxxxxxxx",
    "nickname": "hygeia_1016"
  },
  "baseboard": { "firmware_version": "22a32218" },
  "wheel_control": { "firmware_version": "amps_20211103" },
  "robot": {
    "inscribed_radius": 0.248,
    "height": 1.2,
    "thickness": 0.546,
    "wheel_distance": 0.36,
    "width": 0.496
  },
  "caps": {
    "supportsImuRecalibrateService": true,
    "supportsShutdownService": true,
    "supportsRestartService": true,
    "supportsResetOccupancyGridService": true,
    "supportsImuRecalibrationFeedback": true,
    "supportsSetControlModeService": true,
    "supportsSetEmergencyStopService": true,
    "supportsWheelStateTopic": true,
    "supportsWsV2": true,
    "supportsRgbCamera": true,
    "supportsExternalRgbCamera": true,
    "supportsVisionBasedDetector": true
  },
  "time": "2022/08/02 16:46:58"
}
```

## Robot Movement

### Prerequisites
To move the robot, two prerequisites are required:
1. A map must be set
2. An initial pose must be given

### Setting a Map
One can use RobotAdmin website to set a map on which the robot resides.

Alternatively, use Map List API to find a map id and use POST `/chassis/current-map` to set the map as current map:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"map_id": 286}' \
  http://192.168.25.25:8090/chassis/current-map
```

Example response:
```json
{
  "id": 286,
  "uid": "616cd441e1209813dd4bb25d",
  "map_name": "-1层",
  "create_time": 1647503669,
  "map_version": 6,
  "overlays_version": 8
}
```

### Coordinates System
On RobotAdmin, two arrows (red for X-axis, blue for Y-axis) cross on the origin of the map. The two axes form an orthogonal rectangular coordinate system.

The coordinate of a point on map is marked as (x, y), which are the distances in meters from the origin.

A pose is usually expressed as:
```json
{
  "pos": [0.12, 0.85], // position
  "ori": 1.57 // orientation, in radius. The x-positive direction is 0, counter-clockwise
}
```

### Setting Initial Pose
To move the robot, an initial pose must be given. As a common practice, mapping starts from the charger, so the initial pose of the robot (on charger) becomes origin of the map.

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"position": [0, 0, 0], "ori": 1.57}' \
  http://192.168.25.25:8090/chassis/pose
```

Notes:
- `position: [0, 0, 0]` means x=0, y=0, z=0
- `ori: 1.57` (π/2) means robot's heading is Y-positive

### Starting Movement
Use POST `/chassis/moves` to create a move action:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"standard", "target_x":0.731, "target_y":-1.525, "target_z":0, "creator":"head-unit"}' \
  http://192.168.25.25:8090/chassis/moves
```

Example response:
```json
{
  "id": 4409,
  "creator": "head-unit",
  "state": "moving",
  "type": "standard",
  "target_x": 0.731,
  "target_y": -1.525,
  "target_z": 0.0,
  "target_ori": null,
  "target_accuracy": null,
  "use_target_zone": null,
  "is_charging": null,
  "charge_retry_count": 0,
  "fail_reason": 0,
  "fail_reason_str": "None - None",
  "fail_message": "",
  "create_time": 1647509573,
  "last_modified_time": 1647509573
}
```

### Planning State
Use GET `/chassis/moves/:id` to see the state of a move action:

```bash
curl http://192.168.25.25:8090/chassis/moves/4409
```

Example response:
```json
{
  "id": 4409,
  "creator": "head-unit",
  "state": "finished",
  "type": "standard",
  "target_x": 0.7310126134385344,
  "target_y": -1.5250144001960249,
  "target_z": 0.0,
  "target_ori": null,
  "target_accuracy": null,
  "use_target_zone": null,
  "is_charging": null,
  "charge_retry_count": 0,
  "fail_reason": 0,
  "fail_reason_str": "None - None",
  "fail_message": "",
  "create_time": 1647509573,
  "last_modified_time": 1647509573
}
```

The `state` field shows the state of the action. Since the current action's state is constantly changing, it's more efficient to use the WebSocket API to receive real-time state updates rather than polling the REST API.

## WebSocket Communication

### Overview
Besides REST API, we have WebSocket for real-time information. Unlike REST API's request/response behavior, WebSocket allows constant two-way communication between the client and the server (robot). This is especially useful when the robot needs to report back fast-changing information, such as:
- The pose of the robot
- Planning state
- Current map
- Current target

### Getting Robot Pose
For testing purposes, we can use `wscat` to test WebSocket connections. On Ubuntu, use `sudo apt install node-ws` to install it, or with NodeJS, use `sudo npm -g i wscat`.

```bash
$ wscat -c ws://192.168.25.25:8090/ws/v2/topics
connected (press CTRL+C to quit)
> {"enable_topic": "/slam/state"}
< {"enabled_topics": ["/slam/state"]}
> {"enable_topic": "/tracked_pose"}
< {"enabled_topics": ["/tracked_pose", "/slam/state"]}
< {"topic": "/tracked_pose", "pos": [-3.55, -0.288], "ori": -1.28}
< {"topic": "/tracked_pose", "pos": [-3.55, -0.285], "ori": -1.28}
< {"topic": "/slam/state", "state": "positioning", "reliable": true}
```

The `v2` in `/ws/v2/topics` is the WebSocket API version. For now, v2 is the only version. We try to maintain a stable API, but if major changes occur and the API must be changed, we shall provide an updated version.

In the example above, two topics are subscribed:
- `/slam/state` for positioning state updates
- `/tracked_pose` for pose updates

After subscribing, when positioning state or robot pose changes, the server will actively notify us.

### Remote Control
WebSocket is more responsive than REST API, making it more suitable for real-time activities such as remote control.

First, we need to switch control mode to remote:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"mode": "remote"}' \
  http://192.168.25.25:8090/services/wheel_control/set_control_mode
```

Then, use WebSocket to send control commands:

```bash
$ wscat -c ws://192.168.25.25:8090/ws/v2/topics
connected (press CTRL+C to quit)
> {"topic": "/twist", "linear_velocity": 0, "angular_velocity": -0.6522}
< {"topic": "/twist_feedback"}
> {"topic": "/twist", "linear_velocity": 0, "angular_velocity": -0.6522}
< {"topic": "/twist_feedback"}
```

In this example:
- `linear_velocity: 0` means stay on the same spot
- `angular_velocity: -0.6522` means rotate to the right (with angular velocity -0.6522 radian/second)

**WARNING**: Don't send lots of `/twist` commands. One must wait for `/twist_feedback` before sending another twist. This is especially important for Internet connections that may become sluggish.

Commands tend to pile up in the socket buffer. Even when you stop sending commands, buffered commands will still be received on the remote side. The robot will move for a very long time until all commands are consumed.

## REST API Principles

### Overview
REST APIs follow a one-request-one-response form. Each request contains a target and action, while the response contains status and data.

For example, to delete map 3, we use `DELETE /maps/3`:

Request: `action=DELETE target=/maps/3`
Response: `status=204 data={}` (empty JSON)

Example using curl:
```bash
$ curl -X DELETE -i http://192.168.25.25:8090/maps/3
HTTP/1.1 204 No Content
date: Thu, 17 Mar 2022 05:06:59 GMT
server: uvicorn
Vary: Accept, Cookie
Content-Length: 0
```

A 204 - No Content response means the object was deleted successfully.

### Targets
There are two kinds of targets:
1. List targets (e.g., `/maps`, `/chassis/moves`, `/services`)
2. Single targets (e.g., `/maps/3`, `/chassis/moves/1150`, `/services/imu/recalibrate`)

### Actions
Common actions are query, create, delete, modify, and overwrite, corresponding to HTTP methods GET, POST, DELETE, PATCH, and PUT respectively.

Common patterns:
| Action | Target | Description |
|--------|--------|-------------|
| POST | /maps | Create a new map with provided data |
| GET | /maps | Get the list of all maps |
| GET | /maps/1 | Get the detail of map 1 |
| PUT | /maps/1 | Overwrite map 1 with provided data |
| PATCH | /maps/1 | Partially update map 1 |
| DELETE | /maps/1 | Delete map 1 |
| DELETE | /maps | Delete all maps |

### Status Codes
The response status codes follow standard HTTP Status Codes:

- 2xx: Successful responses
  - 200 OK
  - 201 Created (Object created or service executed)
  - 204 No Content (Deleted successfully)
- 4xx: Client error responses
  - 400 Bad Request (Mal-formatted parameters or unmet preconditions)
  - 404 Not Found (Resource doesn't exist)
- 5xx: Server error responses
  - 500 Internal Server Error (Server encountered an error)

### Data Format
The response data is in JSON format and can be either:
1. An object
2. A list

Example of listing all maps (returns a list):
```bash
curl http://192.168.25.25:8090/maps/ | jq
[
  {
    "id": 1,
    "uid": "620620f9c0fd0ecb0f66d981",
    "map_name": "5th Floor",
    "create_time": 1644568815,
    "map_version": 9,
    "overlays_version": 14,
    "thumbnail_url": "http://192.168.25.25:8090/maps/1/thumbnail",
    "image_url": "http://192.168.25.25:8090/maps/1.png",
    "url": "http://192.168.25.25:8090/maps/1"
  },
  {
    "id": 2,
    "uid": "61ee4c3ac0fd0ecb0f66d165",
    "map_name": "Lobby",
    "create_time": 1643007028,
    "map_version": 2,
    "overlays_version": 8,
    "thumbnail_url": "http://192.168.25.25:8090/maps/2/thumbnail",
    "image_url": "http://192.168.25.25:8090/maps/2.png",
    "url": "http://192.168.25.25:8090/maps/2"
  },
  {
    "id": 3,
    "uid": "61e95264c0fd0ecb0f66c71e",
    "map_name": "Hallway",
    "create_time": 1642680851,
    "map_version": 1,
    "overlays_version": 3,
    "thumbnail_url": "http://192.168.25.25:8090/maps/3/thumbnail",
    "image_url": "http://192.168.25.25:8090/maps/3.png",
    "url": "http://192.168.25.25:8090/maps/3"
  }
]
```

Example of getting map details (returns an object):
```bash
curl http://192.168.25.25:8090/maps/1 | jq
{
  "id": 1,
  "map_name": "5层地图",
  "uid": "620620f9c0fd0ecb0f66d981",
  "map_version": 9,
  "create_time": 1644568815,
  "last_modified_time": 1647333821,
  "grid_origin_x": -53.1968,
  "grid_origin_y": -25.0135,
  "grid_resolution": 0.05,
  "overlays_version": 14,
  "overlays": "{\"type\": \"FeatureCollection\", \"features\": [{\"id\": ...",
  "thumbnail_url": "http://192.168.25.25:8090/maps/1/thumbnail",
  "image_url": "http://192.168.25.25:8090/maps/1.png",
  "download_url": "http://192.168.25.25:8090/maps/1/download",
  "pbstream_url": "http://192.168.25.25:8090/maps/1.pbstream"
}
```

### Create Map
Create a new map by providing the required fields:

```bash
curl -X POST \
    -H "Content-Type: application/json" \
    --data '{
      "map_name": "xxx",
      "carto_map": "xxxx",
      "occupancy_grid": "xxx",
      "grid_origin_x": 0,
      "grid_origin_y": 0,
      "grid_resolution": 0.05,
      "overlays_version": 1,
      "overlays": "{}",
      "uid": "optional",
      "map_version": 1
    }' \
    http://192.168.25.25:8090/maps/
```

Required fields:
- `map_name`
- `carto_map`
- `occupancy_grid`
- `grid_origin_x`
- `grid_origin_y`
- `grid_resolution`

Optional fields:
- `overlays_version`
- `overlays`
- `uid`
- `map_version`

Example response:
```json
{
  "id": 119,
  "uid": "9b94ac16-239b-11ed-9446-1e49da274768",
  "map_name": "From Mapping 4",
  "create_time": 1657015615,
  "map_version": 1,
  "overlays_version": 1,
  "thumbnail_url": "http://192.168.25.25:8090/maps/119/thumbnail",
  "image_url": "http://192.168.25.25:8090/maps/119.png",
  "url": "http://192.168.25.25:8090/maps/119"
}
```

### Modify Map
Modify a map's name and overlays:

```bash
curl -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"map_name": "...", "overlays": "..."}' \
    http://192.168.25.25:8090/maps/1
```

### Delete Map
Delete a specific map:

```bash
curl -X DELETE http://192.168.25.25:8090/maps/1
```

### Delete All Maps
Delete all maps:

```bash
curl -X DELETE http://192.168.25.25:8090/maps
```

## Move API

### Create Move Action
Create a new move action:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"creator": "xxx", "type": "standard" ...}' \
  http://192.168.25.25:8090/chassis/moves
```

Response:
```json
{
  "id": 5 // The ID of the newly created action
}
```

Request Parameters:
```typescript
interface MoveActionCreate {
  creator: string; // Initiator of the action (for diagnosis only)
  type: 'standard' | 'charge' | 'return_to_elevator_waiting_point' | 'enter_elevator' | 
        'leave_elevator' | 'along_given_route' | 'align_with_rack' | 'to_unload_point' | 
        'follow_target';
  target_x?: number;
  target_y?: number;
  target_z?: number;
  target_ori?: number;
  target_accuracy?: number; // in meters (optional)
  route_coordinates?: string; // Only valid with type 'along_given_route'
  detour_tolerance?: number; // Only valid with type 'along_given_route'
  use_target_zone?: boolean; // default: false
  charge_retry_count?: number;
  rack_area_id?: string;
  properties?: {
    inplace_rotate?: boolean; // Optional, since 2.11.0
  }
}
```

### Jack Device Operations
Since version 2.7.0, the Longjack model can crawl under a rack and jack it up. For a typical point-to-point task, follow this sequence:

1. Crawl under the rack:
   - Create a move action with `type=align_with_rack`
2. Raise the jack device:
   - Call `/services/jack_up` when the move succeeds
   - Monitor progress via Jack State Topic
   - Wait for the jack to be fully up (robot footprint will expand)
3. Move to unload point:
   - Create a move action with `type=to_unload_point`
4. Lower the jack device:
   - Call `/services/jack_down` to unload
5. Optional: Create the next move action

**WARNING**: Some parameters must be configured correctly for safe operation. See `rack.specs`.

### Point-to-Area Move
In addition to point-to-point moves, we support:
- Point-to-area move: Used when you can't know in advance which points in the target area are empty
- Area-to-area move: Move every rack/pallet from one area to another

When receiving a move action with `type=to_unload_point` and `rack_area_id={SOME_ID}`, the robot will:
1. Scan all rack points in that area
2. Move to the first empty point
3. Fail with `NoFreeSpaceInRackArea` if all points are occupied

New fail reasons include:
- `InvalidRackAreaId`
- `InvalidRackArea`
- `UnknownRackSpaceState`
- `NoRackInRackArea`
- `AlignFailedInRackArea`
- `NoFreeSpaceInRackArea`
- `FailedToUnloadInRackArea`

### Area-to-Area Move
Create a move action with `type=align_with_rack` and `rack_area_id={SOME_ID}`. The robot will:
1. Patrol the source area
2. Find the first rack point with a rack
3. Align with it

### Follow Given Route
When `route_coordinates` is given and `detour_tolerance=0`, the robot will:
- Follow the route as closely as possible
- Not try to evade obstacles (only stop ahead)
- Often used in stock inspection

### Follow Target
Tell the robot to follow a moving target:

```bash
curl -X POST \
  -H "content-type: application/json" \
  --data '{"type":"follow_target"}' \
  http://192.168.25.25:8090/chassis/moves
```

After creating this action, send target poses via WebSocket topic `/follow_target_state`.

### Get Move Action Detail
```bash
curl http://192.168.25.25:8090/chassis/moves/4409
```

Example response:
```json
{
  "id": 4409,
  "creator": "robot-admin-web",
  "state": "cancelled",
  "type": "standard",
  "target_x": 0.7310126134385344,
  "target_y": -1.5250144001960249,
  "target_z": 0.0,
  "target_ori": null,
  "target_accuracy": null,
  "use_target_zone": null,
  "is_charging": null,
  "charge_retry_count": 0,
  "fail_reason": 0,
  "fail_reason_str": "None - None",
  "fail_message": "",
  "create_time": 1647509573,
  "last_modified_time": 1647509573
}
```

Response fields:
```typescript
interface MoveAction extends MoveActionCreate {
  state: 'idle' | 'moving' | 'succeeded' | 'failed' | 'cancelled';
  create_time: number; // Unix timestamp
  last_modified_time: number; // Unix timestamp
  fail_reason: number; // Fail code (valid when state="failed")
  fail_reason_str: string; // Internal fail message (for debugging)
  fail_message: string; // Internal fail message in Chinese (for debugging)
}
```

### Move Action List
Get history of all move actions:

```bash
curl http://192.168.25.25:8090/chassis/moves
```

Example response:
```json
[
  {
    "id": 4409,
    "creator": "robot-admin-web",
    "state": "cancelled",
    "type": "standard",
    "fail_reason": 0,
    "fail_reason_str": "None - None",
    "fail_message": "",
    "create_time": 1647509573,
    "last_modified_time": 1647509573
  },
  {
    "id": 4408,
    "creator": "control_unit",
    "state": "succeeded",
    "type": "none",
    "fail_reason": 0,
    "fail_reason_str": "None - None",
    "fail_message": "",
    "create_time": 1647427995,
    "last_modified_time": 1647428509
  }
]
```

### Move State Feedback
Use WebSocket `/planning_state` to get move state updates:

```json
{
  "topic": "/planning_state",
  "move_state": "moving",
  "target_poses": [
    {
      "pos": [2.3, 20.82],
      "ori": 0
    }
  ],
  "charger_pose": {
    "pos": [0, 0],
    "ori": 0
  },
  "going_back_to_charger": false,
  "action_id": 4410,
  "fail_reason": 0,
  "fail_reason_str": "none",
  "remaining_distance": 3.546117067337036,
  "move_intent": "none",
  "intent_target_pose": {
    "pos": [0, 0],
    "ori": 0
  },
  "stuck_state": "none"
}
```

### Cancel Current Move
```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{state: "cancelled"}' \
  http://192.168.25.25:8090/chassis/moves/current
```

Response:
```json
{ "state": "cancelled" }
```

### Move Fail Reasons
The `fail_reason` field indicates why a move action failed. Common reasons include:

- `none` (0): No error
- `unknown` (1): Unknown reason
- `GetMapFailed` (2): Failed to obtain map
- `StartingPointOutOfMap` (3): Starting point outside map
- `EndingPointOutOfMap` (4): Ending point outside map
- `StartingPointNotInGround` (5): Starting point not in passable area
- `EndingPointNotInGround` (6): Ending point not in passable area
- `StartingEqualEnding` (7): Same start and end points
- `CalculationFailed` (9): Roads not connected
- `CalculationTimeout` (10): Calculation timeout
- `NoGlobalPath` (11): No global path available
- `PlanningTimeout` (14): Path planning unsuccessful
- `MoveTimeout` (15): Move timeout
- `ControlCostmapError` (16): Local obstacle avoidance error
- `PowerCableConnected` (17): Currently charging with cable
- `RotateTimeout` (18): Rotation timeout

For a complete list of fail reasons, see the latest version at "https://rb-admin.autoxing.com/api/v1/static/move_failed_reason.json".

## Current Map and Pose API

### Set Current Map
There are three ways to set the current map:

1. Set with map_id or map_uid:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"map_id": 286}' \
  http://192.168.25.25:8090/chassis/current-map
```

Request Parameters:
```typescript
class SetCurrentMapRequest {
  map_id?: number;    // Either 'map_id' or 'map_uid' must be provided
  map_uid?: string;   // Since 2.5.2. Before that, only 'map_id' was supported
}
```

2. Set with data directly (Since 2.7.0):
```typescript
class SetCurrentMapWithDataRequest {
  map_name: string;
  occupancy_grid: string;    // base64 encoded PNG
  carto_map: string;         // binary map data
  grid_resolution: number;   // typically 0.05
  grid_origin_x: number;     // X coordinate of lower left corner of PNG map
  grid_origin_y: number;     // Y coordinate of lower left corner of PNG map
  overlays: string;          // See documents about overlays
}
```

**Note**: This method is very slow for large maps.

3. Set by loading local files (Since 2.11.0):
```bash
curl -X POST http://localhost:8090/chassis/current-map \
  -H "Content-Type: application/json" \
  --data '{"data_url":"file:///home/simba/tmp_map/map_73.pbstream", "map_name": "xxx"}'
```

Required files:
- `/home/simba/tmp_map/map_73.pbstream`
- `/home/simba/tmp_map/map_73.png`
- `/home/simba/tmp_map/map_73.yaml`

YAML file format:
```yaml
uid: 62202f9fed0883652d08ad5c
grid_origin_x: -5.900000095367432
grid_origin_y: -9.199999809265137
grid_resolution: 0.05
map_version: 3
overlays_version: 1
overlays: {
  "map_uid": "62202f9fed0883652d08ad5c",
  "features": []
}
```

### Get Current Map
```bash
curl http://192.168.25.25:8090/chassis/current-map
```

Example response:
```json
{
  "id": 287,
  "uid": "62202f9fed0883652d08ad5c",
  "map_name": "26层",
  "create_time": 1647862075,
  "map_version": 15,
  "overlays_version": 25
}
```

**Note**: When current map is set with data directly, `id` will be -1.

The latched topic `/map/info` contains information about the currently used map. Subscribe to receive updates when the current map changes:

```bash
$ wscat -c ws://192.168.25.25:8090/ws/v2/topics
> {"enable_topic": "/map/info"}
< {
  "topic": "/map/info",
  "name": "26层",
  "uid": "62202f9fed0883652d08ad5c",
  "map_version": 15,
  "overlays_version": 25,
  "overlays": {...}
}
```

### Set Pose
Set the pose (position/orientation) of the robot on the current map:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"position": [0, 0, 0], "ori": 1.57}' \
  http://192.168.25.25:8090/chassis/pose
```

Request Parameters:
```typescript
class SetPoseRequest {
  position: [number, number, number];  // coordinates x, y, z (z is always 0)
  ori: number;                         // heading in radians, counter-clockwise (0 means x-positive)
  adjust_position?: boolean;           // optional position correction
}
```

The `adjust_position` parameter:
- If `true`: The system will attempt to correct initial position errors within a small area based on lidar observations
- If `false`: No position correction will be attempted
- If not provided: Behavior is undefined and may vary with software version, environment, and global settings

**WARNING**: The correction algorithm may be misguided by environmental changes. If you are certain about the initial pose, especially when there are misleading patterns, set `adjust_position=false`.

### Pose Feedback
The latched topic `/tracked_pose` provides the latest robot pose:

```bash
$ wscat -c ws://192.168.25.25:8090/ws/v2/topics
> {"enable_topic": "/tracked_pose"}
< {"topic": "/tracked_pose", "pos": [-3.553, -0.288], "ori": -1.28}
< {"topic": "/tracked_pose", "pos": [-3.55, -0.285], "ori": -1.28}
```

## Map Overlays

### Overview
The `overlays` field of a map is in GeoJSON format. It contains various elements such as:
- Virtual walls
- Virtual regions
- Auto-doors
- Dockers
- Cargo-load points
- And more

To update the overlays of a map, see the [Modify Map](#modify-map) section.

The top-level format is:
```json
{
    "type": "FeatureCollection",
    "features": [
        {}, // feature 1
        {}, // feature 2
        {}, // feature 3
    ]
}
```

Each feature can be a point, a polyline, or a polygon. For example, this is a polygon:
```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "id": "SampleGate",
            "type": "Feature",
            "properties": {
                "regionType": 4,
                "mac": "30C6F72FAE1C"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-2.702, -5.784],
                        [-1.007, -5.827],
                        [-1.053, -6.348],
                        [-2.546, -6.385]
                    ]
                ]
            }
        }
    ]
}
```

### Virtual Walls/Regions
Virtual walls and regions are used to prevent the robot from moving into certain areas.

Virtual walls are LineString features that prevent the robot from passing from one side to another. They are also used to guide global path calculation:

```json
{
    "id": "19f0684fdf2b1695054df052e002d8f6",
    "type": "Feature",
    "properties": {
        "lineType": "2",
        "mapOverlay": true
    },
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-35.0222214524365, -14.968376602837452],
            [-35.094466030898275, -22.120589758429787],
            [2.4727142286451453, -22.554057221952917],
            [2.54495880739114, -15.329599487756695],
            [-35.0222214524365, -15.112865751092386]
        ]
    }
}
```

Virtual regions are stronger than virtual walls. If the robot accidentally enters a virtual region, it will not be able to move in any direction:

```json
{
    "id": "4d14040ea1ee7dd2e1d778f04a224d7a",
    "type": "Feature",
    "properties": {
        "blocked": false,
        "mapOverlay": true,
        "regionType": "1"
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [-87.30882859651956, -43.42832073191971],
                [-86.96655334631487, -24.85988841115727],
                [0.22327395043930665, -25.754819491083936],
                [0.22327395043930665, -44.23768299574249],
                [-87.30882859651956, -43.42832073191971]
            ]
        ]
    }
}
```

### Free Space
Free spaces are used to clear out areas in the map, allowing the robot to move into those areas. They are used to remove redundant obstacles after creating the map:

```json
{
    "id": "e4d544e92262c538dc31e116b630043b",
    "type": "Feature",
    "properties": {
        "blocked": false,
        "mapOverlay": true,
        "regionType": "12"
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [1.1439716297445557, -16.400667528273516],
                [3.5214924133697423, -16.438682980748354],
                [2.9970246447419413, -25.260207920183575],
                [0.6399114661803651, -25.07582059422475],
                [1.1439716297445557, -16.400667528273516]
            ]
        ]
    }
}
```

### Charger
Chargers are used with move action type `charge`:

```json
{
    "id": "642562bcf0e02ee8aff7dea7",
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": [0, 0]
    },
    "properties": {
        "deviceIds": ["6181307902152yI"],
        "dockingPointId": "65655d96f0e02ee8afc9cc5e",
        "mapOverlay": true,
        "name": "sac_01",
        "type": "9",
        "yaw": 90
    }
}
```

### Auto Door
When auto-doors are defined, the robot can open the doors ahead of it. The door is expressed as a polygon and must have a MAC property:

**WARNING**: The polygon must cover the entire area where the door moves. If it's not large enough, when the door opens, it may collide with the waiting robot.

```json
{
    "type": "Feature",
    "properties": {
        "regionType": 4,
        "mac": "30C6F72FAE1C"
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [-2.702, -5.784],
                [-1.007, -5.827],
                [-1.053, -6.348],
                [-2.546, -6.385]
            ]
        ]
    }
}
```

### Cargo Point
Similar to chargers, cargo points tell the robot where to find racks to load/unload. They should be used with move action types `align_with_rack` and `to_unload_point`.

### Barcode
Barcodes are used to uniquely determine the global pose of the robot:

```json
{
    "id": "d43d15cf4e4ad0bd2a24891badd74891",
    "type": "Feature",
    "properties": {
        "mapOverlay": true,
        "name": "Some user defined name",
        "barcodeId": "D2_29",
        "type": "37",
        "yaw": "177.8"
    },
    "geometry": {
        "coordinates": [-1.052, -5.485],
        "type": "Point"
    }
}
```

### Lidar Deceitful Area
In areas where the terrain is not flat, the 2D lidar may hit the ground stably and mistake it for a wall. Adding a "lidar deceitful area" can help the robot solve this problem. When moving in these areas, the robot will put more trust in the odometry of the wheels over lidar observations:

```json
{
    "type": "Feature",
    "properties": {
        "regionType": 8
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [-2.702, -5.784],
                [-1.007, -5.827],
                [-1.053, -6.348],
                [-2.546, -6.385]
            ]
        ]
    }
}
```

### Landmarks
Since version 2.11.0, landmarks can be collected in the mapping process. Only when stored in map overlays can they be used for positioning:

```json
{
    "type": "Feature",
    "properties": {
        "type": "39",
        "landmarkId": "landmark_1"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-2.702, -5.784]
    }
}
```

## Mapping API

### Overview
The Mapping API allows you to:
- Create/finish/cancel/delete mapping tasks
- View all mapping tasks
- Save mapping task artifacts as a map

A mapping task has a state that can be:
- `running`
- `finished`
- `cancelled`
- `failed`

When a task is successfully created, it's in the `running` state. When finished, it will contain a map and a bag file. The bag file contains the sensor data used during map creation.

**Note**: A mapping task (in `/mappings`) cannot be used for navigation. You must save the artifacts of a mapping task into `/maps` first.

### Piece-by-Piece Mapping
For very large maps that exceed the capacity of a single map, you can create several connected maps instead. When the robot moves in the overlapping area between two maps, it can switch to another map and continue moving.

#### Simple Method
This method is suitable for maps with clear single-channel cut points.

Steps:
1. Create Area 1
2. Use Area 1 for localization and move to the overlapping area between Area 1 and Area 2
3. Start creating a new map, ensuring to set `{"start_pose_type": "current_pose"}`. This way, the current coordinates will be used as the starting point of the new map, making the coordinate systems of both maps continuous
4. After Area 2 is created, continue creating Area 3, and so on
5. You can appropriately increase the overlap between two maps (when creating Area 2, move back a bit). The larger the overlap, the more area available for switching maps

Limitations:
- Only inherits the coordinates of the previous map at a specific starting point
- No matching or loop closure between maps
- Can only ensure matching around single points
- Not suitable for maps with multiple connecting channels between parts
- Separated multiple areas should not have large loop structures

#### Backbone Method
The backbone method can accommodate multi-channel scenarios and properly match all channels.

Steps:
1. Perform analysis and planning to identify the backbone and areas
   - The backbone should include major main routes and large loops
   - It should connect to all areas
2. Walk along the backbone to create it, naming it "backbone"
   - Once the backbone is established, the overall shape of the map is determined
3. Load the backbone and walk to the vicinity of the first area, Area 1
4. Start incremental mapping
5. Finish mapping, ensuring to select `{"new_map_only": true}`
   - This means only the incremental part is saved, not the backbone part
6. Continue creating each subsequent area
7. Finally, discard the backbone map
   - It is only used to match and perform loop closure between the parts

The backbone method is particularly useful for complex environments with multiple connecting channels between areas.

### Start Mapping
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"continue_mapping": false}' \
  http://192.168.25.25:8090/mappings/
```

Example response:
```json
{
   "id": 48,
   "thumbnail_url": null,
   "image_url": null,
   "grid_origin_x": 0.0,
   "grid_origin_y": 0.0,
   "grid_resolution": 0.0,
   "url": "http://xxxx:10022/mappings/48",
   "start_time": 1647520760,
   "end_time": null,
   "state": "running",
   "bag_id": null,
   "bag_url": null,
   "download_url": null
}
```

Request Parameters:
```typescript
interface MappingCreateRequest {
  // false(default) for creating new map
  // true for incremental mapping
  // If true, the current map(and its coordinates) will be inherited
  continue_mapping: boolean;

  // (since 1.8.8)
  // zero(default): Use x=0,y=0,ori=0 as start point (Start new coordinate frame)
  // current_pose: Use current pose as start point (Inherit coordinate frame)
  start_pose_type: 'zero' | 'current_pose';
}
```

### Visualization
During mapping, use WebSocket to receive real-time feedback:
- Current Pose
- Map (updated at regular intervals)
- Trajectory History (shows which parts of the map have been visited)
- Point Cloud and Obstacle Map (helps avoid collision during remote mapping)

### Finish/Cancel Mapping
```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"state": "finished"}' \
  http://192.168.25.25:8090/mappings/current
```

Request Parameters:
```typescript
interface MappingFinishRequest {
  state: 'finished' | 'cancelled';  // Finish or cancel mapping task

  // (since 1.8.8)
  // false(default), save the whole map
  // true, Only save the incremented part of the map (For incremental mapping only)
  new_map_only: boolean;
}
```

When a mapping task is finished, the artifacts will be saved. You can request them with `/mappings/:id` afterward.

### Mapping List
```bash
curl http://192.168.25.25:8090/mappings/
```

Example response:
```json
[
   {
      "id": 48,
      "thumbnail_url": "http://192.168.25.25:8090/mappings/48/thumbnail",
      "image_url": "http://192.168.25.25:8090/mappings/48.png",
      "grid_origin_x": -8.050000190734863,
      "grid_origin_y": -5.650000095367432,
      "grid_resolution": 0.05,
      "url": "http://192.168.25.25:8090/mappings/48",
      "start_time": 1647520760,
      "end_time": 1647520995,
      "state": "finished",
      "bag_id": 27,
      "bag_url": "http://192.168.25.25:8090/bags/27.bag",
      "download_url": "http://192.168.25.25:8090/mappings/48/download",
      "trajectories_url": "http://192.168.25.25:8090/mappings/48/trajectories.json"
   },
   {
      "id": 47,
      "thumbnail_url": null,
      "image_url": null,
      "grid_origin_x": 0.0,
      "grid_origin_y": 0.0,
      "grid_resolution": 0.0,
      "url": "http://192.168.25.25:8090/mappings/47",
      "start_time": 1647494329,
      "end_time": null,
      "state": "cancelled",
      "bag_id": null,
      "bag_url": null,
      "download_url": null
   }
]
```

### Mapping Detail
```bash
curl http://192.168.25.25:8090/mappings/48
```

Example response:
```json
{
  "id": 48,
  "thumbnail_url": "http://192.168.25.25:8090/mappings/48/thumbnail",
  "image_url": "http://192.168.25.25:8090/mappings/48.png",  // Base64 encoded map image (PNG, used for display)
  "grid_origin_x": -8.050000190734863,
  "grid_origin_y": -5.650000095367432,
  "grid_resolution": 0.05,
  "url": "http://192.168.25.25:8090/mappings/48",
  "start_time": 1647520760,
  "end_time": 1647520995,
  "state": "finished",  // The current state: running, finished, cancelled, failed
  "bag_id": 27,
  "bag_url": "http://192.168.25.25:8090/bags/27.bag",
  "download_url": "http://192.168.25.25:8090/mappings/48/download",  // get Base64 encoded map data (binary, used for positioning)
  "trajectories_url": "http://192.168.25.25:8090/mappings/48/trajectories.json",
  "landmark_url": "http://192.168.25.25:8090/mappings/48/landmarks.json"  // since 2.11.0
}
```

### Get Mapping Trajectory
```bash
curl http://192.168.25.25:8090/mappings/48/trajectories.json
```

Example response:
```json
[
  {
    "id": 0,
    "coordinates": [
      [0, 0.01],
      [0.01, 0.11],
      [0, 0.01],
      [0.01, 0.11],
      [-0.12, 0.17]
    ]
  }
]
```

### Save Mapping Artifacts
Only when saved as a map can the robot load and use it for navigation. This method (with `mapping_id`) is more efficient than POSTing the whole map with all fields.

```bash
curl -X POST http://192.168.25.25:8090/maps/ \
  -H "Content-Type: application/json" \
  -d '{
    "map_name": "From Mapping 4",  // Give the map a name
    "mapping_id": 4  // Mapping Action id
  }'
```

Example response:
```json
{
  "id": 119,  // The newly created map id. Use this id to load it into robot.
  "uid": "9b94ac16-239b-11ed-9446-1e49da274768",
  "map_name": "From Mapping 4",
  "create_time": 1657015615,
  "map_version": 1,
  "overlays_version": 1,
  "thumbnail_url": "http://192.168.25.25:8090/maps/119/thumbnail",
  "image_url": "http://192.168.25.25:8090/maps/119.png",
  "url": "http://192.168.25.25:8090/maps/119"
}
```

### Delete Mapping Tasks
Delete a specific mapping task:
```bash
curl -X DELETE http://192.168.25.25:8090/mappings/1
```

Delete all mapping tasks:
```bash
curl -X DELETE http://192.168.25.25:8090/mappings/
```

### Get Landmarks
Since version 2.11.0, you can retrieve landmarks from a mapping task:

```bash
curl http://192.168.25.25:8090/mappings/48/landmarks.json
```

Example response:
```json
[
  {
    "id": "landmark_1",
    "pos": [1.234, 2.345]
  },
  {
    "id": "landmark_2",
    "pos": [5.234, 8.345]
  }
]
```

## Service API

### IMU Calibration
Calibrate the IMU. The robot must be set still on a hard and flat surface:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/imu/recalibrate
```

This service call only initiates the calibration. The actual process usually takes 10-20 seconds.

When calibration is finished, an action will be received via WebSocket:

Success example:
```json
{
  "topic": "/action",
  "timestamp": 1681733608.653,
  "email": "",
  "username": "",
  "deviceName": "718220110000909",
  "action": "recalibrate_imu",
  "message": "IMU calibration succeeded"
}
```

Failure example:
```json
{
  "topic": "/action",
  "timestamp": 1681733580.702,
  "email": "",
  "username": "",
  "deviceName": "718220110000909",
  "action": "recalibrate_imu",
  "message": "error: IMU calibration failed. Failed to rotate to right"
}
```

### Control Mode
Set the control mode of the robot:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"control_mode": "auto"}' \
  http://192.168.25.25:8090/services/wheel_control/set_control_mode
```

Parameters:
```typescript
class SetControlModeRequest {
  control_mode: 'auto' | 'manual' | 'remote';
}
```

Use the `/wheel_state` WebSocket topic to monitor wheel state:
```bash
$ wscat -c ws://192.168.25.25:8090/ws/v2/topics
> {"enable_topic": "/wheel_state"}
< {"topic": "/wheel_state", "control_mode": "auto", "emergency_stop_pressed": true }
```

### Emergency Stop
Set or clear the emergency stop state:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"enable": true}' \
  http://192.168.25.25:8090/services/wheel_control/set_emergency_stop
```

Parameters:
```typescript
class SetEmergencyStopRequest {
  enable: boolean;
}
```

Monitor the emergency stop state via the `/wheel_state` topic.

### Service Management
Restart all services:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/restart_service
```

### Device Management
Shutdown or reboot the device:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"target": "main_power_supply", "reboot": false}' \
  http://192.168.25.25:8090/services/baseboard/shutdown
```

Parameters:
```typescript
class ShutdownRequest {
  target: 'main_computing_unit' | 'main_power_supply';  // Only reboot/shutdown the main computing board or the whole device
  reboot: boolean;  // true = reboot, false = shutdown
}
```

### Error Handling
Clear wheel errors:
```bash
curl -X POST http://192.168.25.25:8090/services/wheel_control/clear_errors
```

Clear flip error (Error 8004):
```bash
curl -X POST http://192.168.25.25:8090/services/monitor/clear_flip_error
```

**Note**: Error 8004 (flip error) usually means serious trouble - the robot might have fallen over. It requires human checking before clearing.

Clear slide error (Error 2008):
```bash
curl -X POST http://192.168.25.25:8090/services/monitor/clear_slipping_error
```

**WARNING**: Error 2008 (slide error) means the robot may have serious impact with some invisible obstacle. It demands human checking before clearing the error.

### Hardware Control
Power on/off lidar:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"action": "power_on"}' \
  http://192.168.25.25:8090/services/baseboard/power_on_lidar
```

Parameters:
```typescript
class PowerOnRequest {
  action: 'power_on' | 'power_off';
}
```

Power on/off depth camera:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"enable": true}' \
  http://192.168.25.25:8090/services/depth_camera/enable_cameras
```

Parameters:
```typescript
class EnableDepthCameraRequest {
  enable: boolean;
}
```

### Network Setup
Switch WIFI to Access-Point or Station mode:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"mode": "station", "ssid":"xxxxxxxxx", "psk": "xxxxx"}' \
  http://192.168.25.25:8090/services/setup_wifi
```

Parameters:
```typescript
interface SetupWifiRequest {
  mode: 'ap' | 'station';
  ssid?: string;  // SSID, required for station mode
  psk?: string;   // Wi-Fi Protected Access Pre-Shared Key, required for station mode
  route_mode?: 'eth0_first' | 'wlan0_first' | 'usb0_first' | 'wlan0_usb0_auto_first';
}
```

Set route mode:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"mode": "xxx"}' \
  http://192.168.25.25:8090/services/set_route_mode
```

Parameters:
```typescript
interface RouteModeRequest {
  mode: 'eth0_first' | 'wlan0_first' | 'usb0_first' | 'wlan0_usb0_auto_first';
}
```

Route mode options:
- `eth0_first`: Put eth0 as the default route, if available
- `wlan0_first`: Put wlan0 as the default route, if available
- `usb0_first`: Put usb0 as the default route, if available
- `wlan0_usb0_auto_first`: Based on ping result. If wlan0 connects to Internet, use it as the default route. Otherwise, use wlan0

A static HTML page for WiFi setup is available at: `http://192.168.25.25:8090/wifi_setup`

### System Management
Wake up device:
```bash
curl -X POST http://192.168.25.25:8090/services/wake_up_device
```

Monitor WebSocket Sensor Manager State for sleep/awake/awakening state.

### Navigation Services
Start global positioning:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/start_global_positioning
```

Parameters:
```typescript
interface StartGlobalPositioningRequest {
  use_barcode?: boolean;        // default to true
  use_base_map_match?: boolean; // default to true
}
```

Enable auto-mapping (experimental feature):
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"enable": true}' \
  http://192.168.25.25:8090/services/enable_auto_mapping
```

Parameters:
```typescript
interface EnableAutoMappingRequest {
  enable: boolean;
}
```

### Camera Services
Calibrate depth cameras:
```bash
curl -X POST http://192.168.25.25:8090/services/calibrate_depth_cameras
```

**Note**: Before calling this service:
- The robot must be on flat ground
- The robot must be facing a corner of wall or big box

Get RGB image (since 2.8.0, requires `caps.supportsGetRgbImage`):
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"topic": "/rgb_cameras/front/compressed"}' \
  http://192.168.25.25:8090/services/get_rgb_image
```

### Cargo Services
Load/unload cargo with roller (since 2.9.0):
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/roller_load

curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/roller_unload
```

Start/stop rack size detection:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/start_rack_size_detection

curl -X POST \
  -H "Content-Type: application/json" \
  http://192.168.25.25:8090/services/stop_rack_size_detection
```

**WARNING**: Rather than using this service, it is more accurate to refer to the production manual (specification) of the rack or to simply measure it with a ruler. Only use this service as a last resort.

### Time Management
Check and correct time:
```bash
# Check time error
curl http://192.168.25.25:8090/services/step_time

# Correct time
curl -X POST http://192.168.25.25:8090/services/step_time
```

**WARNING**: Don't call the GET endpoint frequently. Use WebSocket `/alerts` instead to detect time errors.

### Utility Services
Get navigation thumbnail (since 2.8.0, requires `caps.supportsGetNavThumbnail`):
```json
{
  "stamp": 1707211001,
  "map_name": "Ground Floor",
  "map_uid": "xxxxx",
  "map_version": 3,
  "overlays_version": 8,
  "map": {
    "resolution": 0.05,
    "size": [200, 200],
    "origin": [12.12345, -3.12345],
    "data": "iVBORw0KGgoAAAANS..." // base64 encoded PNG
  }
}
```

Query pose:
```bash
curl http://192.168.25.25:8090/services/query_pose/charger_pose
curl http://192.168.25.25:8090/services/query_pose/pallet_pose
```

Example response:
```json
{
    "pose": {
        "pos": [4.179, -26.094],
        "ori": 3.18
    }
}
```

## Device Information API

### Device Information
Get detailed information about the device:

```bash
curl http://192.168.25.25:8090/device/info
```

Example response:
```json
{
  "rosversion": "1.15.11",
  "rosdistro": "noetic",
  "axbot_version": "1.9.x",  // The version of main package
  "device": {
    "model": "hygeia",       // device model: hygeia/waiter/hotel/tray/longtray etc.
    "sn": "71822043000350z", // SN. Unique for all devices
    "name": "71822043000350z" // Some prototype devices has a name
  },
  "baseboard": {
    "firmware_version": "22a32218"
  },
  "wheel_control": {
    "firmware_version": "amps_20211103"  // wheel firmware version
  },
  "bottom_sensor_pack": {
    "firmware_version": "1.1.1"
  },
  "depth_camera": {
    "firmware_version": "[/dev/camera:1.2.5-s2-ax-D1]"
  },
  "robot": {
    "footprint": [],
    "inscribed_radius": 0.248,
    "height": 1.2,
    "thickness": 0.546,
    "wheel_distance": 0.36,
    "width": 0.496,
    "charge_contact_position": "back"  // Position of the charge contact: "back" or "front"
  },
  "caps": {
    "supportsImuRecalibrateService": true,      // supports /services/imu/recalibrate
    "supportsShutdownService": true,            // supports /services/baseboard/shutdown
    "supportsRestartService": true,             // supports /services/restart_service
    "supportsResetOccupancyGridService": true,  // supports /services/occupancy_grid_server/reset
    "supportsImuRecalibrationFeedback": true,   // supports /imu_state WebSocket topic
    "supportsSetControlModeService": true,      // supports /services/wheel_control/set_control_mode
    "supportsSetEmergencyStopService": true,    // supports /services/wheel_control/set_emergency_stop
    "supportsWheelStateTopic": true,            // supports /wheel_state WebSocket topic
    "supportsWsV2": true,                       // supports ws://HOST/ws/v2/topics
    "supportsRgbCamera": true,                  // supports RGB related topics
    "combineImuBiasAndPoseCalibration": true    // Since 2.4.0. Combine bias and pose calibration
  }
}
```

Get brief device information:
```bash
curl http://192.168.25.25:8090/device/info/brief
```

### Network Information
Get available WiFi networks:
```bash
curl http://192.168.25.25:8090/device/available_wifis
```

Example response:
```json
[
  {
    "ssid": "AutoXing",
    "bss": "a4:fa:76:33:d3:62",
    "rssi": -45,
    "open": false  // since 2.3.0
  },
  {
    "ssid": "AutoXing-guest",
    "bss": "a4:fa:76:33:d3:72",
    "rssi": -33,
    "open": false  // since 2.3.0
  }
]
```

Get current WiFi information:
```bash
curl http://192.168.25.25:8090/device/wifi_info
```

Station mode response:
```json
{
  "wifi_mode": "station",
  "wpa_state": "completed",
  "route_mode": "eth0_first",
  "wifi_ip": "10.10.41.43",
  "wifi_mac": "e4:5f:01:6d:bd:6a",
  "ssid": "AutoXing",
  "debug_message": "info: Switching to station mode.",
  "routes": [
    "default via 192.168.25.2 dev eth0 src 192.168.25.25 metric 202 ",
    "default via 10.10.40.1 dev wlan0 proto dhcp metric 600 ",
    "10.10.40.0/23 dev wlan0 proto kernel scope link src 10.10.41.43 metric 600 ",
    "192.168.25.0/24 dev eth0 proto dhcp scope link src 192.168.25.25 metric 202 "
  ],
  "active_access_point": {
    "ssid": "AutoXing",
    "hw_address": "a4:fa:76:33:d3:70",
    "strength": 100
  },
  "last_wifi_connect_result": {}
}
```

AP mode response:
```json
{ "mode": "ap" }
```

### USB Devices
List all USB devices:
```bash
curl http://192.168.25.25:8090/device/usb_devices
```

Example response:
```json
[
  {
    "vendor_product": "1d6b:0001",
    "sn": "fe3a0000.usb",
    "alias": "USB 1.1 root hub",
    "description": "Linux Foundation 1.1 root hub",
    "bind": "",
    "bus_id": 8,
    "dev_id": 1,
    "port": 1,
    "full_port": "8",
    "level": 0,
    "devices": []
  }
]
```

Save USB device list:
```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -d '[...]' \
  http://192.168.25.25:8090/device/usb_devices/saved
```

Get saved USB devices:
```bash
curl http://192.168.25.25:8090/device/usb_devices/saved
```

Clear saved USB devices:
```bash
curl -X DELETE http://192.168.25.25:8090/device/usb_devices/saved
```

### Boot Progress
During the boot process, most APIs will return 503 (Service Unavailable). However, the boot progress API will always return 200:

```bash
curl http://192.168.25.25:8090/device/boot_progress
```

Example response:
```json
{
  "start_time": 1697777324.597,
  "progress": 0.21,
  "logs": [
    {
      "stamp": 1697777324.597,
      "progress": 0.0,
      "msg": "=== AutoXing Axbot Starting Up ==="
    },
    {
      "stamp": 1697777328.597,
      "progress": 0.2,
      "msg": "Loading remote params ..."
    },
    {
      "stamp": 1697777330.601,
      "progress": 0.21,
      "msg": "Starting lidar_node ..."
    }
  ]
}
```

### Time Configuration
The robot uses Chrony to manage time. Since version 2.7.1, you can control some configurations using the following APIs.

View Chrony configuration:
```bash
curl http://192.168.25.25:8090/device/chrony/chrony.conf
```

#### Time Sources
Get current time sources:
```bash
curl http://192.168.25.25:8090/device/chrony/sources
```

Example response:
```json
[
  "pool 2.debian.pool.ntp.org iburst",
  "pool 1.cn.pool.ntp.org iburst",
  "pool 2.cn.pool.ntp.org iburst",
  "pool 3.cn.pool.ntp.org iburst",
  "pool 0.cn.pool.ntp.org iburst",
  "server ntp1.autoxing.com iburst",
  "server ntp2.autoxing.com iburst"
]
```

Set time sources:
```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  --data '["pool 2.debian.pool.ntp.org iburst", "pool 0.cn.pool.ntp.org iburst"]' \
  http://192.168.25.25:8090/device/chrony/sources
```

Restore default time sources:
```bash
curl -X DELETE http://192.168.25.25:8090/device/chrony/sources
```

#### NTP Server
Enable NTP server for specific subnet:
```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  --data '["allow 192.168.2.0/24"]' \
  http://192.168.25.25:8090/device/chrony/allows
```

Get current allow rules:
```bash
curl http://192.168.25.25:8090/device/chrony/allows
```

Disable NTP server:
```bash
curl -X DELETE http://192.168.25.25:8090/device/chrony/allows
```

### Sensor List
Get list of all sensors and their main topics (since 2.12.0):
```bash
curl http://192.168.25.25:8090/device/sensors
```

Example response:
```json
{
  "depth_cameras": [
    {
      "name": "ihawk_upward",
      "depth_image_topic": "/depth_camera/downward/image"
    },
    {
      "name": "ihawk_downward",
      "depth_image_topic": "/depth_camera/backward/image"
    }
  ],
  "laser_scanners": [
    {
      "name": "lidar_node",
      "scan_topic": "/horizontal_laser_2d/matched"
    }
  ],
  "rgb_cameras": [
    {
      "name": "rgb_forward",
      "image_topic": "/rgb_cameras/front/compressed"
    }
  ]
}
```

## System Settings

### Overview
The system settings are organized into four JSON files (supported since 2.9.0):

1. `schema.json` (readonly) - Contains metadata of all settings, including names, types, ranges, descriptions, etc.
2. `default.json` (readonly) - Contains default values of all settings
3. `user.json` - Stores values modified by the user
4. `effective.json` (readonly) - Contains merged values by overlaying user.json over default.json

By design, only `user.json` is modifiable. When modified, `effective.json` is automatically updated. `schema.json` and `default.json` are constants related to the robot model.

### Schema
Get the schema of all settings:

```bash
curl http://192.168.25.25:8090/system/settings/schema
```

Example response:
```json
{
  "ax": [
    {
      "name": "robot.footprint",
      "title": "Robot: Footprint",
      "type": "Polygon",
      "default": [
        [0.248, 0.108],
        ["..."],
        [0.248, -0.108]
      ]
    },
    {
      "name": "control.auto_hold",
      "title": "Control: Auto Hold",
      "type": "bool",
      "default": true,
      "description": "When idle, the robot shall hold still"
    },
    {
      "name": "control.max_forward_velocity",
      "title": "Control: Max Forward Velocity",
      "type": "float",
      "default": 1.2,
      "range": "[0, 2.0]"
    },
    {
      "name": "control.max_backward_velocity",
      "title": "Control: Max Backward Velocity",
      "type": "float",
      "default": -0.2,
      "range": "[-0.3, 0]"
    },
    {
      "name": "control.max_forward_acc",
      "title": "Control: Max Forward Acc",
      "type": "float",
      "default": 0.5,
      "range": "[0, 0.8]"
    },
    {
      "name": "control.max_forward_decel",
      "title": "Control: Max Forward Decel",
      "type": "float",
      "default": -2.0,
      "range": "[-2.0, 0]"
    },
    {
      "name": "control.max_angular_velocity",
      "title": "Control: Max Angular Velocity",
      "type": "float",
      "default": 1.2,
      "range": "[0, 1.2]"
    },
    {
      "name": "control.acc_smoother.smooth_level",
      "title": "Control: Acc Smoother: Smooth Level",
      "type": "Enum",
      "default": "normal",
      "options": [
        "disabled",
        "lower",
        "normal",
        "higher"
      ]
    },
    {
      "name": "bump_based_speed_limit.enable",
      "title": "enable bump-based speed limit",
      "type": "bool",
      "default": true
    },
    {
      "name": "bump_based_speed_limit.bump_tolerance",
      "title": "Bump Based Speed Limit: Bump Tolerance",
      "type": "float",
      "default": 0.5,
      "range": "[0, 1.0]"
    }
  ]
}
```

### Default Settings
Get the default settings:

```bash
curl http://192.168.25.25:8090/system/settings/default
```

### User Settings
Get user settings:
```bash
curl http://192.168.25.25:8090/system/settings/user
```

Save user settings:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '...' \
  http://192.168.25.25:8090/system/settings/user
```

Partial update of user settings:
```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '...' \
  http://192.168.25.25:8090/system/settings/user
```

### Effective Settings
Get the effective settings (merged values):

```bash
curl http://192.168.25.25:8090/system/settings/effective
```

### Setting Options

#### rack.specs
The physical representation of a rack and how a robot should carry it:

```json
{
  "rack.specs": [
    {
      "width": 0.66,
      "depth": 0.7,

      // Some racks have extruded parts(handles, etc) outside 
      // the reams of the wheels.
      "margin": [0, 0, 0, 0], 

      "alignment": "center",  // center/back
      "alignment_margin_back": 0.02,

      // Some rack legs have a base plate, which is invisible to laser.
      // When crawling under the rack, the robot will avoid this extra area.
      "extra_leg_offset": 0.02, 

      // Since 2.10  square/round/other
      "leg_shape": "square", 

      // Since 2.10 the side size of a square leg, or the diameter of a round leg.
      "leg_size": 0.03, 

      // Since 2.10 some racks have rotational wheels, 
      // which are invisible to the robot lasers. 
      // Use this parameter to expand the footprint of the robot to avoid collision.
      "foot_radius": 0.05 
    }
  ]
}
```

Parameters:
- `width`, `depth`: The size of the rack
- `margin`: Some racks have extruded parts outside of rectangle formed by the legs
- `extra_leg_offset`: Some racks have inward extruded legs that can't be seen by lidar
- `cargo_to_jack_front_edge_min_distance`: When mounted, the distance between the front edge of the rack to the front edge of the jack panel

--- 

## App Store API

### Overview
The App Store API (available since 2.5.0) provides functionality for managing packages on the robot, including:
- Refreshing the app store
- Listing available packages
- Downloading and installing packages
- Managing download and installation tasks
- Viewing task logs

### Refresh App Store
Check the package index for new packages and available updates:

```bash
curl -X POST http://192.168.25.25:8090/app_store/services/refresh_store
```

### List Packages
Get a list of all packages and their update status:

```bash
curl -X GET http://192.168.25.25:8090/app_store/packages
```

Example response:
```json
[
  {
    "name": "ax",
    "latest_version": "2.4.1-pi64",
    "current_version": "2.4.1-pi64",
    "status": "up_to_date"
  },
  {
    "name": "iot",
    "latest_version": "1.0.5",
    "current_version": "1.0.4",
    "status": "downloading",
    "download_task_id": 3
  },
  {
    "name": "package_manager",
    "latest_version": "0.3.2",
    "current_version": "0.3.0",
    "status": "installing",
    "install_task_id": 4
  }
]
```

Package Status Types:
```typescript
type PackageStatus =
  | 'not_installed'
  | 'upgradable'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'up_to_date'
  | 'download_queueing'
  | 'install_queueing'
  | 'download_failed'
  | 'install_failed';

interface Package {
  name: string;
  latest_version: string;
  current_version: string;
  status: PackageStatus;
  download_task_id?: number;
  install_task_id?: number;
}
```

### Download Packages
Download packages before installation:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"packages": ["ax", "py_axbot"]}' \
  http://192.168.25.25:8090/app_store/services/download_packages
```

Response for failed requests (status code 400):
```json
{
  "iot": "installed version(master) is already up to date",
  "some_random_package": "invalid module some_random_package, skip..."
}
```

Response for successful requests (status code 201):
```json
{}
```

### Install Packages
Install downloaded packages:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"packages": ["ax", "py_axbot"]}' \
  http://192.168.25.25:8090/app_store/services/install_packages
```

Response for failed requests (status code 400):
```json
{
  "ax": "installed version(master-pi64) is higher than downloaded version(2.4.1-pi64), skip...",
  "iot": "installed version(master) is higher than downloaded version(1.0.5), skip..."
}
```

Response for successful requests (status code 201):
```json
{}
```

### Install Local Package
Install a package from a local file:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"filename": "/tmp/ax.2.6.4.pi64.tar.gz"}' \
  http://192.168.25.25:8090/app_store/services/install_local_file
```

Example response:
```json
{
  "module_name": "ax",
  "version": "2.6.4"
}
```

### Task Management
View download and installation tasks:

```bash
# View download tasks
curl http://192.168.25.25:8090/app_store/jobs/download/tasks

# View installation tasks
curl http://192.168.25.25:8090/app_store/jobs/install/tasks
```

Example response:
```json
[
  {
    "id": 4,
    "status": "succeeded",
    "module": "iot",
    "version": "1.0.5",
    "create_time": "2023-05-04 17:21:36",
    "start_time": "2023-05-04 17:21:47",
    "end_time": "2023-05-04 17:21:50",
    "url": "http://192.168.25.25:8090/app_store/jobs/download/tasks/4/log"
  },
  {
    "id": 3,
    "status": "succeeded",
    "module": "ax",
    "version": "2.4.1-pi64",
    "create_time": "2023-05-04 17:21:36",
    "start_time": "2023-05-04 17:21:36",
    "end_time": "2023-05-04 17:21:47",
    "url": "http://192.168.25.25:8090/app_store/jobs/download/tasks/3/log"
  }
]
```

Get task logs:
```bash
# Get complete log (if task is finished)
curl "http://192.168.25.25:8090/app_store/jobs/download/tasks/4/log"

# Get partial log (for real-time display)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"start": 0, "end": 1024}' \
  http://192.168.25.25:8090/app_store/jobs/download/tasks/4/log
```

Task Log Request Interface:
```typescript
interface TaskLogRequest {
  start?: number;  // Start character (optional)
  end?: number;    // End character, exclusive (optional)
}
```

Response Headers:
- `x-more-data`: `true` if log is incomplete, `false` otherwise
- `x-text-size`: Currently available characters of the whole file

---

## Host Name API

### Overview
The Host Name API provides functionality for managing local DNS entries, allowing you to:
- List available hostnames
- Add new hostname entries
- Get hostname information
- Delete hostname entries

### List Available Names
Get a list of all available hostnames:

```bash
curl http://192.168.25.25:8090/hostnames/
```

Example response:
```json
[
  {
    "hostname": "local.autoxing.com",
    "url": "http://192.168.25.25:8090/hostnames/local.autoxing.com"
  }
]
```

### Add Hostname
Add a new hostname entry:

```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.10.12"}' \
  http://192.168.25.25:8090/hostnames/local.autoxing.com
```

Success response:
```json
{
  "message": "192.168.10.12 local.autoxing.com added"
}
```

Error response (status code 400):
```json
{
  "message": "error: local2.autoxing.com is not allowed. It must be one of ['local.autoxing.com']"
}
```

### Get Hostname
Get information about a specific hostname:

```bash
curl http://192.168.25.25:8090/hostnames/local.autoxing.com
```

Success response:
```json
{
  "ip": "192.168.20.20"
}
```

Error response (status code 404):
```json
{
  "message": "error: local.autoxing.com not found"
}
```

### Delete Hostname
Delete a hostname entry:

```bash
curl -X DELETE http://192.168.25.25:8090/hostnames/local.autoxing.com
```

Success response:
```json
{
  "message": "error: Hostname local.autoxing.com deleted"
}
```

Error response (status code 404):
```json
{
  "message": "error: local.autoxing.com not found"
}
```

---

## Landmarks

### Overview
Since version 2.11.0, landmarks can be used to enhance robot positioning in environments where cargo positions change frequently. In typical stock areas where cargo is randomly placed, the only stable reference points are often the legs of stock shelves. Landmarks, made of reflective cohesive material, can be strategically placed to improve positioning accuracy.

### Deploying Landmarks
Guidelines for deploying landmarks:
1. Place landmarks on positions that will never change, such as:
   - Corners of walls
   - Legs of shelves
   - Other permanent structures
2. Maintain proper spacing:
   - Adjacent landmarks should be at least 1 meter apart
   - Recommended density: 10 to 50 meters between landmarks
3. Use pre-made reflective cylinders available from various online stores

### Collecting Landmarks
There are two methods to collect landmarks:

#### Method 1: During Mapping
1. Start a new mapping task
2. Begin the mapping process as usual
3. Optional: Monitor collected landmarks in real-time using the `/landmarks` WebSocket channel
4. Finish mapping
5. Access the final landmarks from the mapping result via `landmark_url`

#### Method 2: For Existing Maps
1. Use the "Collect Landmarks" service
2. Note: Collected landmarks serve as raw materials and must be imported into overlays
3. Save landmarks into overlays (see [Landmarks in Overlays](#landmarks))

### Using Landmarks
To utilize landmarks for positioning:
1. Start positioning with the map
2. Landmarks in the overlays will automatically enhance positioning
3. Optional: Monitor active landmarks through the `/constraint_list` WebSocket channel

---

## WebSocket Reference

### Overview
WebSocket topics are used to receive real-time information from the robot. Topics can be enabled or disabled using specific commands.

### Topic Management
Enable or disable topics using the following commands:

```json
{"enable_topic": "TOPIC_NAME"}
{"disable_topic": "TOPIC_NAME"}
```

Since version 2.7.0, multiple topics can be enabled/disabled simultaneously (requires `supportsEnableTopicList` capability):

```json
{"enable_topic": ["/actions", "/alerts", "/tracked_pose"]}
{"disable_topic": ["/actions", "/alerts", "/tracked_pose"]}
```

### Map Topics

#### Map
In pure-location mode, the `/map` topic contains the currently used map and only updates once. In mapping mode, the map is constantly updated at small intervals.

```json
{
  "topic": "/map",
  "resolution": 0.1,  // width/height of a single pixel, in meters
  "size": [182, 59],  // size of the image, in pixels
  "origin": [-8.1, -4.8],  // world coordinate of the lower left pixel
  "data": "iVBORw0KGgoAAAANSUhEUgAAALYAAAA7BAAAAA..."  // Base64 encoded PNG file
}
```

#### Obstacle Map
Shows sensed obstacles around the robot, including data from all sensors and virtual walls. Used for debugging to see through the robot's perspective.

```json
{
  "topic": "/maps/5cm/1hz",  // or '/maps/1cm/1hz'
  "resolution": 0.05,
  "size": [200, 200],
  "origin": [-2.8, -6.2],
  "data": "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICA..."  // base64 encoded PNG file
}
```

### Robot State Topics

#### Wheel State
```json
{
  "topic": "/wheel_state",
  "control_mode": "auto",  // auto/remote/manual
  "emergency_stop_pressed": true,
  "wheels_released": true  // optional, model-specific
}
```

#### Positioning State
```json
{
  "topic": "/slam/state",
  "state": "positioning",  // inactive/slam/positioning
  "reliable": true,
  "lidar_reliable": false,  // since 2.11.0-rc18
  "position_loss_progress": 0.35,  // since 2.11.0-rc18
  "position_quality": 10,  // 0-10 scale
  "lidar_matching_score": 0.545,
  "lidar_matched": true,
  "wheel_slipping": false,
  "inter_constraint_count": 27,
  "good_constraint_count": 27
}
```

#### Battery State
```json
{
  "topic": "/battery_state",
  "secs": 1653299708,
  "voltage": 26.3,
  "current": 3.6,
  "percentage": 0.64,
  "power_supply_status": "discharging"  // charging/discharging/full
}
```

#### Current Pose
```json
{
  "topic": "/tracked_pose",
  "pos": [3.7325, -10.8525],
  "ori": -1.56  // orientation in radians, X-axis positive is 0
}
```

### Sensor Topics

#### Vision Detected Objects
```json
{
  "topic": "/vision_detected_objects",
  "boxes": [
    {
      "pose": {"pos": [0.32, 0.97], "ori": 0.0},
      "dimensions": [0.0, 0.0, 0.0],
      "value": 0.8005573153495789,
      "label": 1  // VisualObjectLabel enum
    }
  ]
}
```

#### RGB Video Stream
```json
{
  "topic": "/rgb_cameras/front/video",
  "stamp": 1653303702.821,
  "data": "AAAAAWHCYADAAb5Bv4yqqseHIsjRwL5E4C4uX/CmRcXVaxddV3zf5uZO..."
}
```

### Control Topics

#### Planning State
```json
{
  "topic": "/planning_state",
  "map_uid": "xxxxxx",
  "action_id": 3354,
  "action_type": "enter_elevator",
  "move_state": "moving",
  "fail_reason": 0,
  "fail_reason_str": "none",
  "remaining_distance": 2.8750057220458984,
  "target_poses": [
    {
      "pos": [4.08, 2.99],
      "ori": 0
    }
  ],
  "stuck_state": "move_stucked",
  "in_elevator": true,
  "viewport_blocked": true,
  "is_waiting_for_dest": true,
  "docking_with_conveyer": true,
  "given_route_passed_point_count": 3
}
```

### Debug Topics

#### Alerts
```json
{
  "topic": "/alerts",
  "alerts": [
    {
      "code": 6004,
      "level": "error",
      "msg": "Kernel temperature is higher than 80!"
    }
  ]
}
```

#### Environment Match Map
```json
{
  "topic": "/env_match_map",
  "stamp": 1675326661.915,
  "resolution": 0.10000000149011612,
  "size": [579, 614],
  "origin": [-9.35, -34.75],
  "data": "iVBORw0KGgoAAAANSUhEUgAAAkM..."
}
```

For a complete list of all available topics and their formats, please refer to the full WebSocket Reference documentation.