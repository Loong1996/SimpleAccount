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

function querySpendDay(button) {
    // 请求数据之前先清空数据
    let table = document.querySelector('table');
    table.innerHTML = '';

    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    var url = `http://localhost:8000/api/query?startDate=${startDate}&endDate=${endDate}`
    fetch(url)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
            }

        return response.json();
        })
    .then(data => {
        SpendDays = {};
        // console.log(data)
        // 保存数据至字典
        praseJsonData(data)
        //console.log(SpendDays)

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

        const dateBeg = convertDateFormat(startDate)
        const dateEnd = convertDateFormat(endDate)
        let total = 0;
        for (let i = dateBeg; i <= dateEnd; i++) {

                // 创建行元素
                let row = document.createElement('tr');
                // 创建单元格并设置内容
                let dateCell = document.createElement('td');
                let totalCell = document.createElement('td');
                let detailCell = document.createElement('td');
                let button = document.createElement('button');

            if (SpendDays.hasOwnProperty(i)) {
                let entry = SpendDays[i];
                dateCell.textContent = i; // 格式化日期，注意时间戳转毫秒
                totalCell.textContent = entry.total; // 总结
                button.textContent = entry.detail;
                total += entry.total;
                // 存在数据
            } else {
                dateCell.textContent = i;
                // 不存在数据
            }

            // 注意：实际应用中应避免使用内联JavaScript，这里仅为示例
            button.setAttribute('onclick', 'showEditDetailModal(this)');
            // button.dataset.timestamp = i; // 将时间戳作为数据属性附加到按钮上
            detailCell.appendChild(button);
            // 将单元格添加到行中
            row.appendChild(dateCell);
            row.appendChild(totalCell);
            row.appendChild(detailCell);
            // 将行添加到表格中
            table.appendChild(row);
        }

        document.getElementById("totalAmount").innerText = total
        })
    .catch(error => console.error('There has been a problem with your fetch operation:', error));
};

/////////////////////////////////////////////////////////
// 模态对话框
/////////////////////////////////////////////////////////
var currentButton;
var modal = document.getElementById("editDetailModal");
function showEditDetailModal(button) {
    currentButton = button;
    modal.style.display = "block";
}

function editDone() {
    var txt = document.getElementById("editDetailInput").value;
    if (txt == "") {
        txt = "用户取消了输入。";
    }
    currentButton.innerHTML = txt;
    modal.style.display = "none";
}

function editCancel() {
    modal.style.display = "none";
}