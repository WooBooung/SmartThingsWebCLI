const patToken = localStorage.getItem('patData');

function loadData() {
    // const patData = localStorage.getItem('patData');
    if (patToken !== null) {
      listProfiles();
      loadLocations();
      loadCapabilities();
      listCapabilities();
    }
}


/* dropdown */
async function loadLocations() {
    const patToken = localStorage.getItem('patData');
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

async function loadRooms() {
    const patToken = localStorage.getItem('patData');
    const locationId = document.getElementById('locationId').value;
    if (!locationId) return;

    try {
        const response = await fetch(`https://api.smartthings.com/v1/locations/${locationId}/rooms`, {
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
        const roomSelect = document.getElementById('roomId');
        roomSelect.innerHTML = '<option value="">Select Room</option>';
        data.items.forEach(room => {
            const option = document.createElement('option');
            option.value = room.roomId;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading rooms: ' + error.message;
    }
}

async function loadHubs() {
    const patToken = localStorage.getItem('patData');
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

async function loadDrivers() {
    const patToken = localStorage.getItem('patData');
    const hubId = document.getElementById('hubId').value;
    if (!hubId) return;

    try {
        const response = await fetch(`https://api.smartthings.com/v1/hubdevices/${hubId}/drivers`, {
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
        const driverSelect = document.getElementById('driverId');
        driverSelect.innerHTML = '<option value="">Select a installed driver</option>';
        data.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.driverId;
            option.textContent = driver.name;
            driverSelect.appendChild(option);
        });
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading drivers: ' + error.message;
    }
}

/* add */
                const deviceCategories = [
                    'AirConditioner', 'AirPurifier', 'AirQualityDetector', 'Battery', 'Blind', 'BluRayPlayer',
                    'BluetoothCarSpeaker', 'BluetoothTracker', 'Bridges', 'Button', 'Camera', 'Car', 'Charger',
                    'ClothingCareMachine', 'CoffeeMaker', 'ContactSensor', 'Cooktop', 'CubeRefrigerator',
                    'CurbPowerMeter', 'Dehumidifier', 'Dishwasher', 'Door', 'DoorBell', 'Dryer', 'Earbuds',
                    'ElectricVehicleCharger', 'Elevator', 'Fan', 'Feeder', 'FitnessMat', 'Flashlight', 'GarageDoor',
                    'GasValve', 'GasMeter', 'GenericSensor', 'HealthTracker', 'Heatedmattresspad', 'HomeTheater', 'Hub',
                    'Humidifier', 'HumiditySensor', 'IrRemote', 'Irrigation', 'KimchiRefrigerator', 'KitchenHood',
                    'LeakSensor', 'Light', 'LightSensor', 'MicroFiberFilter', 'Microwave', 'Mobile', 'MobilePresence',
                    'MotionSensor', 'MultiFunctionalSensor', 'NetworkAudio', 'Networking', 'Others', 'Oven', 'PresenceSensor',
                    'Printer', 'PrinterMultiFunction', 'Projector', 'Pump', 'Range', 'Receiver', 'Refrigerator', 'RemoteController',
                    'RiceCooker', 'RobotCleaner', 'ScaleToMeasureMassOfHumanBody', 'Scanner', 'SecurityPanel', 'SetTop',
                    'Shade', 'ShoesCareMachine', 'Siren', 'SmartLock', 'SmartPlug', 'SmokeDetector', 'SolarPanel', 'SoundSensor',
                    'SoundMachine', 'Speaker', 'StickVacuumCleaner', 'Storage', 'Stove', 'Switch', 'Television', 'TempSensor',
                    'Thermostat', 'Tracker', 'UPnPMediaRenderer', 'Vent', 'VisionSensor', 'VoiceAssistance', 'Washer', 'WaterHeater',
                    'WaterValve', 'WaterPurifier', 'WiFiRouter', 'Window', 'WineCellar'
                ];

                function createdeviceCategory() {
                    const select = document.getElementById('deviceCategory');
                    deviceCategories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        select.appendChild(option);
                    });
					
					 select.value = 'Switch';
                }


function createPrototype() {
    const executionTarget = document.getElementById('executionTarget').value || 'CLOUD';
    const prototypeSelect = document.getElementById('prototypeList');
	/* console log is commented out
    console.log("Execution Target:", executionTarget);
    console.log("Prototype Select before:", prototypeSelect.innerHTML);
	*/
	
    // Clear existing options
    prototypeSelect.innerHTML = '';

    const createOptionElement = (value, text) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        return opt;
    };

    if (executionTarget === 'LOCAL') {
        const localOptions = [
            { value: 'VIRTUAL_SWITCH', text: 'Switch' },
            { value: 'VIRTUAL_DIMMER_SWITCH', text: 'Dimmer Switch' }
        ];
        localOptions.forEach(option => {
            prototypeSelect.appendChild(createOptionElement(option.value, option.text));
        });
    } else {
        const cloudOptions = [
            { value: 'VIRTUAL_SWITCH', text: 'Switch' },
            { value: 'VIRTUAL_DIMMER_SWITCH', text: 'Dimmer Switch' },
            { value: 'VIRTUAL_BUTTON', text: 'Button' },
            { value: 'VIRTUAL_CAMERA', text: 'Camera' },
            { value: 'VIRTUAL_COLOR_BULB', text: 'Color Bulb' },
            { value: 'VIRTUAL_CONTACT_SENSOR', text: 'Contact Sensor' },
            { value: 'VIRTUAL_DIMMER', text: 'Dimmer (no switch)' },
            { value: 'VIRTUAL_GARAGE_DOOR_OPENER', text: 'Garage Door Opener' },
            { value: 'VIRTUAL_LOCK', text: 'Lock' },
            { value: 'VIRTUAL_METERED_SWITCH', text: 'Metered Switch' },
            { value: 'VIRTUAL_MOTION_SENSOR', text: 'Motion Sensor' },
            { value: 'VIRTUAL_MULTI_SENSOR', text: 'Multi-Sensor' },
            { value: 'VIRTUAL_PRESENCE_SENSOR', text: 'Presence Sensor' },
            { value: 'VIRTUAL_REFRIGERATOR', text: 'Refrigerator' },
            { value: 'VIRTUAL_RGBW_BULB', text: 'RGBW Bulb' },
            { value: 'VIRTUAL_SIREN', text: 'Siren' },
            { value: 'VIRTUAL_THERMOSTAT', text: 'Thermostat' }
        ];
        cloudOptions.forEach(option => {
            prototypeSelect.appendChild(createOptionElement(option.value, option.text));
        });
    }
	/* console log is commented out
    console.log("Prototype Select after:", prototypeSelect.innerHTML);
    */
}


function toggleHubDriverVisibility() {
    const executionTarget = document.getElementById('executionTarget').value;
    const localOptions = document.getElementById('localOptions');
    localOptions.style.display = executionTarget === 'LOCAL' ? 'block' : 'none';
}


function getProfile() {
    const profileId = document.getElementById("profileId").value;
    if (!profileId) {
        document.getElementById("result").textContent = 'Please enter Profile ID.';
        return;
    }
    fetch(`https://api.smartthings.com/v1/deviceprofiles/${profileId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
        })
        .then(data => {
            const jsonData = JSON.stringify(data, null, 2);
            document.getElementById("profileBody").value = jsonData;
            document.getElementById("result2").textContent = 'Profile retrieved successfully';
        })
        .catch(error => {
            document.getElementById("result2").textContent = `Error: ${error}`;
        });
}

function getProfileById() {
    const profileId = document.getElementById("profilesList").value;
    if (profileId) {
        document.getElementById("profileId").value = profileId;
        getProfile();
    }
}

function listProfiles() {
    if (!patToken) return;
    fetch('https://api.smartthings.com/v1/deviceprofiles', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const profilesList = document.getElementById("profilesList");
            profilesList.innerHTML = '<option value="">Select Profile</option>';
            if (data && data.items) {
                data.items.forEach(profile => {
                    const option = document.createElement("option");
                    option.value = profile.id;
                    option.textContent = profile.name;
                    profilesList.appendChild(option);
                });
            }
        })
        .catch(error => {
            document.getElementById("result2").textContent = `Error: ${error}`;
        });
}

document.getElementById('executionTarget').addEventListener('change', toggleHubDriverVisibility);
document.getElementById('locationId').addEventListener('change', loadRooms);
document.getElementById('executionTarget').addEventListener('change', createPrototype);
document.getElementById('roomId').addEventListener('change', loadHubs);
document.getElementById('hubId').addEventListener('change', loadDrivers);

document.getElementById('profilesList').addEventListener('change', getProfileById);
document.getElementById('profileId').addEventListener('change', getProfile);


/* end */

/* Delete Pat Input
document.getElementById('saveDataButton').addEventListener('click', saveData);
document.getElementById('loadDataButton').addEventListener('click', loadData);
document.getElementById('clearDataButton').addEventListener('click', clearData);
*/
