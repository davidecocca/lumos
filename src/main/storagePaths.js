const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DATA_DIRECTORY = 'data';
const BACKUPS_DIRECTORY = 'backups';
const CACHE_DIRECTORY = 'cache';
const DATABASE_FILE = 'lumos.sqlite';
const IMAGE_DIRECTORY = 'note-images';

function getStorageRoot() {
    return app.getPath('userData');
}

function getDataPath() {
    return path.join(getStorageRoot(), DATA_DIRECTORY);
}

function getBackupPath() {
    return path.join(getStorageRoot(), BACKUPS_DIRECTORY);
}

function getCachePath() {
    return path.join(getStorageRoot(), CACHE_DIRECTORY);
}

function getDatabasePath() {
    return path.join(getDataPath(), DATABASE_FILE);
}

function getImagePath() {
    return path.join(getDataPath(), IMAGE_DIRECTORY);
}

function getVectorStorePath() {
    return path.join(getCachePath(), 'lancedb');
}

function getRestoreStatePath() {
    return path.join(getStorageRoot(), 'restore-state.json');
}

function initializeStorage() {
    fs.mkdirSync(getDataPath(), { recursive: true });
    fs.mkdirSync(getBackupPath(), { recursive: true });
    fs.mkdirSync(getCachePath(), { recursive: true });
}

module.exports = {
    getBackupPath,
    getDatabasePath,
    getDataPath,
    getImagePath,
    getRestoreStatePath,
    getStorageRoot,
    getVectorStorePath,
    initializeStorage,
};
