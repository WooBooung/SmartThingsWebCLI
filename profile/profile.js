const patToken = localStorage.getItem('patData');
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
function createProfile() {
    const profileBody = document.getElementById("profileBody").value;
    let bodyData;
    let contentType = 'application/json';
    if (isJsonString(profileBody)) {
        bodyData = JSON.stringify(JSON.parse(profileBody), null, 2);
    } else {
        try {
            const yamlObject = jsyaml.load(profileBody);
            bodyData = JSON.stringify(yamlObject, null, 2);
        } catch (e) {
            document.getElementById("result").textContent = `YAML parsing error: ${e}`;
            return;
        }
    }
    fetch(`https://api.smartthings.com/v1/deviceprofiles`, {
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
            listProfiles();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function updateProfile() {
    const profileId = document.getElementById("profileId").value;
    const profileBody = document.getElementById("profileBody").value;
    let bodyData;
    let contentType = 'application/json';
    if (isJsonString(profileBody)) {
        bodyData = JSON.stringify(JSON.parse(profileBody), null, 2);
    } else {
        try {
            const yamlObject = jsyaml.load(profileBody);
            bodyData = JSON.stringify(yamlObject, null, 2);
        } catch (e) {
            document.getElementById("result").textContent = `YAML parsing error: ${e}`;
            return;
        }
    }
    fetch(`https://api.smartthings.com/v1/deviceprofiles/${profileId}`, {
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
            listProfiles();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function retrieveProfile() {
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
            document.getElementById("result").textContent = 'Profile retrieved successfully';
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
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
            profilesList.innerHTML = '';
            if (data && data.items) {
                data.items.forEach(profile => {
                    const itemDiv = document.createElement("div");
                    itemDiv.className = "profile-item";
                    itemDiv.textContent = `${profile.name}`;
                    itemDiv.onclick = function () {
                        document.getElementById("profileId").value = profile.id;
                        retrieveProfile();
                    };
                    profilesList.appendChild(itemDiv);
                });
            }
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function publishProfile() {
    const profileId = document.getElementById("profileId").value;
    fetch(`https://api.smartthings.com/v1/deviceprofiles/${profileId}/status`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "deviceProfileStatus": "PUBLISHED" })
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("profileBody").value = JSON.stringify(data, null, 2);
            document.getElementById("result").textContent = 'Profile published successfully';
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error: ${error}`;
        });
}
function deleteProfile() {
    const profileId = document.getElementById("profileId").value;
    fetch(`https://api.smartthings.com/v1/deviceprofiles/${profileId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (response.ok) {
                document.getElementById("result").textContent = 'Profile deleted successfully';
                document.getElementById("profileId").value = '';
                document.getElementById("profileBody").value = '';
                listProfiles();
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
window.onload = function () {
    listProfiles();
}