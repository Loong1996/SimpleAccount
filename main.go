package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type SpendOne struct {
	name  string
	money float64
}

type SpendOneDay struct {
	Time     int        `json:"time"`
	Detail   string     `json:"detail"`
	SpendLst []SpendOne `json:"-"`
	Total    float64    `json:"total"`
}

var SpendDays map[int]*SpendOneDay

func (this *SpendOneDay) praseSpendDetail() error {
	this.SpendLst = nil
	this.Total = 0

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
		if strings.ContainsRune("0123456789.", v) {
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
				money, err := strconv.ParseFloat(str, 64)
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
	// 暂时不错优化，直接全量返回
	w.Header().Set("Content-Type", "application/json")
	jsonData, _ := json.Marshal(SpendDays)
	// fmt.Println(string(jsonData))
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

func QueryPropertyHandler(w http.ResponseWriter, r *http.Request) {
	var total float64
	for _, v := range SpendDays {
		total += v.Total
	}

	w.Write([]byte(fmt.Sprintf("%.02f", total)))
}

func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	t, err := strconv.Atoi(r.URL.Query().Get("time"))
	if err != nil {
		http.Error(w, "Invalid Time", http.StatusBadRequest)
		return
	}

	oneday := &SpendOneDay{
		Time:   t,
		Detail: r.URL.Query().Get("detail"),
	}

	err = oneday.praseSpendDetail()
	if err == nil {
		jsonData, err := json.Marshal(oneday)
		if err != nil {
			http.Error(w, "Json Marshal Fail", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonData)

		// 保存至文件
		SpendDays[t] = oneday
		jsonData, err = json.MarshalIndent(SpendDays, "", "    ")
		if err != nil {
			log.Fatal("marshal json file failed")
		}

		if ioutil.WriteFile("spend_days.json", jsonData, 0644) != nil {
			log.Fatal("write json file failed")
		}

		// 备份
		os.Mkdir("bck", 0755)
		currentTime := time.Now()
		dateString := currentTime.Format("2006-01-02")
		fileName := fmt.Sprintf("bck/spend_days_%s.json", dateString)
		if ioutil.WriteFile(fileName, jsonData, 0644) != nil {
			log.Fatal("write json bck file failed")
		}
	} else {
		http.Error(w, "Invalid Detail", http.StatusBadRequest)
	}
}

func loadSpendDays() (map[int]*SpendOneDay, error) {
	// 从文件中读取JSON数据
	jsonData, err := ioutil.ReadFile("spend_days.json")
	if err != nil {
		return nil, err
	}

	// 初始化一个用于反序列化的映射
	var temp map[int]*SpendOneDay
	// 反序列化JSON数据到映射
	err = json.Unmarshal(jsonData, &temp)
	if err != nil {
		return nil, err
	}

	for _, v := range temp {
		err = v.praseSpendDetail()
		if err != nil {
			return nil, err
		}
		// fmt.Println(v)
	}

	return temp, nil
}

// /////////////////////////////
// 配置
// /////////////////////////////
type Config struct {
	Port int `json:"port"`
}

var config Config

func main() {
	var err error
	SpendDays, err = loadSpendDays()
	if err != nil {
		panic(err)
	}

	// 读取配置文件
	configData, err := ioutil.ReadFile("config.json")
	if err != nil {
		panic(err)
	}

	if err := json.Unmarshal(configData, &config); err != nil {
		panic(err)
	}

	// Http
	fs := http.FileServer(http.Dir("./static"))
	// 静态
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// 检查请求的URL路径是否以.css结尾
		if r.URL.Path[len(r.URL.Path)-4:] == ".css" {
			// 直接使用FileServer处理CSS请求
			fs.ServeHTTP(w, r)
		} else if r.URL.Path[len(r.URL.Path)-5:] == ".html" {
			// 直接使用FileServer处理HTML请求
			fs.ServeHTTP(w, r)
		} else if r.URL.Path[len(r.URL.Path)-3:] == ".js" {
			fs.ServeHTTP(w, r)
		} else {
			// 如果请求的不是.css或.html文件，返回404错误
			http.NotFound(w, r)
		}
	})

	// 数据查询
	http.HandleFunc("/api/query", QueryHandler)
	http.HandleFunc("/api/query_property", QueryPropertyHandler)
	http.HandleFunc("/api/update", UpdateHandler)
	// 监听
	http.ListenAndServe(fmt.Sprintf(":%d", config.Port), nil)
}
