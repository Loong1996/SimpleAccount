/////////////////////////////////////////////////////////
// 日期自动选择为当前月份的月初至月底
/////////////////////////////////////////////////////////
var startDateInput = document.getElementById('startDate');
var endDateInput = document.getElementById('endDate');
var currentDate = new Date();
var currentMonthUTC = currentDate.getUTCMonth();
var currentYearUTC = currentDate.getUTCFullYear();
var startDayOfCurrentMonthUTC = new Date(Date.UTC(currentYearUTC, currentMonthUTC, 1));
var lastDayOfCurrentMonthUTC = new Date(Date.UTC(currentYearUTC, currentMonthUTC + 1, 0));
startDateInput.value = startDayOfCurrentMonthUTC.toISOString().split('T')[0];
endDateInput.value = lastDayOfCurrentMonthUTC.toISOString().split('T')[0];

/////////////////////////////////////////////////////////
// 请求消费数据及渲染处理
/////////////////////////////////////////////////////////
var SpendDays = {}

function getCurrentBaseUrl() {
    var protocol = window.location.protocol;
    var hostname = window.location.hostname;
    var port = window.location.port; // 端口号
    var baseUrl = protocol + "//" + hostname;
    // 如果有端口号，将其添加到基础URL中
    if (port) {
        baseUrl += ":" + port;
    }

    return baseUrl;
}

function convertDateFormat(isoDateString) {
    // 使用Date对象解析ISO日期字符串
    const date = new Date(isoDateString);
    // 获取年、月、日，并将其转换为两位数的字符串
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    // 组合成新的日期格式
    const newFormat = `${year}${month}${day}`;
    return newFormat;
}

function praseJsonData(data) {
    for (let timestamp in data) {
        if (data.hasOwnProperty(timestamp)) {
            let entry = data[timestamp];
            SpendDays[timestamp] = {
                time: entry.time,
                detail: entry.detail,
                total: entry.total
            };
        }
    }
}

function refreshSpendDayTable() {
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    const dateBeg = convertDateFormat(startDate)
    const dateEnd = convertDateFormat(endDate)
    // 选择表格元素
    let table = document.querySelector('table');
    // 在添加新数据之前清空表格内容
    table.innerHTML = '';
    // 创建行元素
    let headRow = document.createElement('tr');
    // 创建单元格并设置内容
    let headDate = document.createElement('th');
    headDate.textContent = "日期";
    let headTotal = document.createElement('th');
    headTotal.textContent = "当日消费";
    let headDetail = document.createElement('th');
    headDetail.textContent = "详情";
    headRow.appendChild(headDate);
    headRow.appendChild(headTotal);
    headRow.appendChild(headDetail);
    table.appendChild(headRow);
    for (let i = dateBeg; i <= dateEnd; i++) {
        // 创建行元素
        let row = document.createElement('tr');
        // 创建单元格并设置内容
        let dateCell = document.createElement('td');
        let totalCell = document.createElement('td');
        totalCell.setAttribute('id', `tableTotal${i}`);
        let detailCell = document.createElement('td');
        let button = document.createElement('button');

        var dateStr = i.toString(); // 将数字转换为字符串
        var formattedDateStr = dateStr.substring(0, 4) + "-" + dateStr.substring(4, 6) + "-" + dateStr.substring(6, 8);
        dateCell.textContent = formattedDateStr; 
        if (SpendDays.hasOwnProperty(i)) {
            let entry = SpendDays[i];
            totalCell.textContent = entry.total.toFixed(2); // 总结
            if (entry.total >= 0) {
                totalCell.style.color = "green";
            } else {
                totalCell.style.color = "red";
            }

            button.textContent = entry.detail;
        }

        // 注意：实际应用中应避免使用内联JavaScript，这里仅为示例
        button.setAttribute('onclick', 'showEditDetailModal(this)');
        button.setAttribute('id', `tableBtn${i}`);
        // button.dataset.timestamp = i; // 将时间戳作为数据属性附加到按钮上
        detailCell.appendChild(button);
        // 将单元格添加到行中
        row.appendChild(dateCell);
        row.appendChild(totalCell);
        row.appendChild(detailCell);
        // 将行添加到表格中
        table.appendChild(row);
    }
}

function refreshTotalAmount() {
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    const dateBeg = convertDateFormat(startDate)
    const dateEnd = convertDateFormat(endDate)
    let total = 0;
    for (let i = dateBeg; i <= dateEnd; i++) {
        if (SpendDays.hasOwnProperty(i)) {
            let entry = SpendDays[i];
            total += entry.total;
        }
    }

    var cell = document.getElementById("totalAmount");
    cell.innerText = total.toFixed(2);
    if (total >= 0) {
        cell.style.color = "green";
    } else {
        cell.style.color = "red";
    }
}

function querySpendDay() {
    // 请求数据之前先清空数据
    let table = document.querySelector('table');
    table.innerHTML = '';
    document.getElementById("totalAmount").innerText = 0;

    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    var url = `${getCurrentBaseUrl()}/api/query?startDate=${startDate}&endDate=${endDate}`
    fetch(url)
    .then(response => {
            if (!response.ok) {
                window.alert("querySpendDay出现错误");
                throw new Error('Network response was not ok ' + response.statusText);
            }

            return response.json();
        })
    .then(data => {
        SpendDays = {};
        // console.log(data)
        // 保存数据至字典
        praseJsonData(data);
        //console.log(SpendDays)
        refreshSpendDayTable();
        refreshTotalAmount();
    })
    .catch(error => {window.alert("querySpendDay出现错误"); console.error('There has been a problem with your fetch operation:', error); });
};

querySpendDay();

/////////////////////////////////////////////////////////
// 实时资产
/////////////////////////////////////////////////////////
function queryProperty() {
    var url = `${getCurrentBaseUrl()}/api/query_property`
    fetch(url)
    .then(response => {
            if (!response.ok) {
                window.alert("queryProperty出现错误");
                throw new Error('Network response was not ok ' + response.statusText);
            }

            return response.text();
        })
    .then(data => {
        console.log(data);
        var elem = document.getElementById("propertyAmount")
        elem.textContent = data;
        if (parseFloat(data) >= 0) {
            elem.style.color = "green";
        } else {
            elem.style.color = "red";
        }
    })
    .catch(error => { window.alert("queryProperty出现错误"); console.error('There has been a problem with your fetch operation:', error); });
}

queryProperty();

/////////////////////////////////////////////////////////
// 模态对话框
/////////////////////////////////////////////////////////
var currentButton;
var modal = document.getElementById("editDetailModal");
function showEditDetailModal(button) {
    currentButton = button;
    document.getElementById("editDetailInput").value = button.textContent;
    modal.style.display = "block";
}

function editDone() {
    var txt = document.getElementById("editDetailInput").value;
    var encodedValue = encodeURIComponent(txt);
    const specificDigits = currentButton.id.match(/^(\w+)(\d{8})$/);
    var time = specificDigits[2];
    // 更改数据请求
    var url = `${getCurrentBaseUrl()}/api/update?time=${time}&detail=${encodedValue}`
    fetch(url)
    .then(response => {
            if (!response.ok) {
                window.alert("editDone出现错误");
                throw new Error('Network response was not ok ' + response.statusText);
            }

            return response.json();
        })
    .then(data => {
        if (!data.hasOwnProperty("time")) {

        } else {
            SpendDays[data.time] = {
                time: data.time,
                detail: data.detail,
                total: data.total
            };

            currentButton.textContent = data.detail;
            var totalCell = document.getElementById(`tableTotal${data.time}`);
            totalCell.textContent = data.total.toFixed(2);
            if (data.total >= 0) {
                totalCell.style.color = "green";
            } else {
                totalCell.style.color = "red";
            }
        }

        refreshTotalAmount();
    })
    .catch(error => { window.alert("editDone出现错误"); console.error('There has been a problem with your fetch operation:', error); });

    queryProperty();
    modal.style.display = "none";
}

function editCancel() {
    currentButton = null
    document.getElementById("editDetailInput").textContent = "";
    modal.style.display = "none";
}