let deviceCount = 1;
let devicesMap = {}; // Stores the deviceId by device name
const patToken = localStorage.getItem('patData');

// Add placeholder option
const placeholderOption = document.createElement('option');
placeholderOption.value = "";
placeholderOption.text = "Select a speaker to receive the message";
placeholderOption.disabled = true;
placeholderOption.selected = true;


// Initialize the device list with API data
async function initializeDeviceList() {
    try {
        const response = await fetch("https://api.smartthings.com/v1/devices?capability=audioNotification", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + patToken
            }
        });

        if (!response.ok) {
            throw new Error("Network response was not ok.");
        }

        const data = await response.json();
        devicesMap = {};

        // Clear existing options
        const selectElements = document.querySelectorAll('select');
        selectElements.forEach(select => {
            select.innerHTML = '';
            select.add(placeholderOption);
            // Populate devicesMap and add options to the select element
            data.items.forEach(item => {
                devicesMap[item.name] = item.deviceId;
                const option = document.createElement('option');
                option.text = item.name;
                option.value = item.deviceId;
                select.add(option);
            });
        });

    } catch (error) {
        console.error("Error fetching device list:", error);
    }
}

function addDevice() {
    deviceCount++;
    const deviceListContainer = document.getElementById('deviceListContainer');

    const deviceDiv = document.createElement('div');
    deviceDiv.classList.add('input-group', 'mb-2');
    deviceDiv.innerHTML = `
        <select id="deviceList${deviceCount}" class="form-control" onchange="selectDevice(this)"></select>
    `;

    const appendDiv = document.createElement('div');
    appendDiv.classList.add('input-group-append');
    appendDiv.innerHTML = `
        <button class="btn btn-secondary" type="button" onclick="removeDevice(this)">-</button>
    `;

    deviceDiv.appendChild(appendDiv);
    deviceListContainer.appendChild(deviceDiv);

    // Add default options to the new select element
    const newSelect = deviceDiv.querySelector('select');
    addDefaultOptions(newSelect);
}

function removeDevice(button) {
    const deviceDiv = button.closest('.input-group');
    deviceDiv.remove();
    deviceCount--;
}

function addDefaultOptions(selectElement) {
    // Clear existing options
    selectElement.innerHTML = '';
    selectElement.add(placeholderOption);
    // Add new options from the devicesMap
    for (const [name, id] of Object.entries(devicesMap)) {
        const option = document.createElement('option');
        option.text = name;
        option.value = id;
        selectElement.add(option);
    }
}

async function sendMsg() {
    const devices = [];
    const sendText = document.getElementById('message');
    document.getElementById("result").textContent = `요청시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
    for (let i = 1; i <= deviceCount; i++) {
        const selectElement = document.getElementById(`deviceList${i}`);
        if (selectElement) {
            console.log('YJ_TEST: ', selectElement.value);
            devices.push({
                id: selectElement.id,
                value: selectElement.value
            });
          
            const response = await fetch("https://api.smartthings.com/v1/devices/" + selectElement.value + "/commands", {
                    method: "POST",  // 메서드를 GET에서 POST로 변경
                    headers: {
                        "Authorization": "Bearer " + patToken,
                        "Content-Type": "application/json"  // 본문이 JSON임을 명시
                    },
                    body: JSON.stringify({
                        "commands":[
                            {"component":"main",
                             "capability":"speechSynthesis",
                             "command":"speak",
                             "arguments": [sendText.value]
                             }
                        ]
                    })
                });
            
            
            const responseData = await response.json();
            if (response) {
                document.getElementById("result").textContent += `\n\n${i} 번째 TTS요청 결과: ` + JSON.stringify(responseData, null, 2);
            }
            
        }
        
    }
    const message = document.getElementById('message').value;
    console.log('Devices:', devices);
    console.log('Message:', message);
}

// Initialize with one device select and populate the list
initializeDeviceList();