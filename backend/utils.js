// utils.js
// Utility functions for backend operations.

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const robotsFile = path.join(dataDir, 'robots.json');
const tasksFile = path.join(dataDir, 'tasks.json');
const mapsDir = path.join(dataDir, 'maps');

function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function listMaps() {
    return fs.readdirSync(mapsDir).filter(f => f.endsWith('.geojson'));
}

function readMap(filename) {
    const file = path.join(mapsDir, filename);
    return fs.readFileSync(file, 'utf8');
}

function writeMap(filename, geojson) {
    const file = path.join(mapsDir, filename);
    fs.writeFileSync(file, geojson, 'utf8');
}

module.exports = {
    readJSON,
    writeJSON,
    listMaps,
    readMap,
    writeMap,
    robotsFile,
    tasksFile
}; 