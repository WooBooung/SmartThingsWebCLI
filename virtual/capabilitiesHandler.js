const selectedCapabilities = [];


async function loadCapabilities() {
    try {
        const response = await fetch('https://api.smartthings.com/v1/capabilities', {
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
        const capabilitiesDiv = document.getElementById('capabilities');
        capabilitiesDiv.innerHTML = '';

        const sortedCapabilities = data.items.sort((a, b) => a.id.localeCompare(b.id));
        sortedCapabilities.forEach(capability => {
            const label = document.createElement('label');
            label.textContent = capability.id;
            label.className = 'capability-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = capability.id;
            checkbox.addEventListener('change', updateCustomCapabilities);
            label.prepend(checkbox);
            capabilitiesDiv.appendChild(label);
        });
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading capabilities: ' + error.message;
    }
}

async function listCapabilities() {
    if (!patToken) return;
    try {
        const response = await fetch('https://api.smartthings.com/v1/capabilities/namespaces', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${patToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const namespaces = data.filter(item => item.ownerType === "organization").map(item => item.name);
        const namespacePromises = namespaces.map(namespace =>
            fetch(`https://api.smartthings.com/v1/capabilities/namespaces/${namespace}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${patToken}`
                }
            }).then(response => response.json())
        );

        const results = await Promise.all(namespacePromises);
        const customCapabilitiesDiv = document.getElementById('customCapabilityList');
        customCapabilitiesDiv.innerHTML = '';

        results.forEach(namespaceData => {
            if (namespaceData && namespaceData.items) {
                namespaceData.items.forEach(capability => {
                    const label = document.createElement('label');
                    label.textContent = capability.id;
                    label.className = 'capability-item';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = capability.id;
                    checkbox.addEventListener('change', updateCustomCapabilities);
                    label.prepend(checkbox);
                    customCapabilitiesDiv.appendChild(label);
                });
            }
        });
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading custom capabilities: ' + error.message;
    }
}

function updateCustomCapabilities(event) {
    const capability = event.target.value;
    if (event.target.checked) {
        selectedCapabilities.push(capability);
    } else {
        const index = selectedCapabilities.indexOf(capability);
        if (index > -1) {
            selectedCapabilities.splice(index, 1);
        }
    }
    document.getElementById('customCapabilities').value = selectedCapabilities.join('\n');
}

function uncheckAll() {
    const checkboxes = document.querySelectorAll('#capabilities input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedCapabilities.length = 0;
    document.getElementById('customCapabilities').value = '';
}




/* update Search */
document.addEventListener("DOMContentLoaded", function() {
    // Populate capabilities initially
    createdeviceCategory(); // Assuming this is a function to load the categories
    
    // Attach event listener to search button

  
});

function filterCapabilities() {
    const searchText = document.getElementById('capabilitySearch').value.toLowerCase(); // Get the search text
    const capabilities = document.querySelectorAll('.capability-item'); // Get all capability items

    capabilities.forEach(capability => {
        const capabilityText = capability.textContent.toLowerCase(); // Get the text content of each capability
        // Show or hide the capability based on whether it matches the search text
        if (capabilityText.includes(searchText)) {
            capability.style.display = ''; // Show matching items
        } else {
            capability.style.display = 'none'; // Hide non-matching items
        }
    });
}

function showAllCapabilities() {
    const capabilities = document.querySelectorAll('.capability-item'); // Get all capability items
    
    capabilities.forEach(capability => {
        capability.style.display = ''; 
    });
}


document.getElementById('uncheckAllButton').addEventListener('click', uncheckAll); //uncheck Event 
document.getElementById('searchButton').addEventListener('click', filterCapabilities);
document.getElementById('searchCancelButton').addEventListener('click', showAllCapabilities);

