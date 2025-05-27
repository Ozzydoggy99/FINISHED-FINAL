class CoordinateConverter {
    static pixelToWorld(pixel, mapData) {
        return {
            x: (pixel.x * mapData.resolution) + mapData.origin[0],
            y: (pixel.y * mapData.resolution) + mapData.origin[1]
        };
    }

    static worldToPixel(world, mapData) {
        return {
            x: Math.round((world.x - mapData.origin[0]) / mapData.resolution),
            y: Math.round((world.y - mapData.origin[1]) / mapData.resolution)
        };
    }

    static validateCoordinates(coordinates, mapData) {
        const pixel = this.worldToPixel(coordinates, mapData);
        return (
            pixel.x >= 0 && 
            pixel.x < mapData.size[0] && 
            pixel.y >= 0 && 
            pixel.y < mapData.size[1]
        );
    }

    static calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );
    }

    static calculateAngle(point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    }
}

module.exports = CoordinateConverter; 