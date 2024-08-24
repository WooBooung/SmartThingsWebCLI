function saveData() {
    const patData = document.getElementById('patTokenpop').value;
    localStorage.setItem('patData', patData);
    alert('Data saved!');
}

function loadPatData() {
	const patData = localStorage.getItem('patData');
	document.getElementById('patTokenpop').value = patData;
}

function clearData() {
    localStorage.removeItem('patData');
    document.getElementById('patTokenpop').value = '';
    alert('Data cleared!');
}



// loadHTML 함수를 Promise로 변경
function loadHTML(elementId, url) {
    return fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
        });
}

// async 함수로 모든 HTML 로드 후 다른 JS 실행
async function initializePage() {
	


    // 모든 HTML 파일을 로드할 때까지 기다림
    await Promise.all([
        loadHTML('header', '../header.html'),
        loadHTML('sidebar', '../sidebar.html')
    ]);

    function updateUI() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (window.innerWidth <= 768) {
                sidebar.style.left = '-250px'; 
            } else {
                sidebar.style.left = '0'; 
            }
        }
    }

    updateUI();
    window.addEventListener('resize', updateUI);

    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');

		/* 터치시 메뉴 접힘 */
		document.addEventListener('click', function(event) {
		    const sidebar = document.querySelector('.sidebar');
		    const hamburger = document.querySelector('.hamburger');
		    
		    if (window.innerWidth <= 852) {
			    if (sidebar && !sidebar.contains(event.target) && !hamburger.contains(event.target)) {
			        sidebar.style.left = '-250px';  // 메뉴를 닫음
			    }
		    }
		});
		
		// 햄버거 버튼 클릭 시 메뉴 토글 코드 수정
		if (hamburger && sidebar) {
		    hamburger.addEventListener('click', function (event) {
		        event.stopPropagation(); // 이벤트 버블링을 막아줌
		        if (sidebar.style.left === '0px') {
		            sidebar.style.left = '-250px';
		        } else {
		            sidebar.style.left = '0';
		        }
		    });
		}

    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('mouseover', function () {
            const submenu = item.nextElementSibling;
            if (submenu) {
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                item.classList.add('active');
            }
        });

        item.addEventListener('click', function () {
            const submenu = item.nextElementSibling;
            if (submenu.style.maxHeight && submenu.style.maxHeight !== '0px') {
                submenu.style.maxHeight = '0';
                item.classList.remove('active');
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                item.classList.add('active');
            }
        });
    });

    // Setting 메뉴 클릭 시 처리
    const settingMenu = document.getElementById('settingMenu');
    if (settingMenu) {
        settingMenu.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                sidebar.style.left = '-250px'; // 사이드바 숨기기
            }
            showLayerPopup(); 
            loadPatData(); 
        });
    }

    // 레이어 팝업이 이미 열려있으면 다시 열지 않도록 하기 위한 플래그
    let isPopupOpen = false;

    // 레이어 팝업 생성 및 표시 함수
    function showLayerPopup() {
        if (isPopupOpen) return; // 팝업이 이미 열려있다면 함수 종료

        isPopupOpen = true; // 팝업이 열렸음을 표시

        const layerPopup = document.createElement('div');
        layerPopup.id = 'layerPopup';
        layerPopup.style.position = 'fixed';
        layerPopup.style.top = '50%';
        layerPopup.style.left = '50%';
        layerPopup.style.transform = 'translate(-50%, -50%)';
        layerPopup.style.backgroundColor = '#fff';
        layerPopup.style.padding = '20px';
        layerPopup.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        layerPopup.style.zIndex = '1001';
		layerPopup.style.width = '96%';
		layerPopup.style.maxWidth = '455px';

        layerPopup.style.display = 'none';
        layerPopup.style.opacity = '0';
        layerPopup.style.transition = 'opacity 0.5s';
    
        // 팝업 내부 HTML 구성
        const popupContent = `
            <h3>Settings</h3>
            <a href="https://account.smartthings.com/tokens" target="_blank" class="btn btn-link">Create PAT</a>
            <div class="form-group">
                <label for="patTokenpop">PAT Token:</label>
                <div class="btn-group" style="display: flex; gap: 10px; justify-content: center;">
	                <input type="password" class="form-control" id="patTokenpop" name="patToken" required>
	                        <div class="input-group-text">
	                            <input type="checkbox" id="togglePassword"> Show
	                        </div>
	                    
	             </div>
            </div>
            <div class="btn-group" style="display: flex; gap: 10px; justify-content: center;">
                <button id="saveTokenButton" class="btn btn-primary" style="background-color: #28a745; border-radius: 12px; border: none;">Save</button>
                <button id="loadTokenButton" class="btn btn-secondary" style="background-color: #007bff;  border-radius: 12px; border: none;">Load</button>
                <button id="clearTokenButton" class="btn btn-danger" style="background-color: #fd7e14;  border-radius: 12px; border: none;">Clear</button>
                <button id="closePopupButton" class="btn btn-secondary" style="background-color: #6c757d; border-radius: 12px; border: none;">Close</button>
            </div>
        `;
        layerPopup.innerHTML = popupContent;
        document.body.appendChild(layerPopup);
    
        // 팝업을 보여주는 애니메이션
        setTimeout(() => {
            layerPopup.style.display = 'block';
            layerPopup.style.opacity = '1';
        }, 10);
    
        // Save 버튼 클릭 시 토큰 저장
        document.getElementById('saveTokenButton').addEventListener('click', function () {
            saveData();
            location.reload();
        });
    
        // Load 버튼 클릭 시 토큰 불러오기
        document.getElementById('loadTokenButton').addEventListener('click', function () {
            loadPatData();
        });
    
        // Clear 버튼 클릭 시 토큰 삭제
        document.getElementById('clearTokenButton').addEventListener('click', function () {
            clearData(); 
        });
    
        // Close 버튼 클릭 시 팝업 닫기
        document.getElementById('closePopupButton').addEventListener('click', function () {
            layerPopup.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(layerPopup);
                isPopupOpen = false; // 팝업이 닫히면 플래그를 다시 false로 설정
            }, 500);
        });
        
        //toggle pw
        document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);

    }
    
    
	function togglePasswordVisibility() {
		console.log("Hello, World!");
	    const passwordField = document.getElementById('patTokenpop');
	    const toggleCheckbox = document.getElementById('togglePassword');
	    passwordField.type = toggleCheckbox.checked ? 'text' : 'password';
	}
	
	

}

// 페이지 초기화를 위해 initializePage 호출
initializePage();