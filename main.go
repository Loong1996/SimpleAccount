package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

type SpendOne struct {
	name  string
	money int
}

type SpendOneDay struct {
	Time     int        `json:"time"`
	Detail   string     `json:"detail"`
	SpendLst []SpendOne `json:"-"`
	Total    int        `json:"total"`
}

var SpendDays map[int]*SpendOneDay

func (this *SpendOneDay) praseSpendDetail() error {
	str := []rune(this.Detail)
	var numStr []rune
	var keyStr []rune
	curSpend := SpendOne{}
	negative := true

	deadLoop := 0
	for i := 0; i < len(str); i++ {
		deadLoop++
		if deadLoop > 4096 {
			return fmt.Errorf("spend detail too long")
		}

		toNum := false
		v := str[i]
		if strings.ContainsRune("0123456789", v) {
			numStr = append(numStr, v)
			if len(keyStr) > 0 {
				curSpend.name = string(keyStr)
				// fmt.Printf("Key:%s\n", string(keyStr))
				keyStr = keyStr[:0]
			}
		} else {
			if strings.ContainsRune("+", v) {
				if len(numStr) > 0 {
					i--
					toNum = true
				} else {
					negative = false
				}
			} else {
				toNum = true
				keyStr = append(keyStr, v)
			}
		}

		if i == len(str)-1 {
			toNum = true
		}

		if toNum {
			str := string(numStr)
			if len(str) > 0 {
				money, err := strconv.Atoi(str)
				if err != nil {
					return err
				}

				if negative {
					//fmt.Printf("消费:-%d\n", money)
					curSpend.money = -money
					this.Total = this.Total - money
				} else {
					curSpend.money = money
					this.Total = this.Total + money
					//fmt.Printf("消费:+%d\n", money)
				}

				this.SpendLst = append(this.SpendLst, curSpend)
			}

			negative = true
			curSpend = SpendOne{}
			numStr = numStr[:0]
		}
	}

	return nil
}

func MainHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	file, _ := ioutil.ReadFile("simpleaccount.html")
	w.Write(file)
}

func QueryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	jsonData, _ := json.Marshal(SpendDays)
	fmt.Println(string(jsonData))

	w.Write(jsonData)

	// startDateStr := r.URL.Query().Get("startDate")
	// endDateStr := r.URL.Query().Get("endDate")

	// // Parse the date strings into time.Time objects
	// startDate, err := time.Parse("2006-01-02", startDateStr)
	// if err != nil {
	// http.Error(w, "Invalid start date format", http.StatusBadRequest)
	// return
	// }

	// endDate, err := time.Parse("2006-01-02", endDateStr)
	// if err != nil {
	// http.Error(w, "Invalid end date format", http.StatusBadRequest)
	// return
	// }

	// // Perform the query operation (this is just a placeholder)
	// result := fmt.Sprintf("Querying from %s to %s", startDate, endDate)

	// // Send the result back to the client
	// w.Write([]byte(result))
}

func main() {
	SpendDays = make(map[int]*SpendOneDay, 0)

	// TODO 数据加载与解析
	SpendDays[20240102] = &SpendOneDay{
		Time:   20240102,
		Detail: "朴朴123 零花钱+200",
	}
	SpendDays[20240103] = &SpendOneDay{
		Time:   20240103,
		Detail: "67788",
	}

	for _, v := range SpendDays {
		v.praseSpendDetail()
	}

	// 主页
	http.HandleFunc("/", MainHandler)
	// 数据查询
	http.HandleFunc("/api/query", QueryHandler)
	// 监听
	http.ListenAndServe(":8000", nil)
}
