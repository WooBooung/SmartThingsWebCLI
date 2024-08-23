document.getElementById('prototype-tab').addEventListener('click', function() {
    showTab('#prototype');
});
async function createVirtualDeviceByProfile() {
    const deviceName = document.getElementById('deviceName').value;
    const locationId = document.getElementById('locationId').value;
    const roomId = document.getElementById('roomId').value;
    const hubId = document.getElementById('hubId').value;
    const driverId = document.getElementById('driverId').value;
    const deviceCategory = document.getElementById('deviceCategory').value;
    const capabilities = document.getElementById('customCapabilities').value.split('\n').map(cap => cap.trim()).filter(Boolean);
    const executionTarget = document.getElementById('executionTarget').value;

    if (!deviceName) {
        alert('Device Label을 입력해야 합니다.');
        return;
    }

    const payload = {
        name: deviceName,
        owner: {
            ownerId: locationId,
            ownerType: "LOCATION"
        },
        roomId: roomId,
        deviceProfile: {
            components: [
                {
                    capabilities: capabilities.map(cap => ({ id: cap, version: 1 })),
                    "categories": [
                        {
                            name: deviceCategory,
                            categoryType: "manufacturer"
                        }
                    ],
                    id: "main"
                }
            ]
        },
        executionTarget: executionTarget
    };

    if (executionTarget === 'LOCAL') {
        payload.hubId = hubId;
        payload.driverId = driverId;
    }

    try {
        const response = await fetch('https://api.smartthings.com/v1/virtualdevices', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload, null, 2)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${response.status} - ` + JSON.stringify(errorData, null, 2));
        }

        const data = await response.json();
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        document.getElementById('result').textContent = 'Error creating virtual device: ' + error.message + '\nRequested payload: ' + JSON.stringify(payload, null, 2);
    }
}

async function createVirtualDeviceByProfileId() {
    const deviceName = document.getElementById('deviceName').value;
    const locationId = document.getElementById('locationId').value;
    const roomId = document.getElementById('roomId').value;
    const hubId = document.getElementById('hubId').value;
    const driverId = document.getElementById('driverId').value;
    const profileId = document.getElementById('profileId').value;
    const executionTarget = document.getElementById('executionTarget').value;

    const payload = {
        name: deviceName,
        owner: {
            ownerId: locationId,
            ownerType: "LOCATION"
        },
        roomId: roomId,
        deviceProfileId: profileId,
        executionTarget: executionTarget
    };

    if (executionTarget === 'LOCAL') {
        payload.hubId = hubId;
        payload.driverId = driverId;
    }

    try {
        const response = await fetch('https://api.smartthings.com/v1/virtualdevices', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload, null, 2)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${response.status} - ` + JSON.stringify(errorData, null, 2));
        }

        const data = await response.json();
        document.getElementById('result2').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        document.getElementById('result2').textContent = 'Error creating virtual device: ' + error.message + '\nRequest payload: ' + JSON.stringify(payload, null, 2);
    }
}

async function createVirtualDeviceByPrototype() {
    const deviceName = document.getElementById('deviceName').value;
    const locationId = document.getElementById('locationId').value;
    const roomId = document.getElementById('roomId').value;
    const hubId = document.getElementById('hubId').value;
    const driverId = document.getElementById('driverId').value;
    const prototype = document.getElementById('prototypeList').value;
    const executionTarget = document.getElementById('executionTarget').value;

    const payload = {
        name: deviceName,
        owner: {
            ownerId: locationId,
            ownerType: "LOCATION"
        },
        roomId: roomId,
        prototype: prototype,
        executionTarget: executionTarget
    };

    if (executionTarget === 'LOCAL') {
        payload.hubId = hubId;
        payload.driverId = driverId;
    }

    try {
        const response = await fetch('https://api.smartthings.com/v1/virtualdevices/prototypes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload, null, 2)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${response.status} - ` + JSON.stringify(errorData, null, 2));
        }

        const data = await response.json();
        document.getElementById('result3').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        document.getElementById('result3').textContent = 'Error creating virtual device by prototype: ' + error.message + '\nRequested payload: ' + JSON.stringify(payload, null, 2);
    }
}

document.getElementById('createByPrototypeButton').addEventListener('click', createVirtualDeviceByPrototype);
document.getElementById('createByProfileIdButton').addEventListener('click', createVirtualDeviceByProfileId);
document.getElementById('createByProfileButton').addEventListener('click', createVirtualDeviceByProfile);
