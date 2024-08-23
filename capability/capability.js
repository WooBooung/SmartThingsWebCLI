const patToken = localStorage.getItem('patData');
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function createCapability() {
    const capabilityBody = document.getElementById("capabilityBody").value;
    let bodyData;
    let contentType = 'application/json';
    if (isJsonString(capabilityBody)) {
        bodyData = JSON.stringify(JSON.parse(capabilityBody), null, 2);
    } else {
        try {
            const yamlObject = jsyaml.load(capabilityBody);
            bodyData = JSON.stringify(yamlObject, null, 2);
        } catch (e) {
            document.getElementById("result").textContent = `YAML 파싱 오류: ${e}`;
            return;
        }
    }
    fetch('https://api.smartthings.com/v1/capabilities', {
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
            listCapabilities();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function updateCapability() {
    const capabilityId = document.getElementById("capabilityId").value;
    const capabilityBody = document.getElementById("capabilityBody").value;
    let bodyData;
    let contentType = 'application/json';
    if (isJsonString(capabilityBody)) {
        bodyData = JSON.stringify(JSON.parse(capabilityBody), null, 2);
    } else {
        try {
            const yamlObject = jsyaml.load(capabilityBody);
            bodyData = JSON.stringify(yamlObject, null, 2);
        } catch (e) {
            document.getElementById("result").textContent = `YAML 파싱 오류: ${e}`;
            return;
        }
    }
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1`, {
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
            listCapabilities();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function deleteCapability() {
    const capabilityId = document.getElementById("capabilityId").value;
    if (!capabilityId) {
        document.getElementById("result").textContent = 'Capability ID를 입력하세요.';
        return;
    }
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (response.ok) {
                document.getElementById("result").textContent = 'Capability 삭제 성공';
                listCapabilities();
            } else {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function getCapability() {
    const capabilityId = document.getElementById("capabilityId").value;
    if (!capabilityId) {
        document.getElementById("result").textContent = 'Capability ID를 입력하세요.';
        return;
    }
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1`, {
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
            document.getElementById("capabilityBody").value = jsonData;
            listLocales();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function listCapabilities() {
    capabilitiesList.innerHTML = '<option value="">Loading..</option>'
    if (!patToken) return;
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
            const standardCapabilities = data.items.map(capability => capability.id).sort();
            const standardCapabilitiesList = document.getElementById("standardCapabilitiesList");
            standardCapabilitiesList.innerHTML = '<option value="">Select a capability</option>';
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
        getCapability();
    }
}
function selectStandardCapability() {
    const capabilityId = document.getElementById("standardCapabilitiesList").value;
    if (capabilityId) {
        document.getElementById("capabilityId").value = capabilityId;
        getCapability();
    }
}
function listLocales() {
    const capabilityId = document.getElementById("capabilityId").value;
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1/i18n`, {
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
            const localesList = document.getElementById("localesList");
            localesList.innerHTML = '<option value="">Select a locale</option>';
            if (data && data.items) {
                data.items.forEach(locale => {
                    const option = document.createElement("option");
                    option.value = locale.tag;
                    option.textContent = locale.tag;
                    localesList.appendChild(option);
                });
            }
        })
        .catch(error => {
            document.getElementById("localeResult").textContent = `Error: ${error}`;
        });
}
function selectLocale() {
    const capabilityId = document.getElementById("capabilityId").value;
    const localeTag = document.getElementById("localesList").value;
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1/i18n/${localeTag}`, {
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
            document.getElementById("localeBody").value = jsonData;
            document.getElementById("locale").value = localeTag;
        })
        .catch(error => {
            document.getElementById("localeResult").textContent = `Error: ${error}`;
        });
}
function upsertLocale() {
    const capabilityId = document.getElementById("capabilityId").value;
    const localeBody = document.getElementById("localeBody").value;
    const localeTag = document.getElementById("locale").value;
    let bodyData;
    if (isJsonString(localeBody)) {
        bodyData = JSON.stringify(JSON.parse(localeBody), null, 2);
    } else {
        try {
            const yamlObject = jsyaml.load(localeBody);
            bodyData = JSON.stringify(yamlObject, null, 2);
        } catch (e) {
            document.getElementById("localeResult").textContent = `YAML 파싱 오류: ${e}`;
            return;
        }
    }
    fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1/i18n`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        },
        body: bodyData
    })
        .then(response => {
            if (response.ok) {
                listLocales();
                return response.json();
            } else {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
        })
        .then(data => {
            document.getElementById("localeResult").textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            if (error.message.includes('Localization already exists')) {
                fetch(`https://api.smartthings.com/v1/capabilities/${capabilityId}/1/i18n/${localeTag}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${patToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: bodyData
                })
                    .then(response => {
                        if (response.ok) {
                            listLocales();
                            return response.json();
                        } else {
                            return response.json().then(data => {
                                throw new Error(JSON.stringify(data));
                            });
                        }
                    })
                    .then(data => {
                        document.getElementById("localeResult").textContent = JSON.stringify(data, null, 2);
                    })
                    .catch(postError => {
                        document.getElementById("localeResult").textContent = `Error: ${postError}`;
                    });
            } else {
                document.getElementById("localeResult").textContent = `Error: ${error}`;
            }
        });
}

window.onload = function () {
    listCapabilities();
}