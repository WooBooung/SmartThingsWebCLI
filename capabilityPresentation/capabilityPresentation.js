const patToken = localStorage.getItem('patData');

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
function validatePresentationBody(presentationBody, capabilityId, capabilityVersion) {
    let bodyData;
    if (isJsonString(presentationBody)) {
        bodyData = JSON.parse(presentationBody);
    } else {
        try {
            bodyData = jsyaml.load(presentationBody);
        } catch (e) {
            document.getElementById("result").textContent = `YAML 파싱 오류: ${e}`;
            return false;
        }
    }
    if (bodyData.id !== capabilityId || bodyData.version != capabilityVersion) {
        alert('Capability ID 및 Version이 일치하지 않습니다. 확인 후 다시 시도하세요.');
        return false;
    }
    return true;
}
function createPresentation() {
    const capabilityId = document.getElementById("capabilityId").value;
    const capabilityVersion = document.getElementById("capabilityVersion").value;
    const presentationBody = document.getElementById("presentationBody").value;

    if (!validatePresentationBody(presentationBody, capabilityId, capabilityVersion)) {
        return;
    }

    let bodyData = JSON.stringify(JSON.parse(presentationBody), null, 2);
    let contentType = 'application/json';

    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/${capabilityVersion}/presentation`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': contentType
        },
        body: bodyData
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
            listPresentations();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function updatePresentation() {
    const capabilityId = document.getElementById("capabilityId").value;
    const capabilityVersion = document.getElementById("capabilityVersion").value;
    const presentationBody = document.getElementById("presentationBody").value;

    if (!validatePresentationBody(presentationBody, capabilityId, capabilityVersion)) {
        return;
    }

    let bodyData = JSON.stringify(JSON.parse(presentationBody), null, 2);
    let contentType = 'application/json';

    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/${capabilityVersion}/presentation`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': contentType
        },
        body: bodyData
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
            listPresentations();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function getPresentation() {
    const capabilityId = document.getElementById("capabilityId").value;
    const capabilityVersion = document.getElementById("capabilityVersion").value;
    if (!capabilityId || !capabilityVersion) {
        document.getElementById("result").textContent = 'Capability ID와 Version을 입력하세요.';
        return;
    }
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/${capabilityVersion}/presentation`, {
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
            document.getElementById("presentationBody").value = jsonData;
            document.getElementById("result").textContent = 'Presentation 조회 성공';
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function listPresentations() {
    if (!patToken) return;
    capabilitiesList.innerHTML = '<option value="">Loading ...</option>';
    fetch('https://api.smartthings.com/v1/capabilities/namespaces', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (!data) {
                throw new Error('Invalid response structure: ' + JSON.stringify(data));
            }
            const namespaces = data.filter(item => item.ownerType === "organization").map(item => item.name);
            return Promise.all(namespaces.map(namespace => {
                return fetch(`https://api.smartthings.com/v1/capabilities/namespaces/${namespace}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${patToken}`
                    }
                }).then(response => response.json());
            }));
        })
        .then(results => {
            const capabilities = [];
            results.forEach(namespaceData => {
                if (namespaceData && namespaceData.items) {
                    namespaceData.items.forEach(capability => {
                        capabilities.push(capability.id);
                    });
                }
            });
            capabilities.sort();
            const capabilitiesList = document.getElementById("capabilitiesList");
            capabilitiesList.innerHTML = '<option value="">Select a capability</option>';
            capabilities.forEach(capabilityId => {
                const option = document.createElement("option");
                option.value = capabilityId;
                option.textContent = capabilityId;
                capabilitiesList.appendChild(option);
            });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });

    // Fetch standard capabilities
    fetch('https://api.smartthings.com/v1/capabilities', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (!data) {
                throw new Error('Invalid response structure: ' + JSON.stringify(data));
            }
            const standardCapabilitiesList = document.getElementById("standardCapabilitiesList");
            standardCapabilitiesList.innerHTML = '<option value="">Select a capability</option>';
            const standardCapabilities = data.items.map(capability => capability.id).sort();
            standardCapabilities.forEach(capabilityId => {
                const option = document.createElement("option");
                option.value = capabilityId;
                option.textContent = capabilityId;
                standardCapabilitiesList.appendChild(option);
            });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function selectCapability() {
    const capabilityId = document.getElementById("capabilitiesList").value;
    if (capabilityId) {
        document.getElementById("capabilityId").value = capabilityId;
        getPresentation();
    }
}
function selectStandardCapability() {
    const capabilityId = document.getElementById("standardCapabilitiesList").value;
    if (capabilityId) {
        document.getElementById("capabilityId").value = capabilityId;
        getPresentation();
    }
}

window.onload = function () {
    if(patToken){
        listPresentations();
    }
}