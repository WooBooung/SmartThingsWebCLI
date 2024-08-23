const patToken = localStorage.getItem('patData');

document.addEventListener("DOMContentLoaded", function () {
    const channelTab = document.getElementById('channel-tab');
    const inviteTab = document.getElementById('invite-tab');
    const channelDropdown = document.getElementById('channelDropdown');
    let checkInviteTab = false;

    listChannels();
    listDrivers();
    document.getElementById('invitediv').style.display = 'none'; 
    document.getElementById("assigndiv").style.display = 'none';

    // Event listener for Invite tab
    inviteTab.addEventListener('click', function() {
        checkInviteTab = true;
        document.getElementById('channeldiv').style.display = 'none';
        document.getElementById('invitediv').style.display = 'block'; 
        document.getElementById("assigndiv").style.display = 'none';
    });

    // Event listener for mobile Invite tab
    document.getElementById('m-invite-tab').addEventListener('click', function() {
        checkInviteTab = true;
        document.getElementById('channeldiv').style.display = 'none'; 
        document.getElementById('invitediv').style.display = 'block';
        document.getElementById("assigndiv").style.display = 'none';
    });

    // Event listener for Channel tab
    channelTab.addEventListener('click', function() {
        checkInviteTab = false;
        document.getElementById('channeldiv').style.display = 'block'; 
        document.getElementById('invitediv').style.display = 'none';
    });

    // Event listener for mobile Channel tab
    document.getElementById('m-channel-tab').addEventListener('click', function() {
        checkInviteTab = false;
        document.getElementById('channeldiv').style.display = 'block'; 
        document.getElementById('invitediv').style.display = 'none';
    });

    // Handle channelDropdown change
    channelDropdown.addEventListener('change', function(event) {
        const channelId = event.target.value;
        if (channelId) {
            showChannelDetails(channelId);
            setTimeout(function(){listInvites();}, 1500); 
            

            // Check if the Invite tab is active (checkInviteTab is true)
            if (!checkInviteTab) {
                document.getElementById("assigndiv").style.display = 'block';
                document.getElementById("assignDriverBtn").setAttribute('data-channel-id', channelId);
            }
        }
    });
});



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
                option.text = `${channel.name}`;
                channelDropdown.appendChild(option);
            });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error fetching channels: ${error}`;
        });
}

function showChannelDetails(channelId) {
    fetch(`https://api.smartthings.com/v1/distchannels/${channelId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("channelDetails").value = JSON.stringify(data, null, 2);
            document.getElementById("updateChannelBtn").style.display = 'inline';
            document.getElementById("deleteChannelBtn").style.display = 'inline';
            document.getElementById("driverList").style.display = 'block';
            document.getElementById("createInviteBtn").style.display = 'inline';
            document.getElementById("listInviteBtn").style.display = 'inline';
            document.getElementById("updateChannelBtn").setAttribute('data-channel-id', channelId);
            document.getElementById("deleteChannelBtn").setAttribute('data-channel-id', channelId);
            document.getElementById("createInviteBtn").setAttribute('data-channel-id', channelId);
        })
        .catch(error => {
            document.getElementById("channelDetails").value = `Error fetching channel details: ${error}`;
        });
}

function updateChannel() {
    const channelId = document.getElementById("updateChannelBtn").getAttribute('data-channel-id');
    const channelDetails = document.getElementById("channelDetails").value;

    if (!isJsonString(channelDetails)) {
        document.getElementById("result").textContent = 'Invalid JSON payload';
        return;
    }

    fetch(`https://api.smartthings.com/v1/distchannels/${channelId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        },
        body: channelDetails
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error updating channel ${channelId}: ${error}`;
        });
}

function deleteChannel() {
    const channelId = document.getElementById("deleteChannelBtn").getAttribute('data-channel-id');
    fetch(`https://api.smartthings.com/v1/distchannels/${channelId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (response.ok) {
                document.getElementById("result").textContent = `Channel ${channelId} deleted successfully.`;
                listChannels();
            } else {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error deleting channel: ${error}`;
        });
}

function createChannel() {
    const name = document.getElementById("newChannelName").value;
    const description = document.getElementById("newChannelDescription").value;
    const termsOfServiceUrl = document.getElementById("newChannelTermsOfServiceUrl").value;

    if (!name || !description || !termsOfServiceUrl) {
        document.getElementById("result").textContent = 'Error: Name, description, and terms of service URL are required fields.';
        return;
    }

    const payload = {
        "name": name,
        "description": description,
        "type": "DRIVER",
        "termsOfServiceUrl": termsOfServiceUrl
    };

    fetch(`https://api.smartthings.com/v1/distchannels`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${patToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("result").textContent = JSON.stringify(data, null, 2);
            listChannels();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error creating channel: ${error}`;
        });
}

function listDrivers() {
    fetch(`https://api.smartthings.com/v1/drivers`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const driverList = document.getElementById("driverList");
            driverList.innerHTML = '<option value="">Select a driver</option>';
            data.items.forEach(driver => {
                const option = document.createElement("option");
                option.value = driver.driverId;
                option.text = `${driver.name} version: ${driver.version}`;
                option.setAttribute('data-version', driver.version);
                driverList.appendChild(option);
            });
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error fetching drivers: ${error}`;
        });
}

function assignDriverToChannel() {
    const channelId = document.getElementById("assignDriverBtn").getAttribute('data-channel-id');
    const driverList = document.getElementById("driverList");
    const selectedDriver = driverList.options[driverList.selectedIndex];
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

function listInvites() {
	document.getElementById('inviteList').style.display = 'block'; 
    const channelId = document.getElementById("updateChannelBtn").getAttribute('data-channel-id');
    const params = `resource=st1:developer::channel/${channelId}`
    const url = `https://api.smartthings.com/invites?${params}`
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const inviteList = document.getElementById("inviteList");
            inviteList.innerHTML = '';
            data.items.forEach(invite => {
                const div = document.createElement("div");
                div.className = "invite-item";
                div.textContent = `id: ${invite.id} AcceptUrl: ${invite.acceptUrl}`;
                div.onclick = () => showInviteDetails(invite.id);
                inviteList.appendChild(div);
            });
        })
        .catch(error => {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                document.getElementById('result').textContent = 'Fetch error: Failed to fetch. Possible CORS issue or network problem.';
            } else {
                document.getElementById('result').textContent = `Fetch error: ${error.message}`;
            }
        });
}

function showInviteDetails(inviteId) {
	document.getElementById('selectInviteTab').style.display = 'block';
    fetch(`https://api.smartthings.com/invites/${inviteId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            document.getElementById("deleteInviteBtn").style.display = 'inline';
            document.getElementById("deleteInviteBtn").setAttribute('data-invite-id', inviteId);
            return response.json();
        })
        .then(data => {
            document.getElementById("invitesDetails").value = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById("invitesDetails").value = `Error fetching invite details: ${error.message}`;
        });
}

function deleteInvite() {
    const inviteId = document.getElementById("deleteInviteBtn").getAttribute('data-invite-id');
    fetch(`https://api.smartthings.com/invites/${inviteId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => {
            document.getElementById("invitesDetails").value = "";
            if (response.status === 202) {
                document.getElementById("result").textContent = `Invite ${inviteId} deleted successfully.`;
                listInvites();
                return null;
            } else {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error deleting invite: ${error.message}`;
        });
}

function createInvite() {
    const channelId = document.getElementById("createInviteBtn").getAttribute('data-channel-id');
    const inviteName = document.getElementById("inviteName").value;
    const inviteDescription = document.getElementById("inviteDescription").value;
    const inviteOwner = document.getElementById("inviteOwner").value;
    const inviteTermsUrl = document.getElementById("inviteTermsUrl").value;

    if (!channelId || !inviteName || !inviteDescription || !inviteOwner || !inviteTermsUrl) {
        document.getElementById("result").textContent = 'Error: All fields (channelId, inviteName, inviteDescription, inviteOwner, inviteTermsUrl) are required.';
        return;
    }

    const payload = {
        "resource": {
            "root": {
                "service": "developer"
            },
            "components": [
                {
                    "id": channelId,
                    "kind": "channel"
                }
            ]
        },
        "profileId": "61a79569-e8fd-4a4d-9b9c-a4a55ccdd15e",
        "metadata": {
            "name": inviteName,
            "description": inviteDescription,
            "owner": inviteOwner,
            "termsUrl": inviteTermsUrl
        }
    };

    fetch(`https://api.smartthings.com/invites`, {
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
            listInvites();
            showInviteDetails(data.invitationId);
        })
        .catch(error => {
            document.getElementById("result").textContent = `Error creating invite: ${error.message}`;
        });
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}