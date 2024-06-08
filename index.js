let fileupload = $("#file");
let data = [];
let fields = [];
let searchableFields = {};
fileupload.on('change', function () {
    let reader = new FileReader();
    reader.addEventListener("load", () => handleFile(), false);
    reader.readAsText(this.files[0]);
    function handleFile() {
        let result = reader.result;
        let splitted = result.split("\r\n");
        fields = splitted[0].trim().split(",");
        data = [];
        for (let i = 1; i < splitted.length; i++) {
            let row = splitted[i].trim().split(",");
            if (!row || row.length === 0) {
                continue;
            }
            let obj = {};
            for (let j = 0; j < row.length; j++) {
                let value = row[j].trim().replace(/\"/g, "");
                if (!value) {
                    continue;
                }
                obj[fields[j]] = value;
            }
            data.push(obj);
        }
        //console.table(data);
        generateTableHeaders();
    }
});

function generateTableHeaders() {
    let tableHeader = $("#searchTableHead");
    tableHeader.empty();
    let dom = tableHeader[0];
    let tableHeaderRow = dom.insertRow();
    for (let z = 0; z < fields.length; z++) {
        let cell = tableHeaderRow.insertCell(z);
        cell.innerHTML = fields[z];
    }
    generateSearchableFieldsCheckboxes();
}

function generateSearchableFieldsCheckboxes() {
    searchableFields = {};
    let em = $("#searchableFields");
    for (let z = 0; z < fields.length; z++) {
        let key = fields[z];
        em.append(`
        <input class="form-check-input m-1" type="checkbox" id="field_${key}" name="field_${key}" value="${key}" checked onclick="onSearchableFieldsClick(this)">
        <label class="form-check-label" for="field_${key}">${key}</label>
        `);
        searchableFields[key] = true;
    }
}

function onSearchableFieldsClick(event) {
    let dom = $(`[id='${event.id}']`)[0];
    searchableFields[dom.value] = dom.checked;
}

function onHighlightCheckboxChange() {
    onFuzzySearch($("#fuzzySearch").val());
}

function highlightMatches(field, text, matches) {
    let highlightData = matches.find(e => e.key === field);
    if (!highlightData || !highlightData.indices) {
        return text;
    }

    //merge indices
    highlightData.indices.sort((a, b) => (a[0] - b[0]) && (a[1] - b[1]));
    for (let i = 0; i < highlightData.indices.length; i++) {
        let index = highlightData.indices[i];
        let from = index[0];
        let to = index[1];
        if (from === -1 && to === -1) {
            continue;
        }
        for (let j = 0; j < highlightData.indices.length; j++) {
            let otherIndex = highlightData.indices[j];
            if (index === otherIndex) {
                continue;
            }

            let otherFrom = otherIndex[0];
            let otherTo = otherIndex[1];
            if (otherFrom === -1 && otherTo === -1) {
                continue;
            }

            if (otherFrom >= from && otherFrom <= to &&
                to >= otherFrom && to <= otherTo) {
                to = otherTo;
                index[1] = otherTo;
                otherIndex[0] = -1;
                otherIndex[1] = -1;
            }
        }

    }

    let highlightedText = "";
    let lastIndex = 0;

    highlightData.indices
        .filter(w => w[0] !== -1 && w[1] !== -1)
        .forEach(index => {
            highlightedText += text.substring(lastIndex, index[0]);
            highlightedText += "<zwj>" + text.substring(index[0], index[1] + 1) + "</zwj>";
            lastIndex = index[1] + 1;
        });

    highlightedText += text.substring(lastIndex);

    return highlightedText;
}

function generateTableBody(searchedData) {
    //console.log(searchedData)
    let tableBody = $("#searchTableBody");
    tableBody.empty();
    let dom = tableBody[0];
    for (let i = 0; i < searchedData.length; i++) {
        let data = { ...searchedData[i] };
        // if (data.item["id_product_fulltype"] !== "8547") {
        //     continue
        // }
        let row = dom.insertRow();
        for (let z = 0; z < fields.length; z++) {
            let field = fields[z];
            let cell = row.insertCell(z);
            let txt = $("#highlightSearch").is(":checked") ? highlightMatches(field, data.item[field], data.matches) : data.item[field];
            cell.innerHTML = txt;
        }
    }
}

let fuzzySearch = $("#fuzzySearch");
fuzzySearch.on("input", e => onFuzzySearch(e.currentTarget.value));
let fuzzySearchTimeout;
function onFuzzySearch(searchValue) {
    if (fuzzySearchTimeout) {
        clearTimeout(fuzzySearchTimeout);
    }
    fuzzySearchTimeout = setTimeout(() => {
        let keys = [];
        Object.keys(searchableFields).forEach(e => {
            if (searchableFields[e]) {
                keys.push(e);
            }
        });
        const fuse = new Fuse(data, {
            keys: keys,
            useExtendedSearch: true,
            ignoreLocation: false,
            threshold: 0.25,
            distance: 400,
            includeMatches: true,
            includeScore: false,
            minMatchCharLength: 3
        });
        generateTableBody(fuse.search(searchValue, { limit: 500 }));
    }, 500);

}