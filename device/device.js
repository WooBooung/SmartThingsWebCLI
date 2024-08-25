const patToken = localStorage.getItem('patData');

function getDevice() {
	const deviceId = document.getElementById("deviceId").value;

	let url = `https://api.smartthings.com/v1/devices?`;

	if (deviceId) {
		url += `deviceId=${deviceId}`;
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
		let jsonData;
		if (data.items && data.items.length > 0) {
			// items 배열의 첫 번째 항목만 가져옴
			jsonData = JSON.stringify(data.items[0], null, 2);
		} else {
			// items 배열이 없거나 빈 경우
			jsonData = JSON.stringify({ message: "No items found" }, null, 2);
		}

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

function fetchCurrentStatus() {
	const deviceId = document.getElementById("deviceId").value;

    fetch(`https://api.smartthings.com/v1/devices/${deviceId}/status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${patToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
			const currentStatus = document.getElementById("currentStatus");
			currentStatus.style.display = 'block';
			let jsonData = JSON.stringify(data, null, 2);
            currentStatus.textContent = jsonData;
			currentStatus.rows = Math.min(50, jsonData.split('\n').length);
        })
        .catch(error => {
			const currentStatus = document.getElementById("currentStatus");
			currentStatus.style.display = 'block';
            currentStatus.textContent = `Error fetching current status: ${error}`;
			currentStatus.rows = Math.min(50, currentStatus.textContent.split('\n').length);
        });
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
			return fetch(`https://api.smartthings.com/v1/devices`, {
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
							option.value = JSON.stringify(device);
							option.text = `[${locationName}] ${device.label}`;
							deviceList.appendChild(option);
						});
					});
					selectDevice();
				});
		})
		.catch(error => {
			document.getElementById("result").textContent = `Error fetching devices: ${error}`;
		});
  }
}

function selectDevice() {
	const device = JSON.parse(document.getElementById("deviceList").value);
	document.getElementById("deviceId").value = device.deviceId;
	getDevice();
	fetchCurrentStatus();
}

window.onload = function () {
	listDevices();
}