const capaType = document.getElementById('capa_type');
const attrIdContainer = document.getElementById('attr_id_container');
const optionsContainer = document.getElementById('options_container');
const stringOptions = document.getElementById('string_options');
const numberOptions = document.getElementById('number_options');
const generateBtn = document.getElementById('generate_btn');
const resultFormatContainer = document.getElementById('result_format_container');
const result = document.getElementById('result');

capaType.addEventListener('change', function() {
    const selectedType = capaType.value;

    // 초기화: 모든 옵션 숨기기
    attrIdContainer.classList.add('hidden');
    optionsContainer.classList.add('hidden');
    stringOptions.classList.add('hidden');
    numberOptions.classList.add('hidden');
    generateBtn.classList.add('hidden');
    resultFormatContainer.classList.add('hidden');
    result.classList.add('hidden');

    if (selectedType === 'select') {
        return; // 기본값이면 아무것도 하지 않음
    }

    // 공통 요소 보이기
    attrIdContainer.classList.remove('hidden');
    optionsContainer.classList.remove('hidden');
    generateBtn.classList.remove('hidden');
    resultFormatContainer.classList.remove('hidden');
    result.classList.remove('hidden');

    // 타입별 옵션 표시
    if (selectedType === 'string') {
        stringOptions.classList.remove('hidden');
    } else if (selectedType === 'integer' || selectedType === 'number') {
        numberOptions.classList.remove('hidden');
    }
});

// 체크박스에 따라 추가 입력 요소 표시/숨김
document.getElementById('maxLength_option').addEventListener('change', function() {
    const maxLengthInput = document.getElementById('maxLength_value');
    if (this.checked) {
        maxLengthInput.classList.remove('hidden');
    } else {
        maxLengthInput.classList.add('hidden');
    }
});

document.getElementById('minimum_option').addEventListener('change', function() {
    const minimumInput = document.getElementById('minimum_value');
    if (this.checked) {
        minimumInput.classList.remove('hidden');
    } else {
        minimumInput.classList.add('hidden');
    }
});

document.getElementById('maximum_option').addEventListener('change', function() {
    const maximumInput = document.getElementById('maximum_value');
    if (this.checked) {
        maximumInput.classList.remove('hidden');
    } else {
        maximumInput.classList.add('hidden');
    }
});

document.getElementById('unit_option').addEventListener('change', function() {
    const unitInput = document.getElementById('unit_value');
    if (this.checked) {
        unitInput.classList.remove('hidden');
    } else {
        unitInput.classList.add('hidden');
    }
});

// Generate Button
generateBtn.addEventListener('click', function() {
    const capaName = document.getElementById('capa_name').value;
    const capaNameRegex = /^[a-zA-Z][a-zA-Z0-9]{0,35}$/; 
    const containsHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
    
    if (!capaName) {
        result.textContent = 'Capability 이름을 입력하세요';
        return;
    }
    if (containsHangul.test(capaName)) {
        result.textContent = '한글을 사용할 수 없습니다. 영문자만 입력하세요.';
        return; 
    }
    if (/^[0-9]/.test(capaName)) {
        result.textContent = 'Capability 이름은 영문자로 시작해야 합니다.';
        return; 
    }
    if (!capaNameRegex.test(capaName)) {
        result.textContent = 'Capability 이름은 1~36자의 영문 소문자 또는 대문자로 시작하는 단어로 입력하세요.';
        return; 
    }
    if (capaName.length > 36){
        result.textContent = 'Capability 이름은 36자를 넘을 수 없습니다.';
        return; 
    }
    
    const capaAttrName = document.getElementById('capa_attr_name').value;
    
    const capaAttrNameRegex = /^[a-z]*([A-Z][a-z]*)*$/;
    if (capaAttrName.length > 36) {
        result.textContent = 'Attribute 이름은 최대 36자까지 허용됩니다.';
        return;
    }

    if (!capaAttrNameRegex.test(capaAttrName)) {
        result.textContent = 'Attribute 이름은 소문자로 시작하고 영어만 가능합니다';
        return; // 유효하지 않을 경우 함수 종료
    }
    
    const selectedType = capaType.value;
    const format = document.getElementById('result_format').value;

    const formattedAttrName = capaAttrName.charAt(0).toUpperCase() + capaAttrName.slice(1);
    const setterName = `set${formattedAttrName}`;

    let resultData = {
        name: capaName,
        ephemeral: false,
        attributes: {
            [capaAttrName]: {
                schema: {
                    type: "object",
                    properties: {
                        value: {
                            type: selectedType
                        }
                    },
                    additionalProperties: false,
                    required: ["value"]
                },
                setter: setterName,
                enumCommands: []
            }
        },
        commands: {
            [setterName]: {
                name: setterName,
                arguments: [
                    {
                        name: "value",
                        optional: false,
                        schema: {
                            type: selectedType
                        }
                    }
                ]
            }
        }
    };

    if (selectedType === 'string' && document.getElementById('maxLength_option').checked) {
        const maxLength = parseInt(document.getElementById('maxLength_value').value, 10);
        resultData.attributes[capaAttrName].schema.properties.value.maxLength = maxLength;
        resultData.commands[setterName].arguments[0].schema.maxLength = maxLength;
    }

    if ((selectedType === 'integer' || selectedType === 'number')) {
        if (document.getElementById('minimum_option').checked) {
            const minimum = parseInt(document.getElementById('minimum_value').value, 10);
            resultData.attributes[capaAttrName].schema.properties.value.minimum = minimum;
            resultData.commands[setterName].arguments[0].schema.minimum = minimum;
        }

        if (document.getElementById('maximum_option').checked) {
            const maximum = parseInt(document.getElementById('maximum_value').value, 10);
            resultData.attributes[capaAttrName].schema.properties.value.maximum = maximum;
            resultData.commands[setterName].arguments[0].schema.maximum = maximum;
        }

        if (document.getElementById('unit_option').checked) {
            const unit = document.getElementById('unit_value').value;
            resultData.attributes[capaAttrName].schema.properties.unit = {
                type: "string",
                enum: [unit],
                default: unit
            };
        }
    }

    if (format === 'json') {
        result.textContent = JSON.stringify(resultData, null, 2);
    } else if (format === 'yaml') {
        result.textContent = jsyaml.dump(resultData);
    }
});
