const patToken = localStorage.getItem('patData');
async function loadLocations() {
    try {
        const response = await fetch('https://api.smartthings.com/v1/locations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const locationSelect = document.getElementById('locationId');
        locationSelect.innerHTML = '<option value="">Select Location</option>';
        data.items.forEach(location => {
            const option = document.createElement('option');
            option.value = location.locationId;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        });
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading locations: ' + error.message;
    }
}

async function loadHubs() {
    const locationId = document.getElementById('locationId').value;
    if (!locationId) return;

    try {
        const response = await fetch(`https://api.smartthings.com/v1/devices?locationId=${locationId}&type=HUB`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const hubSelect = document.getElementById('hubId');
        hubSelect.innerHTML = '<option value="">Select Hub</option>';
        data.items.forEach(hub => {
            const option = document.createElement('option');
            option.value = hub.deviceId;
            option.textContent = hub.label;
            hubSelect.appendChild(option);
        });
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading hubs: ' + error.message;
    }
}

async function fetchDeviceDetails(deviceId, patToken) {
    const response = await fetch(`https://api.smartthings.com/v1/devices/${deviceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
}

async function listUnusedDrivers() {
    const hubId = document.getElementById('hubId').value;
    if (!hubId) return;

    try {
        // Fetch installed drivers on the hub
        const installedDriversResponse = await fetch(`https://api.smartthings.com/v1/hubdevices/${hubId}/drivers`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!installedDriversResponse.ok) {
            throw new Error('Network response was not ok');
        }

        const installedDrivers = await installedDriversResponse.json();
        const installedDriverMap = new Map(installedDrivers.map(driver => [driver.driverId, driver.name]));
        const installedDriverIds = new Set(installedDriverMap.keys());

        // Fetch devices in the location
        const locationId = document.getElementById('locationId').value;
        const devicesResponse = await fetch(`https://api.smartthings.com/v1/devices?locationId=${locationId}&type=LAN&type=MATTER&type=ZIGBEE&type=ZWAVE`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!devicesResponse.ok) {
            throw new Error('Network response was not ok');
        }

        const devices = await devicesResponse.json();
        const usedDriverIds = new Set();

        // Recursive function to find driverId in the device details
        function findDriverId(obj) {
            if (typeof obj !== 'object' || obj === null) {
                return;
            }
            if (obj.hasOwnProperty('driverId')) {
                usedDriverIds.add(obj.driverId);
            }
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    findDriverId(obj[key]);
                }
            }
        }

        for (const device of devices.items) {
            findDriverId(device);
        }

        // Find unused drivers
        const unusedDrivers = [...installedDriverIds].filter(driverId => !usedDriverIds.has(driverId));

        // Print installedDriverIds for debugging
        console.log('Installed Driver IDs:', installedDriverIds);
        console.log('Used Driver IDs:', usedDriverIds);
        console.log('Unused Drivers:', unusedDrivers);

        // Display unused drivers
        const unusedDriversSelect = document.getElementById('unusedDrivers');
        unusedDriversSelect.innerHTML = '';
        unusedDrivers.forEach(driverId => {
            const option = document.createElement('option');
            option.value = driverId;
            option.textContent = installedDriverMap.get(driverId); // Show driver name
            unusedDriversSelect.appendChild(option);
        });

        // Display current drivers on hub
        const currentDriversPre = document.getElementById('currentDrivers');
        currentDriversPre.textContent = JSON.stringify(installedDrivers, null, 2);
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading unused drivers: ' + error.message;
    }
}

async function deleteUnusedDriver() {
    const hubId = document.getElementById('hubId').value;
    const unusedDriversSelect = document.getElementById('unusedDrivers');
    const driverId = unusedDriversSelect.value;

    if (!driverId) {
        alert("Please select a driver to delete.");
        return;
    }

    try {
        const response = await fetch(`https://api.smartthings.com/hubdevices/${hubId}/drivers/${driverId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${response.status} - ` + JSON.stringify(errorData, null, 2));
        }

        document.getElementById('result').textContent = `Driver ${driverId} deleted successfully.`;
        listUnusedDrivers();
    } catch (error) {
        document.getElementById('result').textContent = 'Error deleting unused driver: ' + error.message;
    }
}

async function listDrivers() {
    fetch(`https://api.smartthings.com/v1/drivers`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const driverDropdown = document.getElementById("driverDropdown");
            driverDropdown.innerHTML = '<option value="">Select a driver</option>';
            data.items.forEach(driver => {
                const option = document.createElement("option");
                option.value = driver.driverId;
                option.text = `${driver.name} version: ${driver.version}`;
                option.setAttribute('data-version', driver.version);
                driverDropdown.appendChild(option);
            });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error fetching drivers: ${error}`;
        });
}

function showDriverDetails(driverId) {
    fetch(`https://api.smartthings.com/v1/drivers/${driverId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("driverDetails").textContent = JSON.stringify(data, null, 2);
            document.getElementById("deleteDriverBtn").style.display = 'inline';
            document.getElementById("deleteDriverBtn").setAttribute('data-driver-id', driverId);
            document.getElementById("assignDriverBtn").style.display = 'inline';
        })
        .catch(error => {
            document.getElementById("driverDetails").textContent = `Error fetching driver details: ${error}`;
        });
}

function deleteDriver() {
    const driverId = document.getElementById("deleteDriverBtn").getAttribute('data-driver-id');
    fetch(`https://api.smartthings.com/v1/drivers/${driverId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (response.ok) {
                document.getElementById("result").textContent = `Driver ${driverId} deleted successfully.`;
                document.getElementById("driverDetails").textContent = '';
                document.getElementById("deleteDriverBtn").style.display = 'none';
                listDrivers();
            } else {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error deleting driver: ${error}`;
        });
}

function uploadDriverPackage() {
    const fileInput = document.getElementById("driverPackage");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a zip file to upload.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;

        fetch(`https://api.smartthings.com/v1/drivers/package`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/zip'
            },
            body: arrayBuffer
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById("result").textContent = JSON.stringify(data, null, 2);
                listDrivers();
            })
            .catch(error => {
                document.getElementById("result").textContent = `Error uploading driver package: ${error}`;
            });
    };

    reader.onerror = function () {
        alert("Failed to read file.");
    };

    reader.readAsArrayBuffer(file);
}

function listChannels() {
    fetch(`https://api.smartthings.com/v1/distchannels`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const channelDropdown = document.getElementById("channelDropdown");
            channelDropdown.innerHTML = '<option value="">Select a channel</option>';
            data.items.forEach(channel => {
                const option = document.createElement("option");
                option.value = channel.channelId;
                option.text = channel.name;
                channelDropdown.appendChild(option);
            });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error fetching channels: ${error}`;
        });
}

function assignDriverToChannel() {
    const channelId = document.getElementById("channelDropdown").value;
    const driverDropdown = document.getElementById("driverDropdown");
    const selectedDriver = driverDropdown.options[driverDropdown.selectedIndex];
    const driverId = selectedDriver.value;
    const version = selectedDriver.getAttribute('data-version');

    const payload = {
        "driverId": driverId,
        "version": version
    };

    fetch(`https://api.smartthings.com/v1/distchannels/${channelId}/drivers`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error assigning driver to channel: ${error.message}`;
        });
}

window.onload = function () {
        listDrivers();
        listChannels();
        loadLocations();
}