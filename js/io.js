/**
 *
 * @licstart
 *
 * Copyright (C) 2017  AlephObjects, Inc.
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU Affero
 * General Public License (GNU AGPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU AGPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 *
 */

class ProgressTracker {
    constructor(totalAssets) {
        this.assets = [];
        this.totalAssets = totalAssets;
    }

    newAsset() {
        var asset = {progress: 0.0};
        this.assets.push(asset);
        return asset;
    }

    setProgress(asset, loaded, total) {
        var value = loaded/total * 100
        if(!Number.isNaN(value)) {
            asset.progress = value;
        }
    }

    get totalProgress() {
        var totalProgress = 0;
        for(var i = 0; i < this.assets.length; i++) {
            totalProgress += this.assets[i].progress;
        }
        return Math.round(totalProgress / this.totalAssets);
    }
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

var fileCache = new Map();
var downloadProgress = new ProgressTracker(18);

/* The iPhone generates an error if any load action
 * takes too long. To avoid this, we serialize
 * operations and use setTimeouts to break up the
 * load sequence into smaller chucks */
var downloadQueue    = [];
var pendingDownload  = false;

function enqueueDownload(url, successCallback, errorCallback) {
    downloadQueue.push([url, successCallback, errorCallback]);
}

function dequeueDownload() {
    var q = downloadQueue.pop();
    if(q) {
        setTimeout(loadUrl(q[0],q[1],q[2]), 50);
    }
}

function clearFileCache() {
    console.log("Clearing file cache");
    fileCache.clear();
}

function chunkedInflate(data, callback) {
    var asset = downloadProgress.newAsset();
    const chunkSize = 65536;
    var inflator = new pako.Inflate({to: "string"});
    function inflateHelper(index) {
        var start = index * chunkSize;
        var end   = start + chunkSize;
        var last  = end >= data.byteLength;
        downloadProgress.setProgress(asset, start, data.byteLength);
        inflator.push(data.slice(start, end), last);
        if(!last) {
            setTimeout(inflateHelper.bind(this,index+1),50);
        } else {
            downloadProgress.setProgress(asset, data.byteLength, data.byteLength);
            callback(inflator.result);
        }
    }
    inflateHelper(0);
}

function loadUrl(url, successCallback, errorCallback) {
    if(pendingDownload) {
        enqueueDownload(url, successCallback, errorCallback);
        return;
    }
    var asset = downloadProgress.newAsset();
    if(fileCache.has(url)) {
        console.log("Loading", url, "from cache");
        downloadProgress.setProgress(asset, 100, 100);
        setTimeout(() => {
            successCallback(fileCache.get(url));
            dequeueDownload();
        }, 50);
        return;
    } else {
        console.log("Loading", url);
    }
    var inflate = endsWith(url,".gz");
    try {
        pendingDownload = true;
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        if(inflate) {
            request.responseType = "arraybuffer";
        } else {
            request.overrideMimeType("text/plain");
        }
        request.onload =() => {
            if (request.status >= 200 && request.status < 400) {
                function dataConsumer(data) {
                    fileCache.set(url, data);
                    successCallback(data);
                    pendingDownload = false;
                    dequeueDownload();
                }
                setTimeout(() => {
                    var data;
                    if(inflate) {
                        dataConsumer(pako.inflate(request.response, {to: "string"}));
                        //chunkedInflate(request.response, dataConsumer);
                    } else {
                        dataConsumer(request.responseText);
                    }
                }, 50);
            } else {
                if(errorCallback) {
                    errorCallback(request.status, request.statusText, request);
                }
            }
        }
        request.onerror = function() {
            if(errorCallback) {
                errorCallback(request.status, request.statusText, request);
            }
        }
        request.onprogress = function(event) {
            downloadProgress.setProgress(asset, event.loaded, event.total);
        }
        request.send();
    } catch(e) {
        console.log("Failed to load " + url + ": " + e.toString());
    }
}

function loadObjModel(url, successCallback, errorCallback) {
    if(!this.loader) {
        this.loader  = new THREE.OBJLoader();
    }
    loadUrl(url, (data) => {successCallback(this.loader.parse(data))});
}