            const patToken = localStorage.getItem('patData');
            function togglePasswordVisibility() {
                var passwordField = document.getElementById('patToken');
                var toggleCheckbox = document.getElementById('togglePassword');
                if (toggleCheckbox.checked) {
                    passwordField.type = 'text';
                } else {
                    passwordField.type = 'password';
                }
            }

            function saveData() {
                var patData = document.getElementById('patToken').value;
                localStorage.setItem('patData', patData);
                alert('Data saved!');
            }

            function loadData() {
                var patData = localStorage.getItem('patData');
                if (patData !== null) {
                    document.getElementById('patToken').value = patData;
                }
            }

            function clearData() {
                localStorage.removeItem('patData');
                document.getElementById('patToken').value = '';
                alert('Data cleared!');
            }

            function getPresentation() {
                const presentationId = document.getElementById("presentationId").value;
                const manufacturerName = document.getElementById("manufacturerName").value;
                const deviceId = document.getElementById("deviceId").value;

                let url = `https://api.smartthings.com/v1/presentation?`;
                if (presentationId) {
                    url += `&presentationId=${presentationId}`;
                }
                if (manufacturerName) {
                    url += `&manufacturerName=${manufacturerName}`;
                }
                if (deviceId) {
                    url += `&deviceId=${deviceId}`;
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
                    const resultTextarea = document.getElementById("result");
                    resultTextarea.style.display = 'block';
                    resultTextarea.value = jsonData;
                    resultTextarea.rows = Math.min(50, jsonData.split('\n').length);
                })
                .catch(error => {
                    const resultTextarea = document.getElementById("result");
                    resultTextarea.style.display = 'block';
                    resultTextarea.value = `Error: ${error}`;
                    resultTextarea.rows = Math.min(50, resultTextarea.value.split('\n').length);
                });
            }

            function listDevices() {
                fetch(`https://api.smartthings.com/v1/devices`, {
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
                        group.forEach(device => {
                            const option = document.createElement("option");
                            option.value = JSON.stringify(device);
                            option.text = `[${locationId}] ${device.label}`;
                            deviceList.appendChild(option);
                        });
                    });
                })
                .catch(error => {
                    document.getElementById("result").textContent = `Error fetching devices: ${error}`;
                });
            }

            function selectDevice() {
                const device = JSON.parse(document.getElementById("deviceList").value);
                document.getElementById("presentationId").value = device.presentationId || '';
                document.getElementById("manufacturerName").value = device.manufacturerName || '';
                document.getElementById("deviceId").value = device.deviceId;
                getPresentation();
            }

            window.onload = function () {
                listDevices();
            }