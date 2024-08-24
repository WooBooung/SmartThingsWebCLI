const patToken = localStorage.getItem('patData');

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function createConfiguration() {
    const configurationBody = document.getElementById("configurationBody").value;
    let bodyData;
    let contentType = 'application/json';
    if (isJsonString(configurationBody)) {
        bodyData = JSON.stringify(JSON.parse(configurationBody), null, 2);
    } else {
        try {
            const yamlObject = jsyaml.load(configurationBody);
            bodyData = JSON.stringify(yamlObject, null, 2);
        } catch (e) {
            document.getElementById("result").textContent = `YAML parsing error: ${e}`;
            return;
        }
    }
    fetch(`https://api.smartthings.com/v1/presentation/deviceconfig`, {
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
        })
        .catch(error => {
            document.getElementById("result").textContent = `${error}`;
        });
}

function getConfiguration() {
    const presentationId = document.getElementById("presentationId").value;
    const manufacturerName = document.getElementById("manufacturerName").value;
    if (!presentationId) {
        document.getElementById("result").textContent = 'Please enter Presentation ID';
        return;
    }

    let url = `https://api.smartthings.com/v1/presentation/deviceconfig?presentationId=${presentationId}`;
    if (manufacturerName) {
        url += `&manufacturerName=${manufacturerName}`;
    }

    fetch(url, {
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
            document.getElementById("configurationBody").value = jsonData;
            document.getElementById("result").textContent = 'Configuration retrieved successfully';
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}

window.onload = function () {
    if(patToken){
        getConfiguration();
    }
}