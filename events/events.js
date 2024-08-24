const patToken = localStorage.getItem('patData');
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

async function fetchLocations(patToken) {
    const response = await fetch(`https://api.smartthings.com/v1/locations`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    });
    const data = await response.json();
    const locationMap = {};
    data.items.forEach(location => {
        locationMap[location.locationId] = location.name;
    });
    return locationMap;
}

function listDevices() {
  if (patToken) {
    fetchLocations(patToken)
        .then(locationMap => {
            return fetch(`https://api.smartthings.com/v1/virtualdevices`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${patToken}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    const deviceList = document.getElementById("deviceList");
                    deviceList.innerHTML = '';

                    const devicesByLocation = {};
                    data.items.forEach(device => {
                        if (!devicesByLocation[device.locationId]) {
                            devicesByLocation[device.locationId] = [];
                        }
                        devicesByLocation[device.locationId].push(device);
                    });

                    Object.keys(devicesByLocation).sort().forEach(locationId => {
                        const group = devicesByLocation[locationId];
                        const locationName = locationMap[locationId] || locationId; // locationName이 없으면 locationId 사용
                        group.forEach(device => {
                            const option = document.createElement("option");
                            option.value = device.deviceId;
                            option.text = `[${locationName}] ${device.label}`;
                            deviceList.appendChild(option);
                        });
                    });

                    // 자동으로 첫 번째 디바이스의 capabilities를 로드
                    if (data.items.length > 0) {
                        fetchCurrentStatus();
                        showCapabilities();
                    }
                });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error fetching devices: ${error}`;
        });
  }
}

function showCapabilities() {
    const deviceId = document.getElementById("deviceList").value;
    fetch(`https://api.smartthings.com/v1/devices/${deviceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const capabilityList = document.getElementById("capabilityList");
            capabilityList.innerHTML = '';
            data.components.forEach(component => {
                component.capabilities.forEach(capability => {
                    const option = document.createElement("option");
                    option.value = `${component.id}:${capability.id}`;
                    option.text = `componentId: ${component.id} capabilityId: ${capability.id}`;
                    capabilityList.appendChild(option);
                });
            });
            showCapabilityDetails();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error fetching capabilities: ${error}`;
        });
}

function showCapabilityDetails() {
    const selectedCapability = document.getElementById("capabilityList").value;
    const [componentId, capabilityId] = selectedCapability.split(':');
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("capabilityDetails").textContent = JSON.stringify(data, null, 2);
            const attributes = data.attributes;
            fillEventPayload(componentId, capabilityId, attributes);
        })
        .catch(error => {
            document.getElementById("capabilityDetails").textContent = `Error fetching capability details: ${error}`;
        });
}

function fillEventPayload(componentId, capabilityId, attributes) {
    // Check if attributes object is not empty
    const attributeNames = Object.keys(attributes);
    const attributeDropdown = document.getElementById("attribute");
    attributeDropdown.innerHTML = ''; // clear previous options

    attributeNames.forEach(attributeName => {
        const option = document.createElement("option");
        option.value = attributeName;
        option.text = attributeName;
        attributeDropdown.appendChild(option);
    });

    // Set the first attribute as selected by default
    if (attributeNames.length > 0) {
        attributeDropdown.value = attributeNames[0];
    }

    document.getElementById("component").value = componentId;
    document.getElementById("capability").value = capabilityId;
}

function sendEvent() {
    const deviceId = document.getElementById("deviceList").value;
    const componentId = document.getElementById("component").value;
    const capabilityId = document.getElementById("capability").value;
    const attribute = document.getElementById("attribute").value;
    let value = document.getElementById("value").value;
    const unit = document.getElementById("unit").value;
    let data = document.getElementById("data").value;

    if (!componentId || !capabilityId || !attribute || !value) {
        document.getElementById("result").textContent = 'All fields must be filled out';
        return;
    }

    // Attempt to parse value and data as JSON
    try {
        value = JSON.parse(value);
    } catch (e) {
        // If parsing fails, use the value as a string
    }
    try {
        data = JSON.parse(data);
    } catch (e) {
        // If parsing fails, use the data as a string
    }

    const eventPayload = {
        "deviceEvents": [
            {
                "value": value,
                "component": componentId,
                "capability": capabilityId,
                "attribute": attribute,
                "unit": unit ? unit : null, // include only if unit is not empty
                "data": data ? data : null  // include only if data is not empty
            }
        ]
    };

    // Show request payload in result
    document.getElementById("result").textContent = `Request payload: ${JSON.stringify(eventPayload, null, 2)}`;

    fetch(`https://api.smartthings.com/v1/virtualdevices/${deviceId}/events`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("result").textContent += `\n\nResponse: ${JSON.stringify(data, null, 2)}`;
            return fetchCurrentStatus(deviceId, patToken); // Fetch the current status after sending the event
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error sending event: ${error}`;
        });
}

function fetchCurrentStatus() {
    const deviceId = document.getElementById("deviceList").value;

    fetch(`https://api.smartthings.com/v1/devices/${deviceId}/status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("currentStatus").textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById("currentStatus").textContent = `Error fetching current status: ${error}`;
        });
}

window.onload = function () {
    listDevices();
}